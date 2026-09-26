import http from 'http';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import express from 'express';
import cors from 'cors';
import { WebSocketServer, WebSocket } from 'ws';
import { RoomManager } from './rooms/RoomManager';
import { GameRoom } from './rooms/GameRoom';
import { loadEnv } from './utils/env';
import { TelegramBot } from './bot/TelegramBot';
import { verifyTelegramInitData } from './auth/telegramAuth';
import { UserStore, StoredUser } from './store/UserStore';
import { OnlineUserInfo, TableInvitation, UserProfile } from '../../shared/src/types/social';
import { GameType, GameRules } from '../../shared/src/types/game';

// .env faylini yuklash
loadEnv();

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const roomManager = new RoomManager();
const telegramBot = new TelegramBot();

// Foydalanuvchilar, reyting va statistika (DATA_DIR/users.json)
const dataDir = process.env.DATA_DIR || path.join(process.cwd(), 'data');
const userStore = new UserStore(path.join(dataDir, 'users.json'));

// REST API endpointlari
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    time: new Date().toISOString(),
    bot: telegramBot.getStatus(),
  });
});

app.get('/api/bot/status', (req, res) => {
  res.json(telegramBot.getStatus());
});

app.get('/api/leaderboard', (req, res) => {
  res.json({ players: userStore.leaderboard(30).map(toLeaderboardEntry) });
});

// Bot tokenini almashtirish faqat ADMIN_TOKEN bilan ruxsat etiladi (aks holda istalgan odam botni egallab olishi mumkin edi)
app.post('/api/bot/configure', async (req, res) => {
  const adminToken = process.env.ADMIN_TOKEN;
  if (!adminToken || req.get('X-Admin-Token') !== adminToken) {
    return res.status(403).json({ error: 'Ruxsat yo\'q' });
  }

  const { token, miniAppUrl } = req.body;
  if (!token) {
    return res.status(400).json({ error: 'Token kiritilishi shart' });
  }

  const success = await telegramBot.updateToken(token, miniAppUrl);
  return res.json({
    success,
    status: telegramBot.getStatus(),
  });
});

// --- Profil yordamchilari ---

const toProfile = (u: StoredUser): UserProfile => ({
  id: u.id,
  telegramId: u.telegramId,
  username: u.username,
  displayName: u.displayName,
  ratingElo: u.ratingElo,
  gamesPlayed: u.gamesPlayed,
  gamesWon: u.gamesWon,
  vipStatus: false,
});

const toLeaderboardEntry = (u: StoredUser) => ({
  id: u.id,
  displayName: u.displayName,
  ratingElo: u.ratingElo,
  gamesPlayed: u.gamesPlayed,
  gamesWon: u.gamesWon,
});

// Ko'rinadigan ism: boshqaruv belgilarisiz, 2-24 belgi
const sanitizeName = (raw: any): string | null => {
  if (typeof raw !== 'string') return null;
  const clean = raw.replace(/[\u0000-\u001f\u007f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 24);
  return clean.length >= 2 ? clean : null;
};

// Mehmon ID si server kaliti bilan imzolanadi - boshqa mehmonning ID sini o'zlashtirib bo'lmaydi
const guestTokenFor = (id: string) => crypto.createHmac('sha256', userStore.secret).update(id).digest('hex').slice(0, 40);
const isValidGuest = (id: any, token: any) =>
  typeof id === 'string' && /^u_[A-Za-z0-9]{8,40}$/.test(id) && typeof token === 'string' &&
  token.length === 40 && crypto.timingSafeEqual(Buffer.from(token), Buffer.from(guestTokenFor(id)));

// Klientdan kelgan o'yin sozlamalarini tekshirish (lobbidagi cheklovlar bilan bir xil)
const ALLOWED_RULES: Record<GameType, GameRules[]> = {
  BURA: ['ODDIY', 'MOLOTKALI', 'FORTY_ONE', 'SIX_CARDS'],
  DURAK: ['PEREKIDLI', 'PEREKIDSIZ'],
  ONE_HUNDRED_EIGHT: ['KOROL_QARGA', 'KOROL_OLMA'],
};

const getAllowedPlayerCounts = (gameType: GameType, rules: GameRules): number[] => {
  if (gameType === 'BURA') return rules === 'SIX_CARDS' ? [2, 3] : [2, 3, 4];
  if (gameType === 'ONE_HUNDRED_EIGHT') return [2, 3, 4];
  return [2, 3, 4, 6];
};

const validateRoomOptions = (
  gameType: any,
  rules: any,
  totalPlayers: any
): { gameType: GameType; rules: GameRules; totalPlayers: number } | null => {
  const allowedRules = ALLOWED_RULES[gameType as GameType];
  if (!allowedRules || !allowedRules.includes(rules)) return null;
  const count = totalPlayers ?? 2;
  if (!getAllowedPlayerCounts(gameType, rules).includes(count)) return null;
  return { gameType, rules, totalPlayers: count };
};

// Onlayn foydalanuvchilar sessiyasi
interface ConnectedUserSession {
  info: OnlineUserInfo;
  ws: WebSocket;
}

const onlineUsers = new Map<string, ConnectedUserSession>();

const sendTo = (ws: WebSocket, data: any) => {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(data));
};

