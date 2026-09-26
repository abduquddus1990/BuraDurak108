import { GameType, GameRules, RoomOptions } from '../../../shared/src/types/game';

export type MessageHandler = (data: any) => void;

export class GameClient {
  private ws: WebSocket | null = null;
  private messageHandlers: Set<MessageHandler> = new Set();
  private reconnectHandlers: Set<() => void> = new Set();
  private url: string = '';
  private hasConnectedOnce = false;
  private reconnectDelayMs = 1000;
  private reconnectTimer?: ReturnType<typeof setTimeout>;
  private pendingConnect?: Promise<boolean>;
  private statusHandlers: Set<(status: 'connected' | 'reconnecting') => void> = new Set();

  public connect(url: string = 'ws://localhost:3001'): Promise<boolean> {
    this.url = url;
    // React StrictMode effektni ikki marta chaqiradi - ikkinchi (ortiqcha) socket ochilmasligi uchun
    if (this.ws && this.ws.readyState === WebSocket.OPEN) return Promise.resolve(true);
    if (this.ws && this.ws.readyState === WebSocket.CONNECTING && this.pendingConnect) return this.pendingConnect;
    this.pendingConnect = new Promise((resolve) => {
      try {
        this.ws = new WebSocket(url);

        this.ws.onopen = () => {
          console.log('🟢 WebSocket ulandi');
          const isReconnect = this.hasConnectedOnce;
          this.hasConnectedOnce = true;
          this.reconnectDelayMs = 1000;
          resolve(true);
          for (const handler of this.statusHandlers) handler('connected');
          if (isReconnect) {
            for (const handler of this.reconnectHandlers) handler();
          }
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            for (const handler of this.messageHandlers) {
              handler(data);
            }
          } catch (e) {
            console.error('WS parse error:', e);
          }
        };

        this.ws.onerror = (err) => {
          console.warn('WS error (server offline bo\'lishi mumkin):', err);
          resolve(false);
        };

        this.ws.onclose = () => {
          console.log('🔴 WebSocket uzildi');
          resolve(false);
          // Faqat avval muvaffaqiyatli ulangan bo'lsak qayta ulanamiz (server umuman yo'q bo'lsa - lokal rejim)
          if (this.hasConnectedOnce) {
            for (const handler of this.statusHandlers) handler('reconnecting');
            this.scheduleReconnect();
          }
        };
      } catch (e) {
        resolve(false);
      }
    });
    return this.pendingConnect;
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = undefined;
      this.connect(this.url);
    }, this.reconnectDelayMs);
    this.reconnectDelayMs = Math.min(this.reconnectDelayMs * 2, 15000);
  }

  public onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  // Aloqa uzilib qayta tiklanganda chaqiriladi (foydalanuvchini qayta ro'yxatdan o'tkazish va stolga qaytarish uchun)
  public onReconnect(handler: () => void): () => void {
    this.reconnectHandlers.add(handler);
    return () => this.reconnectHandlers.delete(handler);
  }

  public send(type: string, payload: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, payload }));
    }
  }

  public createBotRoom(
    playerId: string,
    playerName: string,
    gameType: GameType,
    rules: GameRules,
    totalPlayers: number,
    options?: RoomOptions
  ): void {
    this.send('CREATE_BOT_ROOM', {
      playerId,
      playerName,
      gameType,
      rules,
      totalPlayers,
      options,
    });
  }

  public joinRoom(roomId: string, playerId: string, playerName: string): void {
    this.send('JOIN_ROOM', {
      roomId,
      playerId,
      playerName,
    });
  }

  public sendGameAction(action: string, payload: any = {}): void {
    this.send('GAME_ACTION', {
      action,
      ...payload,
    });
  }

  public sendChatMessage(text: string, senderName: string, isQuickPhrase: boolean = false): void {
    this.send('SEND_CHAT', {
      text,
      senderName,
      isQuickPhrase,
    });
  }

  // Server SESSION xabari bilan javob beradi (haqiqiy ID, profil va mehmon tokeni)
  public registerUser(credentials: {
    initData?: string;
    guestId?: string;
    guestToken?: string;
    displayName?: string;
  }): void {
    this.send('REGISTER_USER', credentials);
  }

  // Aloqa holati (interfeysda "qayta ulanmoqda" banneri uchun)
  public onStatus(handler: (status: 'connected' | 'reconnecting') => void): () => void {
    this.statusHandlers.add(handler);
    return () => this.statusHandlers.delete(handler);
  }

  public requestHint(): void {
    this.send('GET_HINT', {});
  }

  public setDisplayName(displayName: string): void {
    this.send('SET_DISPLAY_NAME', { displayName });
  }

  public getLeaderboard(): void {
    this.send('GET_LEADERBOARD', {});
  }

  public getOnlineUsers(): void {
    this.send('GET_ONLINE_USERS', {});
  }

  public createMultiplayerRoom(
    playerId: string,
    playerName: string,
    gameType: GameType,
    rules: GameRules,
    totalPlayers: number,
    roomId?: string,
    setup?: { options: RoomOptions; turnSeconds: number }
  ): void {
    this.send('CREATE_MULTIPLAYER_ROOM', {
      playerId,
      playerName,
      gameType,
      rules,
      totalPlayers,
      roomId,
      options: setup ? { ...setup.options, turnSeconds: setup.turnSeconds } : undefined,
    });
  }

  // Tez o'yin navbati
  public quickMatchJoin(gameType: GameType, rules: GameRules, totalPlayers: number): void {
    this.send('QUICK_MATCH_JOIN', { gameType, rules, totalPlayers });
  }

  public quickMatchLeave(): void {
    this.send('QUICK_MATCH_LEAVE', {});
  }

  public startRoomWithBots(roomId?: string): void {
    this.send('START_ROOM_WITH_BOTS', { roomId });
  }

  public leaveRoom(): void {
    this.send('LEAVE_ROOM', {});
  }

  public inviteUser(options: {
    targetUserId?: string;
    targetUsername?: string;
    roomId: string;
    roomSettings: any;
    inviterName: string;
    inviterId: string;
  }): void {
    this.send('INVITE_USER', options);
  }

  public isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

export const gameClient = new GameClient();
