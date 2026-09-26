import { useState, useEffect, useRef } from 'react';
import { GameType, GameRules, TableState } from '../../shared/src/types/game';
import { Card } from '../../shared/src/types/card';
import { ChatMessage } from '../../shared/src/types/chat';
import { UserProfile, FriendItem, OnlineUserInfo, TableInvitation } from '../../shared/src/types/social';
import { TableThemeId, AppBackgroundId, CardBackId, APP_BACKGROUNDS, TABLE_THEMES } from './types/theme';
import { LobbyView } from './components/Lobby/LobbyView';
import { XontaxtaView } from './components/Table/XontaxtaView';
import { ProfileDrawer } from './components/Social/ProfileDrawer';
import { FriendsDrawer } from './components/Social/FriendsDrawer';
import { ClansDrawer } from './components/Social/ClansDrawer';
import { SettingsModal } from './components/Modals/SettingsModal';
import { LeaderboardModal, LeaderboardEntry } from './components/Modals/LeaderboardModal';
import { ThemeSelectorModal } from './components/Table/ThemeSelectorModal';
import { AuthModal } from './components/Modals/AuthModal';
import { InviteFriendsModal } from './components/Modals/InviteFriendsModal';
import { InvitationToast } from './components/Modals/InvitationToast';
import { gameClient } from './services/gameClient';
import { getTelegramUser, getTelegramInitData, initTelegramApp, triggerHaptic } from './services/telegramSdk';
import { detectSpecialCombinations, sortHand } from '../../shared/src/utils/deck';
import { BuraEngine } from '../../server/src/engine/BuraEngine';
import { OneHundredEightEngine } from '../../server/src/engine/OneHundredEightEngine';
import { DurakEngine } from '../../server/src/engine/DurakEngine';
import { BotAI } from '../../server/src/ai/BotAI';

// Server bilan aloqa o'rnatilguncha ko'rsatiladigan vaqtinchalik profil.
// Haqiqiy ID, reyting va statistika serverdan SESSION xabari orqali keladi.
const getInitialUser = (): UserProfile => {
  initTelegramApp();
  const tgUser = getTelegramUser();
  if (tgUser) {
    return {
      id: `tg_${tgUser.id}`,
      telegramId: tgUser.id,
      username: tgUser.username || `user_${tgUser.id}`,
      displayName: tgUser.first_name || 'Choyxona Mehmoni',
      ratingElo: 1000,
      gamesPlayed: 0,
      gamesWon: 0,
      vipStatus: false,
    };
  }

  try {
    const saved = localStorage.getItem('choyxona_user');
    if (saved) {
      const parsed = JSON.parse(saved);
      // tg_12345678 - eski versiyadagi umumiy mock ID (hamma brauzerda bir xil edi), uni qayta ishlatmaymiz
      if (parsed && parsed.id && parsed.username && parsed.id !== 'user_1' && parsed.id !== 'tg_12345678' && parsed.username !== 'mehmon_uz') {
        return parsed;
      }
    }
  } catch (e) {}

  // Server yo'q (lokal rejim) holati uchun mehmon profili
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return {
    id: `local_${Date.now()}_${randomSuffix}`,
    username: `mehmon_${randomSuffix}`,
    displayName: `Mehmon #${randomSuffix}`,
    ratingElo: 1000,
    gamesPlayed: 0,
    gamesWon: 0,
    vipStatus: false,
  };
};

// Server imzolagan mehmon ID si (Telegram tashqarisida o'sha statistikani saqlab qolish uchun)
const loadGuestCredentials = (): { id?: string; token?: string } => {
  try {
    return JSON.parse(localStorage.getItem('choyxona_guest') || '{}') || {};
  } catch (e) {
    return {};
  }
};

const saveUser = (user: UserProfile) => {
  try {
    localStorage.setItem('choyxona_user', JSON.stringify(user));
  } catch (e) {}
};