const broadcastOnlineUsers = () => {
  // Foydalanuvchi talabi: umumiy ballari / ELO ko'rsatkichiga qarab TEPADAN PASTGA qarab saralash
  const list: OnlineUserInfo[] = Array.from(onlineUsers.values())
    .map((s) => s.info)
    .sort((a, b) => (b.ratingElo || 1000) - (a.ratingElo || 1000));

  const message = { type: 'ONLINE_USERS_UPDATE', payload: { users: list } };
  for (const session of onlineUsers.values()) sendTo(session.ws, message);
};

// O'yin tugaganda: statistika va (kamida 2 ta odam bo'lsa) ELO yangilanadi, o'yinchilarga yangi profil yuboriladi
roomManager.onGameOver = (room: GameRoom) => {
  const humans = room.engine.players.filter(p => !p.isBot && userStore.get(p.id)).map(p => p.id);
  if (humans.length === 0) return;
  const { winners, losers } = room.engine.getFinalResults();
  const humanSet = new Set(humans);
  const deltas = userStore.recordGameResult({
    gameType: room.settings.gameType,
    humanPlayerIds: humans,
    winners: winners.filter(id => humanSet.has(id)),
    losers: losers.filter(id => humanSet.has(id)),
    rated: humans.length >= 2,
  });

  for (const id of humans) {
    const user = userStore.get(id)!;
    const session = onlineUsers.get(id);
    if (session) {
      session.info.ratingElo = user.ratingElo;
      sendTo(session.ws, { type: 'PROFILE_UPDATE', profile: toProfile(user), ratingDelta: deltas.get(id) || 0 });
    }
  }
  broadcastOnlineUsers();
};

