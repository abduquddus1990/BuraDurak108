import { GameRoom, SocketSender } from './GameRoom';
import { RoomSettings, GameType, GameRules } from '../../../shared/src/types/game';
import { ChatManager } from '../chat/ChatManager';

// Hech kim ulanmagan stol shuncha vaqtdan so'ng o'chiriladi (qayta ulanish uchun imkon qoldiriladi)
const EMPTY_ROOM_TTL_MS = 5 * 60 * 1000;
// Do'stlar bilan o'yinda bitta navbat uchun vaqt (soniya)
const MULTIPLAYER_TURN_SECONDS = 30;

export class RoomManager {
  private rooms: Map<string, GameRoom> = new Map();
  public chatManager: ChatManager = new ChatManager();

  constructor() {
    // Bo'sh stollarni davriy tozalash (aks holda xotira va bot taymerlari cheksiz o'sib boradi)
    setInterval(() => this.cleanupEmptyRooms(), 60 * 1000).unref();
  }

  public cleanupEmptyRooms(now: number = Date.now()): void {
    for (const [roomId, room] of this.rooms.entries()) {
      if (room.clients.size === 0 && room.emptySince !== null && now - room.emptySince >= EMPTY_ROOM_TTL_MS) {
        this.removeRoom(roomId);
      }
    }
  }

  // O'yin tugaganda chaqiriladi (server.ts reyting va statistikani yozadi)
  public onGameOver?: (room: GameRoom) => void;

  public createRoom(settings: RoomSettings): GameRoom {
    const room = new GameRoom(settings.id, settings, this.chatManager);
    room.onGameOver = (r) => this.onGameOver?.(r);
    this.rooms.set(settings.id, room);
    return room;
  }

  public getRoom(roomId: string): GameRoom | undefined {
    return this.rooms.get(roomId);
  }

  // Tezkor Bot xonasi yaratish (O'yinchi yolg'iz botlar bilan o'ynaganda)
  public createBotRoom(
    playerId: string,
    playerName: string,
    gameType: GameType,
    rules: GameRules,
    totalPlayers: number,
    sender: SocketSender,
    avatarUrl?: string
  ): GameRoom {
    const roomId = `room_bot_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const settings: RoomSettings = {
      id: roomId,
      gameType,
      rules,
      maxPlayers: totalPlayers,
      turnTimeoutSeconds: 15,
      isPrivate: true,
      deckType: '36',
    };

    const room = this.createRoom(settings);
    // 1-o'yinchi (haqiqiy odam)
    room.addPlayer(playerId, playerName, false, sender, avatarUrl);

    // Qolgan o'rinlarga botlarni qo'shish
    const botNames = ['Bot Alisher', 'Bot Rustam', 'Bot Shavkat', 'Bot Sardor', 'Bot Bekzod'];
    for (let i = 1; i < totalPlayers; i++) {
      const botId = `bot_${i}_${Date.now()}`;
      room.addPlayer(botId, botNames[(i - 1) % botNames.length], true);
    }

    // Oxirgi bot qo'shilganda stol to'lib, o'yin addPlayer ichida avtomatik boshlanadi
    return room;
  }

  // Do'stlar bilan o'ynash uchun ko'p kishilik (Multiplayer) xona ochish
  public createMultiplayerRoom(
    hostId: string,
    hostName: string,
    gameType: GameType,
    rules: GameRules,
    totalPlayers: number,
    sender: SocketSender,
    customRoomId?: string,
    avatarUrl?: string
  ): GameRoom {
    const roomId = customRoomId || `room_fr_${Math.random().toString(36).substring(2, 8)}`;
    const settings: RoomSettings = {
      id: roomId,
      gameType,
      rules,
      maxPlayers: totalPlayers,
      turnTimeoutSeconds: MULTIPLAYER_TURN_SECONDS,
      isPrivate: true,
      deckType: '36',
    };

    const room = this.createRoom(settings);
    // Mezbonni 1-o'yinchiga qo'shish
    room.addPlayer(hostId, hostName, false, sender, avatarUrl);
    return room;
  }

  public removeRoom(roomId: string): void {
    this.rooms.get(roomId)?.dispose();
    this.rooms.delete(roomId);
    this.chatManager.clearRoom(roomId);
  }
}