const getInitialFriends = (): FriendItem[] => {
  try {
    const saved = localStorage.getItem('choyxona_friends');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {}
  return [];
};

export function App() {
  const [view, setView] = useState<'LOBBY' | 'GAME'>('LOBBY');

  // 3 xil alohida sozlanadigan fonlar
  const [currentThemeId, setCurrentThemeId] = useState<TableThemeId>(() => {
    try {
      const saved = localStorage.getItem('choyxona_theme');
      if (saved && TABLE_THEMES[saved as TableThemeId]) return saved as TableThemeId;
    } catch (e) {}
    return 'classic_wood';
  });
  const [currentBgId, setCurrentBgId] = useState<AppBackgroundId>(() => {
    try {
      const saved = localStorage.getItem('choyxona_bg');
      if (saved && APP_BACKGROUNDS[saved as AppBackgroundId]) return saved as AppBackgroundId;
    } catch (e) {}
    return 'choyxona_night';
  });
  const [currentCardBackId, setCurrentCardBackId] = useState<CardBackId>(() => {
    try {
      const saved = localStorage.getItem('choyxona_cardback');
      if (saved) return saved as CardBackId;
    } catch (e) {}
    return 'paxtagul_gold';
  });

  const handleSelectTheme = (id: TableThemeId) => {
    setCurrentThemeId(id);
    try { localStorage.setItem('choyxona_theme', id); } catch (e) {}
  };
  const handleSelectBg = (id: AppBackgroundId) => {
    setCurrentBgId(id);
    try { localStorage.setItem('choyxona_bg', id); } catch (e) {}
  };
  const handleSelectCardBack = (id: CardBackId) => {
    setCurrentCardBackId(id);
    try { localStorage.setItem('choyxona_cardback', id); } catch (e) {}
  };

  const [currentUser, setCurrentUser] = useState<UserProfile>(getInitialUser);
  const [friends, setFriends] = useState<FriendItem[]>(getInitialFriends);

  // Modallar
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isFriendsOpen, setIsFriendsOpen] = useState(false);
  const [isClansOpen, setIsClansOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [isThemeOpen, setIsThemeOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  // Do'stlar bilan o'ynash, Onlayn o'yinchilar va Takliflar
  const [isInviteFriendsOpen, setIsInviteFriendsOpen] = useState(false);
  const [selectedInviteGame, setSelectedInviteGame] = useState<GameType>('BURA');
  const [selectedInviteRules, setSelectedInviteRules] = useState<GameRules>('ODDIY');
  const [selectedInvitePlayerCount, setSelectedInvitePlayerCount] = useState<number>(2);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUserInfo[]>([]);
  const [incomingInvitation, setIncomingInvitation] = useState<TableInvitation | null>(null);
  const [pendingJoinRoomId, setPendingJoinRoomId] = useState<string | null>(null);
  const [authPromptMessage, setAuthPromptMessage] = useState<string | undefined>(undefined);
  const [inviteFeedback, setInviteFeedback] = useState<{ success: boolean; message: string } | null>(null);

  // O'yin holati
  const [tableState, setTableState] = useState<TableState | null>(null);
  const [hand, setHand] = useState<Card[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatCooldown, setChatCooldown] = useState<number>(0);
  const [pendingPenaltyCount, setPendingPenaltyCount] = useState<number>(0);
  // Rad etilgan yurish sababi (masalan "Hozir sizning navbatingiz emas!") - qisqa vaqt ko'rsatiladi
  const [actionError, setActionError] = useState<string | null>(null);
  // Ijobiy xabar (masalan, o'yin oxirida reyting o'zgarishi)
  const [infoNotice, setInfoNotice] = useState<string | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[] | null>(null);

  const [localEngine, setLocalEngine] = useState<any>(null);

  // Qayta ulanish handleri eskirgan state ni ko'rmasligi uchun joriy qiymatlar ref da saqlanadi
  const currentUserRef = useRef(currentUser);
  currentUserRef.current = currentUser;
  const activeRoomIdRef = useRef(activeRoomId);
  activeRoomIdRef.current = activeRoomId;
  const viewRef = useRef(view);
  viewRef.current = view;
  const localEngineRef = useRef<any>(localEngine);
  localEngineRef.current = localEngine;
  const pendingJoinRef = useRef<string | null>(null);

  useEffect(() => {
    initTelegramApp();

    // 1. Havoladan (Deep Link) stol kodi (roomId) ni aniqlash - sessiya tayyor bo'lgach qo'shilamiz
    const urlParams = new URLSearchParams(window.location.search);
    let deepRoom = urlParams.get('joinRoom');
    const tgStartParam = (window as any).Telegram?.WebApp?.initDataUnsafe?.start_param;
    if (!deepRoom && tgStartParam && tgStartParam.startsWith('join_')) {
      deepRoom = tgStartParam.replace('join_', '');
    }
    if (deepRoom) {
      pendingJoinRef.current = deepRoom;
      setPendingJoinRoomId(deepRoom);
    }

    // Serverga o'zimizni tanishtiramiz: Telegram ichida imzolangan initData, tashqarida - mehmon tokeni
    const register = () => {
      const guest = loadGuestCredentials();
      let displayName: string | undefined;
      try {
        displayName = localStorage.getItem('choyxona_display_name') || undefined;
      } catch (e) {}
      gameClient.registerUser({
        initData: getTelegramInitData() || undefined,
        guestId: guest.id,
        guestToken: guest.token,
        displayName,
      });
    };

    // Telegram Mini App yoki Brauzer uchun mos WSS/WS URL ni aniqlash
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsPort = window.location.port === '3000'
      ? ':3001'
      : (window.location.port ? `:${window.location.port}` : '');
    const wsUrl = `${protocol}//${window.location.hostname}${wsPort}`;

    gameClient.connect(wsUrl).then((connected) => {
      if (connected) {
        console.log(`🟢 Serverga muvaffaqiyatli ulandi (${wsUrl})`);
        register();
      }
    });

    const unsubscribe = gameClient.onMessage((data) => {
      if (data.type === 'SESSION') {
        const profile: UserProfile = data.profile;
        setCurrentUser(profile);
        saveUser(profile);
        if (data.guestToken) {
          try {
            localStorage.setItem('choyxona_guest', JSON.stringify({ id: profile.id, token: data.guestToken }));
          } catch (e) {}
        }
        gameClient.getOnlineUsers();

        const pending = pendingJoinRef.current;
        if (pending) {
          // Taklif havolasi orqali kirilgan bo'lsa - to'g'ridan-to'g'ri stolga
          pendingJoinRef.current = null;
          setPendingJoinRoomId(null);
          gameClient.joinRoom(pending, profile.id, profile.displayName);
          setActiveRoomId(pending);
          setView('GAME');
        } else if (viewRef.current === 'GAME' && activeRoomIdRef.current && !localEngineRef.current) {
          // Qayta ulanish: o'yin stoliga qaytamiz
          gameClient.joinRoom(activeRoomIdRef.current, profile.id, profile.displayName);
        }
      }
      if (data.type === 'PROFILE_UPDATE') {
        setCurrentUser(data.profile);
        saveUser(data.profile);
        if (typeof data.ratingDelta === 'number' && data.ratingDelta !== 0) {
          const sign = data.ratingDelta > 0 ? '+' : '';
          setInfoNotice(`Reyting: ${sign}${data.ratingDelta} (ELO ${data.profile.ratingElo})`);
        }
      }
      if (data.type === 'LEADERBOARD') {
        setLeaderboard(data.players || []);
      }
      if (data.type === 'TABLE_UPDATE') {
        setTableState(data.tableState);
        const isBura = data.tableState?.settings?.gameType === 'BURA';
        const sorted = sortHand(data.hand || [], data.tableState?.trumpSuit, isBura);
        setHand(sorted);
        setPendingPenaltyCount(data.tableState?.pendingPenaltyCount ?? 0);
      }
      if (data.type === 'CHAT_MESSAGE') {
        setChatMessages((prev) => (prev.some((m) => m.id === data.message.id) ? prev : [...prev, data.message]));
      }
      if (data.type === 'ONLINE_USERS_UPDATE') {
        setOnlineUsers(data.payload?.users || []);
      }
      if (data.type === 'TABLE_INVITATION') {
        setIncomingInvitation(data.payload);
      }
      if (data.type === 'INVITATION_SENT') {
        setInviteFeedback({
          success: data.success,
          message: data.message || (data.success ? 'Taklif muvaffaqiyatli yuborildi!' : 'Taklif yetkazilmadi.'),
        });
      }
      if (data.type === 'ROOM_CREATED') {
        setActiveRoomId(data.roomId);
      }
      if (data.type === 'ROOM_JOINED') {
        setActiveRoomId(data.roomId);
        setView('GAME');
        setIsInviteFriendsOpen(false);
      }
      if (data.type === 'ACTION_ERROR' || data.type === 'CHAT_ERROR') {
        setActionError(data.message || "Bu harakatni bajarib bo'lmaydi");
        triggerHaptic('error');
      }
      if (data.type === 'ERROR') {
        alert(data.message || 'Xatolik yuz berdi!');
      }
    });

    // Aloqa uzilib qayta tiklansa: qayta ro'yxatdan o'tamiz, SESSION kelgach stolga qaytiladi
    const unsubscribeReconnect = gameClient.onReconnect(register);

    return () => {
      unsubscribe();
      unsubscribeReconnect();
    };
  }, []);

  useEffect(() => {
    if (!actionError) return;
    const timer = setTimeout(() => setActionError(null), 2500);
    return () => clearTimeout(timer);
  }, [actionError]);

  useEffect(() => {
    if (!infoNotice) return;
    const timer = setTimeout(() => setInfoNotice(null), 4000);
    return () => clearTimeout(timer);
  }, [infoNotice]);

  useEffect(() => {
    if (chatCooldown > 0) {
      const timer = setTimeout(() => setChatCooldown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [chatCooldown]);

  const handleStartGame = (gameType: GameType, rules: GameRules, totalPlayers: number, _isBot: boolean) => {
    setChatMessages([]);
    setLocalEngine(null);
    if (gameClient.isConnected()) {
      gameClient.createBotRoom(currentUser.id, currentUser.displayName, gameType, rules, totalPlayers);
      setView('GAME');
    } else {
      startLocalGame(gameType, rules, totalPlayers);
    }
  };

  const startLocalGame = (gameType: GameType, rules: GameRules, totalPlayers: number) => {
    const settings = {
      id: `local_room_${Date.now()}`,
      gameType,
      rules,
      maxPlayers: totalPlayers,
      turnTimeoutSeconds: 15,
      isPrivate: true,
      deckType: '36' as const,
    };

    let engine: any;
    if (gameType === 'BURA') {
      engine = new BuraEngine(settings.id, settings);
    } else if (gameType === 'ONE_HUNDRED_EIGHT') {
      engine = new OneHundredEightEngine(settings.id, settings);
    } else {
      engine = new DurakEngine(settings.id, settings);
    }

    engine.addPlayer({ id: currentUser.id, username: currentUser.displayName, isBot: false });
    const botNames = ['Bot Alisher', 'Bot Rustam', 'Bot Shavkat', 'Bot Bekzod', 'Bot Farhod'];
    for (let i = 1; i < totalPlayers; i++) {
      engine.addPlayer({ id: `bot_${i}`, username: botNames[i - 1], isBot: true });
    }

    engine.initGame();
    setLocalEngine(engine);
    setTableState(engine.getTableState());

    // Kartalarni tartiblash
    const isBura = engine instanceof BuraEngine;
    const playerHand = engine.getPlayerHand(currentUser.id);
    setHand(sortHand(playerHand, engine.trumpSuit, isBura));

    setPendingPenaltyCount(engine instanceof OneHundredEightEngine ? engine.pendingPenaltyCards : 0);
    setView('GAME');

    checkAndTriggerLocalBot(engine);
  };

  const checkAndTriggerLocalBot = (engine: any) => {
    if (engine.status !== 'PLAYING') return;
    // Avtomatik kombinatsiya yurishi vzyatkani yakunlagan bo'lsa, avval uni hisoblaymiz
    if (engine instanceof BuraEngine && engine.isResolvingTrick) {
      setTimeout(() => {
        engine.resolveTrick();
        setTableState(engine.getTableState());
        setHand(sortHand(engine.getPlayerHand(currentUser.id), engine.trumpSuit, true));
        checkAndTriggerLocalBot(engine);
      }, 1800);
      return;
    }
    const activePlayer = engine.players[engine.activePlayerIndex];
    if (activePlayer && activePlayer.isBot) {
      setTimeout(() => {
        let moveResult: any = { success: true };
        const isBura = engine instanceof BuraEngine;

        if (engine instanceof BuraEngine) {
          const move = BotAI.makeBuraMove(engine, activePlayer.id);
          if (move.action === 'DECLARE' && move.type) {
            moveResult = engine.declareCombination(activePlayer.id, move.type);
          } else if (move.action === 'PLAY' && move.cards) {
            moveResult = engine.playCards(activePlayer.id, move.cards);
          } else if (move.action === 'FOLD' && move.cards) {
            moveResult = engine.foldOrPass(activePlayer.id, move.cards);
          }
        } else if (engine instanceof OneHundredEightEngine) {
          const move = BotAI.make108Move(engine, activePlayer.id);
          if (move.action === 'PLAY' && move.card) {
            moveResult = engine.playCard(activePlayer.id, move.card, move.chosenSuit);
          } else {
            moveResult = engine.drawCard(activePlayer.id);
          }
        } else if (engine instanceof DurakEngine) {
          const move = BotAI.makeDurakMove(engine, activePlayer.id);
          if (move.action === 'ATTACK' && move.card) {
            moveResult = engine.attack(activePlayer.id, move.card);
          } else if (move.action === 'DEFEND' && move.card && move.targetCardId) {
            moveResult = engine.defend(activePlayer.id, move.targetCardId, move.card);
          } else if (move.action === 'TAKE') {
            moveResult = engine.takeCards(activePlayer.id);
          } else {
            moveResult = engine.passOrBita(activePlayer.id);
          }
        }

        setTableState(engine.getTableState());
        const updatedHand = engine.getPlayerHand(currentUser.id);
        setHand(sortHand(updatedHand, engine.trumpSuit, isBura));
        setPendingPenaltyCount(engine instanceof OneHundredEightEngine ? engine.pendingPenaltyCards : 0);

        if (engine instanceof BuraEngine && engine.isResolvingTrick) {
          setTimeout(() => {
            if (engine instanceof BuraEngine) {
              engine.resolveTrick();
              setTableState(engine.getTableState());
              const afterTrickHand = engine.getPlayerHand(currentUser.id);
              setHand(sortHand(afterTrickHand, engine.trumpSuit, true));
              checkAndTriggerLocalBot(engine);
            }
          }, 1800);
        } else {
          checkAndTriggerLocalBot(engine);
        }
      }, 1500); // Kartalar harakatini sekinlashtirish (1.5 soniya)
    }
  };

  const handleReadyNextRound = () => {
    if (!localEngine && gameClient.isConnected()) {
      gameClient.sendGameAction('READY_NEXT_ROUND', {});
    } else if (localEngine) {
      if (typeof localEngine.playerReadyForNextRound === 'function') {
        const isBura = localEngine instanceof BuraEngine;
        localEngine.playerReadyForNextRound(currentUser.id);
        setTableState(localEngine.getTableState());
        const updatedHand = localEngine.getPlayerHand(currentUser.id);
        setHand(sortHand(updatedHand, localEngine.trumpSuit, isBura));
        checkAndTriggerLocalBot(localEngine);
      }
    }
  };

  const handlePlayAction = (action: string, payload: any) => {
    triggerHaptic('medium');
    if (!localEngine && gameClient.isConnected()) {
      gameClient.sendGameAction(action, payload);
    } else if (localEngine) {
      let actionResult: any = { success: true };
      const isBura = localEngine instanceof BuraEngine;

      if (localEngine instanceof BuraEngine) {
        if (action === 'DECLARE_COMBINATION') actionResult = localEngine.declareCombination(currentUser.id, payload.type);
        if (action === 'PLAY_CARDS') actionResult = localEngine.playCards(currentUser.id, payload.cards);
        if (action === 'FOLD') actionResult = localEngine.foldOrPass(currentUser.id, payload.cards);
      } else if (localEngine instanceof OneHundredEightEngine) {
        if (action === 'PLAY_CARD') actionResult = localEngine.playCard(currentUser.id, payload.card, payload.chosenSuit);
        if (action === 'DRAW_CARD') actionResult = localEngine.drawCard(currentUser.id);
        if (action === 'PASS') actionResult = localEngine.pass(currentUser.id);
      } else if (localEngine instanceof DurakEngine) {
        if (action === 'ATTACK') actionResult = localEngine.attack(currentUser.id, payload.card);
        if (action === 'DEFEND') actionResult = localEngine.defend(currentUser.id, payload.targetCardId, payload.card);
        if (action === 'TRANSFER') actionResult = localEngine.transferAttack(currentUser.id, payload.card);
        if (action === 'TAKE') actionResult = localEngine.takeCards(currentUser.id);
        if (action === 'PASS') actionResult = localEngine.passOrBita(currentUser.id);
      }

      if (actionResult && actionResult.success === false && actionResult.message) {
        setActionError(actionResult.message);
        triggerHaptic('error');
      }

      setTableState(localEngine.getTableState());
      const updatedHand = localEngine.getPlayerHand(currentUser.id);
      setHand(sortHand(updatedHand, localEngine.trumpSuit, isBura));
      setPendingPenaltyCount(localEngine instanceof OneHundredEightEngine ? localEngine.pendingPenaltyCards : 0);

      if (localEngine instanceof BuraEngine && localEngine.isResolvingTrick) {
        setTimeout(() => {
          if (localEngine instanceof BuraEngine) {
            localEngine.resolveTrick();
            setTableState(localEngine.getTableState());
            const afterTrickHand = localEngine.getPlayerHand(currentUser.id);
            setHand(sortHand(afterTrickHand, localEngine.trumpSuit, true));
            checkAndTriggerLocalBot(localEngine);
          }
        }, 1800);
      } else {
        checkAndTriggerLocalBot(localEngine);
      }
    }
  };

  // Chat xabari yuborish (Faqat 1 marta yuboriladi, duplikatlar yo'q)
  const handleSendChatMessage = (text: string, isQuick: boolean = false) => {
    if (chatCooldown > 0) return;
    setChatCooldown(3);

    if (!localEngine && gameClient.isConnected()) {
      // Serverga yuboriladi, server hammaga (shu jumladan o'zimizga) 1 marta yuboradi
      gameClient.sendChatMessage(text, currentUser.displayName, isQuick);
    } else {
      // Offline bo'lsagina mahalliy qo'shiladi
      const newMsg: ChatMessage = {
        id: `msg_${Date.now()}`,
        senderId: currentUser.id,
        senderName: currentUser.displayName,
        text,
        timestamp: Date.now(),
        isQuickPhrase: isQuick,
      };
      setChatMessages((prev) => [...prev, newMsg]);
    }
  };

  const handleLeaveRoom = () => {
    if (gameClient.isConnected()) {
      gameClient.leaveRoom();
    }
    setActiveRoomId(null);
    setView('LOBBY');
    setTableState(null);
    setHand([]);
    setLocalEngine(null);
    setChatMessages([]);
  };

  const handleAuthSuccess = (displayName: string) => {
    try {
      localStorage.setItem('choyxona_display_name', displayName);
    } catch (e) {}
    if (gameClient.isConnected()) {
      // Server saqlaydi va PROFILE_UPDATE bilan javob beradi
      gameClient.setDisplayName(displayName);
    } else {
      const updatedUser = { ...currentUser, displayName };
      setCurrentUser(updatedUser);
      saveUser(updatedUser);
    }
  };

  const handleOpenLeaderboard = () => {
    setIsLeaderboardOpen(true);
    if (gameClient.isConnected()) {
      setLeaderboard(null);
      gameClient.getLeaderboard();
    } else {
      setLeaderboard([]);
    }
  };

  const handleOpenFriendsTable = (gameType: GameType, rules: GameRules, totalPlayers: number) => {
    setSelectedInviteGame(gameType);
    setSelectedInviteRules(rules);
    setSelectedInvitePlayerCount(totalPlayers);
    setIsInviteFriendsOpen(true);
    setInviteFeedback(null);

    const newRoomId = activeRoomId || `room_fr_${Math.random().toString(36).substring(2, 8)}`;
    setActiveRoomId(newRoomId);

    if (gameClient.isConnected()) {
      gameClient.createMultiplayerRoom(
        currentUser.id,
        currentUser.displayName,
        gameType,
        rules,
        totalPlayers,
        newRoomId
      );
    }
  };

  const handleAddFriend = (username: string, aliasName: string) => {
    const cleanUsername = username.replace('@', '').trim();
    const onlineMatch = onlineUsers.find(
      (u) =>
        u.username?.replace('@', '').toLowerCase() === cleanUsername.toLowerCase() ||
        u.displayName?.toLowerCase() === cleanUsername.toLowerCase()
    );

    const newFriend: FriendItem = {
      id: onlineMatch ? onlineMatch.id : `friend_${Date.now()}`,
      username: cleanUsername,
      displayName: aliasName || cleanUsername,
      ratingElo: onlineMatch ? onlineMatch.ratingElo : 1000,
      status: onlineMatch ? 'ONLINE' : 'OFFLINE',
    };

    setFriends((prev) => {
      const updated = [newFriend, ...prev.filter((f) => f.username.toLowerCase() !== cleanUsername.toLowerCase())];
      try {
        localStorage.setItem('choyxona_friends', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  const isBura = tableState && tableState.settings.gameType === 'BURA';
  const is6Cards = tableState?.settings.rules === 'SIX_CARDS';
  const availableCombinations =
    isBura
      ? detectSpecialCombinations(
          hand,
          tableState.trumpSuit,
          currentUser.id,
          is6Cards,
          tableState.settings.rules as any
        )
      : [];

  const bgTheme = APP_BACKGROUNDS[currentBgId] || APP_BACKGROUNDS.choyxona_night;

  return (
    <div className={`w-screen h-screen flex flex-col text-white overflow-hidden select-none ${bgTheme.backgroundClass}`}>
      {actionError && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[110] max-w-[90%] px-4 py-2 rounded-2xl bg-rose-950/95 border border-rose-500 text-rose-100 text-xs font-bold shadow-2xl text-center">
          {actionError}
        </div>
      )}

      {infoNotice && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[110] max-w-[90%] px-4 py-2 rounded-2xl bg-emerald-950/95 border border-emerald-500 text-emerald-100 text-xs font-bold shadow-2xl text-center">
          {infoNotice}
        </div>
      )}

      {/* KELGAN TAKLIFNOMA POPUP */}
      <InvitationToast
        invitation={incomingInvitation}
        onAccept={(inv) => {
          if (gameClient.isConnected()) {
            gameClient.joinRoom(inv.roomId, currentUser.id, currentUser.displayName);
            setActiveRoomId(inv.roomId);
            setView('GAME');
          }
          setIncomingInvitation(null);
        }}
        onDecline={() => setIncomingInvitation(null)}
      />

      {view === 'LOBBY' ? (
        <LobbyView
          profile={currentUser}
          isNightMode={currentBgId === 'choyxona_night' || currentBgId === 'modern_studio'}
          onStartGame={handleStartGame}
          onOpenFriendsTable={handleOpenFriendsTable}
          onOpenProfile={() => setIsProfileOpen(true)}
          onOpenFriends={() => setIsFriendsOpen(true)}
          onOpenClans={() => setIsClansOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenLeaderboard={handleOpenLeaderboard}
          onOpenTheme={() => setIsThemeOpen(true)}
          onOpenAuth={() => {
            setAuthPromptMessage(undefined);
            setIsAuthOpen(true);
          }}
        />
      ) : (
        tableState && (
          <XontaxtaView
            tableState={tableState}
            hand={hand}
            currentUserId={currentUser.id}
            chatMessages={chatMessages}
            currentThemeId={currentThemeId}
            currentBgId={currentBgId}
            currentCardBackId={currentCardBackId}
            onPlayAction={handlePlayAction}
            onSendChatMessage={handleSendChatMessage}
            onLeaveRoom={handleLeaveRoom}
            onSelectTheme={handleSelectTheme}
            onSelectBg={handleSelectBg}
            onSelectCardBack={handleSelectCardBack}
            onReadyNextRound={handleReadyNextRound}
            onStartWithBots={() => {
              if (tableState.roomId && gameClient.isConnected()) {
                gameClient.startRoomWithBots(tableState.roomId);
              }
            }}
            onOpenInviteFriends={() => setIsInviteFriendsOpen(true)}
            chatCooldown={chatCooldown}
            availableCombinations={availableCombinations}
            pendingPenaltyCount={pendingPenaltyCount}
          />
        )
      )}

      {/* DO'STLARNI TAKLIF QILISH VA ONLAYN STOL MODALI */}
      <InviteFriendsModal
        isOpen={isInviteFriendsOpen}
        onClose={() => setIsInviteFriendsOpen(false)}
        gameType={selectedInviteGame}
        rules={selectedInviteRules}
        playerCount={selectedInvitePlayerCount}
        currentUser={currentUser}
        currentUserId={currentUser.id}
        currentUserName={currentUser.displayName}
        friends={friends}
        onlineUsers={onlineUsers}
        activeRoomId={activeRoomId}
        tableState={tableState}
        inviteFeedback={inviteFeedback}
        onClearFeedback={() => setInviteFeedback(null)}
        onCreateRoom={() => {
          const newRoomId = activeRoomId || `room_fr_${Math.random().toString(36).substring(2, 8)}`;
          setActiveRoomId(newRoomId);
          if (gameClient.isConnected()) {
            gameClient.createMultiplayerRoom(
              currentUser.id,
              currentUser.displayName,
              selectedInviteGame,
              selectedInviteRules,
              selectedInvitePlayerCount,
              newRoomId
            );
          }
        }}
        onGoToTable={() => {
          setIsInviteFriendsOpen(false);
          setView('GAME');
        }}
        onStartWithBots={() => {
          if (activeRoomId && gameClient.isConnected()) {
            gameClient.startRoomWithBots(activeRoomId);
            setIsInviteFriendsOpen(false);
            setView('GAME');
          }
        }}
        onAddFriend={handleAddFriend}
        onInviteUser={(targetUserId, targetUsername) => {
          let roomIdToUse = activeRoomId;
          if (!roomIdToUse) {
            roomIdToUse = `room_fr_${Math.random().toString(36).substring(2, 8)}`;
            setActiveRoomId(roomIdToUse);
            if (gameClient.isConnected()) {
              gameClient.createMultiplayerRoom(
                currentUser.id,
                currentUser.displayName,
                selectedInviteGame,
                selectedInviteRules,
                selectedInvitePlayerCount,
                roomIdToUse
              );
            }
          }

          if (gameClient.isConnected() && roomIdToUse) {
            gameClient.inviteUser({
              targetUserId,
              targetUsername: targetUsername ? targetUsername.replace('@', '').trim() : undefined,
              roomId: roomIdToUse,
              roomSettings: {
                gameType: selectedInviteGame,
                rules: selectedInviteRules,
                maxPlayers: selectedInvitePlayerCount,
              },
              inviterName: currentUser.displayName,
              inviterId: currentUser.id,
            });
          }
        }}
      />

      {/* BOSHQA MODALLAR */}
      <ProfileDrawer
        profile={currentUser}
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />
      <FriendsDrawer
        friends={friends}
        isOpen={isFriendsOpen}
        onClose={() => setIsFriendsOpen(false)}
        onAddFriend={handleAddFriend}
      />
      <ClansDrawer
        isOpen={isClansOpen}
        onClose={() => setIsClansOpen(false)}
      />
      <SettingsModal
        profile={currentUser}
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onOpenAuth={() => {
          setAuthPromptMessage(undefined);
          setIsAuthOpen(true);
        }}
      />
      <LeaderboardModal
        isOpen={isLeaderboardOpen}
        onClose={() => setIsLeaderboardOpen(false)}
        players={leaderboard}
        currentUserId={currentUser.id}
      />
      <ThemeSelectorModal
        currentThemeId={currentThemeId}
        currentBgId={currentBgId}
        currentCardBackId={currentCardBackId}
        isOpen={isThemeOpen}
        onClose={() => setIsThemeOpen(false)}
        onSelectTheme={handleSelectTheme}
        onSelectBg={handleSelectBg}
        onSelectCardBack={handleSelectCardBack}
      />
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => {
          setIsAuthOpen(false);
          setAuthPromptMessage(undefined);
        }}
        onSuccess={handleAuthSuccess}
        initialName={currentUser.displayName}
        promptMessage={authPromptMessage}
      />
    </div>
  );
}