// WebSocket boshqaruvi
wss.on('connection', (ws: WebSocket) => {
  // ID faqat REGISTER_USER da server tomonidan aniqlanadi; klient yuborgan playerId larga ishonilmaydi
  let currentPlayerId: string | null = null;
  let currentRoomId: string | null = null;

  const sender = (data: any) => sendTo(ws, data);

  const displayNameOf = (id: string) => userStore.get(id)?.displayName || "O'yinchi";

  const requireSession = (): boolean => {
    if (currentPlayerId) return true;
    sender({ type: 'ERROR', message: "Serverga ulanish tugallanmadi, sahifani yangilang." });
    return false;
  };

  const setUserStatus = (playerId: string, roomId: string | null) => {
    const userSession = onlineUsers.get(playerId);
    if (userSession) {
      userSession.info.status = roomId ? 'IN_GAME' : 'ONLINE';
      userSession.info.currentRoomId = roomId || undefined;
      broadcastOnlineUsers();
    }
  };

  // Yangi stolga o'tishdan oldin eski stoldan chiqish (aks holda eski stol bu socketga xabar yuborishda davom etadi)
  const leaveCurrentRoom = (nextRoomId?: string) => {
    if (!currentRoomId || !currentPlayerId || currentRoomId === nextRoomId) return;
    roomManager.getRoom(currentRoomId)?.removePlayer(currentPlayerId);
    currentRoomId = null;
  };

  const handleRegister = (payload: any) => {
    const { initData, guestId, guestToken, displayName } = payload || {};
    let user: StoredUser;
    let issuedGuestToken: string | undefined;

    const tgUser = typeof initData === 'string' && initData
      ? verifyTelegramInitData(initData, telegramBot.getToken())
      : null;

    if (tgUser) {
      const id = `tg_${tgUser.id}`;
      user = userStore.upsert(id, {
        telegramId: tgUser.id,
        username: tgUser.username || `user_${tgUser.id}`,
        displayName: sanitizeName(tgUser.first_name) || 'Choyxona Mehmoni',
      });
    } else {
      // Mehmon: avval berilgan imzoli ID bo'lsa - o'shani, aks holda yangisini beramiz
      const id = isValidGuest(guestId, guestToken) ? guestId : `u_${crypto.randomBytes(8).toString('hex')}`;
      issuedGuestToken = guestTokenFor(id);
      const existing = userStore.get(id);
      const suffix = id.slice(-4);
      user = userStore.upsert(id, {
        username: existing?.username || `mehmon_${suffix}`,
        displayName: sanitizeName(displayName) || existing?.displayName || `Mehmon #${suffix}`,
      });
    }

    // Boshqa identifikatsiyaga o'tilsa (masalan, qayta ro'yxatdan o'tish) eski sessiyani tozalaymiz
    if (currentPlayerId && currentPlayerId !== user.id) {
      leaveCurrentRoom();
      if (onlineUsers.get(currentPlayerId)?.ws === ws) onlineUsers.delete(currentPlayerId);
    }
    currentPlayerId = user.id;

    onlineUsers.set(user.id, {
      info: {
        id: user.id,
        telegramId: user.telegramId,
        username: user.username,
        displayName: user.displayName,
        ratingElo: user.ratingElo,
        status: currentRoomId ? 'IN_GAME' : 'ONLINE',
        currentRoomId: currentRoomId || undefined,
      },
      ws,
    });

    sender({ type: 'SESSION', profile: toProfile(user), guestToken: issuedGuestToken, isTelegram: !!tgUser });
    broadcastOnlineUsers();
  };

  ws.on('message', async (message: string) => {
    try {
      const data = JSON.parse(message.toString());
      const { type } = data;
      const payload = data.payload || {};

      // 0. Sessiya: Telegram (imzo tekshiriladi) yoki mehmon
      if (type === 'REGISTER_USER') {
        handleRegister(payload);
        return;
      }

      // 0.1 Onlayn foydalanuvchilar ro'yxatini so'rash
      if (type === 'GET_ONLINE_USERS') {
        const list = Array.from(onlineUsers.values())
          .map((s) => s.info)
          .sort((a, b) => (b.ratingElo || 1000) - (a.ratingElo || 1000));
        sender({ type: 'ONLINE_USERS_UPDATE', payload: { users: list } });
        return;
      }

      // 0.2 Reyting jadvali
      if (type === 'GET_LEADERBOARD') {
        sender({ type: 'LEADERBOARD', players: userStore.leaderboard(30).map(toLeaderboardEntry) });
        return;
      }

      if (!requireSession()) return;
      const playerId = currentPlayerId!;

      // 0.3 Ko'rinadigan ismni o'zgartirish
      if (type === 'SET_DISPLAY_NAME') {
        const name = sanitizeName(payload.displayName);
        if (!name) {
          sender({ type: 'ACTION_ERROR', message: "Ism 2 dan 24 gacha belgidan iborat bo'lishi kerak" });
          return;
        }
        const user = userStore.setDisplayName(playerId, name)!;
        const session = onlineUsers.get(playerId);
        if (session) session.info.displayName = name;
        sender({ type: 'PROFILE_UPDATE', profile: toProfile(user) });
        broadcastOnlineUsers();
        return;
      }

      // 1. Bot bilan xona ochish
      if (type === 'CREATE_BOT_ROOM') {
        const options = validateRoomOptions(payload.gameType, payload.rules, payload.totalPlayers);
        if (!options) {
          sender({ type: 'ERROR', message: "Noto'g'ri o'yin sozlamalari!" });
          return;
        }
        leaveCurrentRoom();
        const room = roomManager.createBotRoom(
          playerId,
          displayNameOf(playerId),
          options.gameType,
          options.rules,
          options.totalPlayers,
          sender
        );
        currentRoomId = room.id;
        setUserStatus(playerId, room.id);
        sender({ type: 'ROOM_CREATED', roomId: room.id, settings: room.settings });
        return;
      }

      // 1.1 Do'stlar bilan o'ynash uchun Multiplayer xona ochish
      if (type === 'CREATE_MULTIPLAYER_ROOM') {
        const options = validateRoomOptions(payload.gameType, payload.rules, payload.totalPlayers);
        if (!options) {
          sender({ type: 'ERROR', message: "Noto'g'ri o'yin sozlamalari!" });
          return;
        }
        const clientRoomId = payload.roomId;

        // Mezbon o'zi turgan stolni qayta ochsa - o'sha stol qaytariladi.
        // Boshqa birovning stoli ID si bilan to'qnashsa - yangi ID beriladi (eski stolni ustidan yozib yubormaslik uchun).
        const existing = typeof clientRoomId === 'string' ? roomManager.getRoom(clientRoomId) : undefined;
        let room;
        if (existing && existing.engine.players.some(p => p.id === playerId)) {
          room = existing;
          room.addPlayer(playerId, displayNameOf(playerId), false, sender);
        } else {
          const safeRoomId = typeof clientRoomId === 'string' && /^[A-Za-z0-9_-]{4,40}$/.test(clientRoomId) && !existing
            ? clientRoomId
            : undefined;
          leaveCurrentRoom();
          room = roomManager.createMultiplayerRoom(
            playerId,
            displayNameOf(playerId),
            options.gameType,
            options.rules,
            options.totalPlayers,
            sender,
            safeRoomId
          );
        }
        currentRoomId = room.id;
        setUserStatus(playerId, room.id);
        sender({ type: 'ROOM_CREATED', roomId: room.id, settings: room.settings });
        room.broadcastState();
        return;
      }

      // 1.2 Xonani botlar bilan to'ldirib boshlash
      if (type === 'START_ROOM_WITH_BOTS') {
        const targetRoomId = payload.roomId || currentRoomId;
        const room = targetRoomId ? roomManager.getRoom(targetRoomId) : undefined;
        // Faqat stol mezboni (1-o'yinchi) botlar bilan boshlay oladi
        if (room && room.engine.players[0]?.id === playerId) {
          room.fillRemainingWithBots();
          room.broadcastState();
        }
        return;
      }

      // 2. Do'stlar bilan xonaga ulanish (qayta ulanish ham shu orqali)
      if (type === 'JOIN_ROOM') {
        const roomId = payload.roomId;
        const room = typeof roomId === 'string' ? roomManager.getRoom(roomId) : undefined;
        if (!room) {
          sender({ type: 'ERROR', message: 'Bunday xona topilmadi!' });
          return;
        }
        leaveCurrentRoom(roomId);
        const joined = room.addPlayer(playerId, displayNameOf(playerId), false, sender);
        if (joined) {
          currentRoomId = roomId;
          setUserStatus(playerId, roomId);
          sender({ type: 'ROOM_JOINED', roomId, settings: room.settings });
          room.broadcastState();
          // Qayta ulanganda chat tarixini ham qaytaramiz
          for (const msg of roomManager.chatManager.getRoomMessages(roomId)) {
            sender({ type: 'CHAT_MESSAGE', message: msg });
          }
        } else {
          sender({ type: 'ERROR', message: 'Xona to\'lgan yoki o\'yin boshlangan!' });
        }
        return;
      }

      // 2.1 Xonadan chiqish
      if (type === 'LEAVE_ROOM') {
        if (currentRoomId) {
          leaveCurrentRoom();
          setUserStatus(playerId, null);
        }
        return;
      }

      // 2.2 Foydalanuvchini stolga taklif etish (Realtime WebSocket va Telegram Bot orqali)
      if (type === 'INVITE_USER') {
        const { targetUserId, targetUsername, roomId } = payload;
        const room = typeof roomId === 'string' ? roomManager.getRoom(roomId) : undefined;
        if (!room) {
          sender({ type: 'INVITATION_SENT', success: false, message: '⚠️ Stol topilmadi, avval stol oching.' });
          return;
        }
        const inviterName = displayNameOf(playerId);
        let targetSession: ConnectedUserSession | undefined = undefined;

        // 1. targetUserId orqali qidirish (agar u dummy friend_ ID bo'lmasa)
        if (typeof targetUserId === 'string' && !targetUserId.startsWith('friend_')) {
          targetSession = onlineUsers.get(targetUserId);
        }

        // 2. targetUsername yoki displayName orqali qidirish
        const cleanTarget = typeof targetUsername === 'string' ? targetUsername.replace('@', '').trim() : '';
        if (!targetSession && cleanTarget) {
          const clean = cleanTarget.toLowerCase();
          targetSession = Array.from(onlineUsers.values()).find((s) => {
            const uName = (s.info.username || '').replace('@', '').trim().toLowerCase();
            const dName = (s.info.displayName || '').replace('@', '').trim().toLowerCase();
            return uName === clean || dName === clean;
          });
        }

        // 3. Telegram Bot orqali ham xabar yuborib ko'rish (agar botga yozgan bo'lsa)
        let sentViaTelegram = false;
        if (cleanTarget) {
          sentViaTelegram = await telegramBot.sendGameInvite(cleanTarget, inviterName, roomId, room.settings.gameType);
        }

        if (targetSession && targetSession.ws.readyState === WebSocket.OPEN) {
          const invitation: TableInvitation = {
            id: `inv_${Date.now()}`,
            roomId,
            inviterId: playerId,
            inviterName,
            gameType: room.settings.gameType,
            rules: room.settings.rules,
            totalPlayers: room.settings.maxPlayers,
            timestamp: Date.now(),
          };
          sendTo(targetSession.ws, { type: 'TABLE_INVITATION', payload: invitation });
          sender({
            type: 'INVITATION_SENT',
            success: true,
            targetName: targetSession.info.displayName,
            message: sentViaTelegram
              ? `✅ ${targetSession.info.displayName} ning ekrani va Telegramiga taklif yuborildi!`
              : `✅ ${targetSession.info.displayName} ning ekraniga taklifnoma yuborildi!`,
          });
        } else if (sentViaTelegram) {
          sender({
            type: 'INVITATION_SENT',
            success: true,
            targetName: cleanTarget,
            message: `📱 @${cleanTarget} ga Telegram boti orqali taklifnoma yuborildi!`,
          });
        } else {
          sender({
            type: 'INVITATION_SENT',
            success: false,
            message: `⚠️ Do'stingiz (@${cleanTarget}) hozir ilovada onlayn emas. Unga Telegram orqali havola ulashing!`,
          });
        }
        return;
      }

      // 3. O'yin harakati (karta tashlash, urish, kombinatsiya ochish)
      if (type === 'GAME_ACTION') {
        const room = currentRoomId ? roomManager.getRoom(currentRoomId) : undefined;
        if (room) {
          const result = room.handlePlayerAction(playerId, payload.action, payload);
          if (!result.success) {
            sender({ type: 'ACTION_ERROR', message: result.message });
          }
        }
        return;
      }

      // 4. Chat xabari yuborish
      if (type === 'SEND_CHAT') {
        const room = currentRoomId ? roomManager.getRoom(currentRoomId) : undefined;
        if (room) {
          const res = roomManager.chatManager.sendMessage(
            room.id,
            playerId,
            // Ism serverdagi profildan olinadi - klient boshqa odam nomidan yoza olmasligi uchun
            room.engine.players.find(p => p.id === playerId)?.username || displayNameOf(playerId),
            payload.text,
            !!payload.isQuickPhrase
          );
          if (res.success && res.message) {
            for (const clientSender of room.clients.values()) {
              clientSender({ type: 'CHAT_MESSAGE', message: res.message });
            }
          } else {
            sender({ type: 'CHAT_ERROR', message: res.error });
          }
        }
        return;
      }
    } catch (e: any) {
      console.error('WS Error:', e.message);
    }
  });

  ws.on('close', () => {
    if (currentPlayerId) {
      // Shu foydalanuvchi boshqa oynadan qayta ulangan bo'lsa, uning yangi sessiyasini o'chirib yubormaslik
      if (onlineUsers.get(currentPlayerId)?.ws === ws) {
        onlineUsers.delete(currentPlayerId);
      }
      if (currentRoomId) {
        roomManager.getRoom(currentRoomId)?.removePlayer(currentPlayerId, sender);
      }
      broadcastOnlineUsers();
    }
  });
});

// Agar client dist yig'ilgan bo'lsa, uni to'g'ridan-to'g'ri statik tarqatish (Telegram Mini App uchun)
const clientDistPath = path.resolve(__dirname, '../../client/dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
  console.log(`📁 [Static] Client dist papkasi ulandi: ${clientDistPath}`);
}

// To'xtatilganda ma'lumotlarni diskka yozib ulgurish
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    userStore.flush();
    process.exit(0);
  });
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🍵 Choyxona Game Server ishga tushdi: http://localhost:${PORT}`);
  console.log(`💾 [Store] Ma'lumotlar fayli: ${path.join(dataDir, 'users.json')}`);
  // Telegram Botni ishga tushirish
  telegramBot.start();
});
