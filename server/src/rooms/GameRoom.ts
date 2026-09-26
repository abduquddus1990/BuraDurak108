import { BaseEngine } from '../engine/BaseEngine';
import { BuraEngine } from '../engine/BuraEngine';
import { OneHundredEightEngine } from '../engine/OneHundredEightEngine';
import { DurakEngine } from '../engine/DurakEngine';
import { BotAI } from '../ai/BotAI';
import { RoomSettings } from '../../../shared/src/types/game';
import { Card } from '../../../shared/src/types/card';
import { ChatManager } from '../chat/ChatManager';

export type SocketSender = (data: any) => void;

type ActionResult = { success: boolean; message: string; trickCompleted?: boolean };

// Kartalar hamma ko'rishi uchun vzyatka shuncha kutib turadi
const TRICK_RESOLVE_DELAY_MS = 1800;
// Bot (yoki uzilgan o'yinchi o'rniga avtomatik yurish) o'ylash vaqti
const BOT_THINK_DELAY_MS = 1500;
// Raund xulosasida "Keyingi qo'l" bosilmasa, shuncha vaqtdan keyin hamma tayyor deb hisoblanadi
const READY_TIMEOUT_MS = 30 * 1000;

export class GameRoom {
  public id: string;
  public settings: RoomSettings;
  public engine: BaseEngine;
  public clients: Map<string, SocketSender> = new Map(); // playerId -> sender function
  public chatManager: ChatManager;
  // Stolda birorta ham ulangan odam qolmagan vaqt (xonani tozalash uchun)
  public emptySince: number | null = null;
  private botTimer?: NodeJS.Timeout;
  private trickTimer?: NodeJS.Timeout;
  private disposed = false;
  // Navbat taymeri: javob bermayotgan (lekin ulangan) odam stolni cheksiz ushlab turmasligi uchun
  private turnTimer?: NodeJS.Timeout;
  private turnDeadline: number | null = null;
  private turnKey = '';
  // O'yin tugaganda bir marta chaqiriladi (reyting va statistika uchun)
  public onGameOver?: (room: GameRoom) => void;
  private resultRecorded = false;
  // O'yin tugagach "Yana bir partiya" deganlar
  private rematchVotes = new Set<string>();

  constructor(id: string, settings: RoomSettings, chatManager: ChatManager) {
    this.id = id;
    this.settings = settings;
    this.chatManager = chatManager;

    if (settings.gameType === 'BURA') {
      this.engine = new BuraEngine(id, settings);
    } else if (settings.gameType === 'ONE_HUNDRED_EIGHT') {
      this.engine = new OneHundredEightEngine(id, settings);
    } else {
      this.engine = new DurakEngine(id, settings);
    }
  }

  public addPlayer(id: string, username: string, isBot: boolean = false, sender?: SocketSender, avatarUrl?: string): boolean {
    const existingIndex = this.engine.players.findIndex(p => p.id === id);
    if (existingIndex !== -1) {
      // Qayta ulanish: o'yinchi o'z o'rniga qaytadi
      if (sender) {
        this.clients.set(id, sender);
        this.emptySince = null;
        this.broadcastState();
        this.triggerBotTurnIfNeeded();
      }
      return true;
    }

    const success = this.engine.status === 'WAITING' && this.engine.addPlayer({
      id,
      username,
      isBot,
      avatarUrl,
    });
    if (success && sender) {
      this.clients.set(id, sender);
      this.emptySince = null;
    }

    if (success) {
      if (this.engine.players.length >= this.settings.maxPlayers && this.engine.status === 'WAITING') {
        this.startGame();
      } else {
        this.broadcastState();
      }
    }

    return success;
  }

  public fillRemainingWithBots(): boolean {
    if (this.engine.status !== 'WAITING') return false;
    const botNames = ['Bot Alisher', 'Bot Rustam', 'Bot Shavkat', 'Bot Sardor', 'Bot Bekzod'];
    const needed = this.settings.maxPlayers - this.engine.players.length;
    for (let i = 0; i < needed; i++) {
      const botId = `bot_${Date.now()}_${i + 1}`;
      this.engine.addPlayer({
        id: botId,
        username: botNames[i % botNames.length],
        isBot: true,
      });
    }
    this.startGame();
    return true;
  }

  // sender berilsa, faqat o'sha ulanish hali ham shu o'yinchiga tegishli bo'lsa o'chiriladi
  // (o'yinchi yangi oynadan qayta ulangan bo'lsa, eski socket yopilishi uni stoldan chiqarib yubormasligi uchun)
  public removePlayer(playerId: string, sender?: SocketSender): void {
    if (sender && this.clients.get(playerId) !== sender) return;
    this.clients.delete(playerId);
    if (this.clients.size === 0 && this.emptySince === null) {
      this.emptySince = Date.now();
    }
    const index = this.engine.players.findIndex(p => p.id === playerId);
    if (index !== -1 && this.engine.status === 'WAITING') {
      this.engine.players.splice(index, 1);
    }
    this.broadcastState();
    // O'yin davom etayotgan bo'lsa, chiqib ketgan o'yinchi o'rniga avtomatik yuriladi
    this.triggerBotTurnIfNeeded();
  }

  public dispose(): void {
    this.disposed = true;
    if (this.botTimer) clearTimeout(this.botTimer);
    if (this.trickTimer) clearTimeout(this.trickTimer);
    if (this.turnTimer) clearTimeout(this.turnTimer);
    this.clients.clear();
  }

  public startGame(): void {
    this.engine.initGame();
    this.broadcastState();
    this.triggerBotTurnIfNeeded();
  }

  public broadcastState(): void {
    this.updateTurnTimer();

    if (this.engine.status === 'GAME_OVER' && !this.resultRecorded) {
      this.resultRecorded = true;
      try {
        this.onGameOver?.(this);
      } catch (e: any) {
        console.error(`[GameRoom ${this.id}] Natijani saqlashda xato:`, e.message);
      }
    }

    const baseState = this.engine.getTableState();
    const tableState = {
      ...baseState,
      players: baseState.players.map(p => ({ ...p, isConnected: p.isBot || this.clients.has(p.id) })),
      turnRemainingMs: this.turnDeadline !== null ? Math.max(0, this.turnDeadline - Date.now()) : undefined,
      rematchVotes: this.engine.status === 'GAME_OVER' ? Array.from(this.rematchVotes) : undefined,
    };
    for (const [playerId, sender] of this.clients.entries()) {
      const privateHand = this.engine.getPlayerHand(playerId);
      sender({
        type: 'TABLE_UPDATE',
        tableState,
        hand: privateHand,
      });
    }
  }

  // Klient yuborgan karta obyektlariga ishonib bo'lmaydi (suit/rank ni soxtalashtirish mumkin).
  // Shuning uchun faqat id olinadi va karta serverdagi qo'ldan olinadi.
  private resolveCard(playerId: string, raw: any): Card {
    const id = typeof raw?.id === 'string' ? raw.id : '';
    const real = this.engine.getPlayerHand(playerId).find(c => c.id === id);
    // Topilmasa, qo'lda yo'q deb rad etiladigan "bo'sh" karta qaytariladi
    return real || { id: `__invalid__${id}`, suit: 'SPADES', rank: '6' };
  }

  private resolveCards(playerId: string, raw: any): Card[] {
    return Array.isArray(raw) ? raw.map(c => this.resolveCard(playerId, c)) : [];
  }

  public handlePlayerAction(playerId: string, action: string, payload: any): { success: boolean; message: string } {
    payload = payload || {};
    let result: ActionResult = { success: false, message: "Noma'lum harakat" };

    if (action === 'READY_NEXT_ROUND') {
      return this.markReady(playerId);
    }
    if (action === 'REMATCH') {
      return this.requestRematch(playerId);
    }

    if (this.engine instanceof BuraEngine) {
      if (action === 'DECLARE_COMBINATION') {
        result = this.engine.declareCombination(playerId, String(payload.type));
      } else if (action === 'PLAY_CARDS') {
        result = this.engine.playCards(playerId, this.resolveCards(playerId, payload.cards));
      } else if (action === 'FOLD') {
        result = this.engine.foldOrPass(playerId, this.resolveCards(playerId, payload.cards));
      }
    } else if (this.engine instanceof OneHundredEightEngine) {
      if (action === 'PLAY_CARD') {
        result = this.engine.playCard(playerId, this.resolveCard(playerId, payload.card), payload.chosenSuit);
      } else if (action === 'DRAW_CARD') {
        result = this.engine.drawCard(playerId);
      } else if (action === 'PASS') {
        result = this.engine.pass(playerId);
      }
    } else if (this.engine instanceof DurakEngine) {
      if (action === 'ATTACK') {
        result = this.engine.attack(playerId, this.resolveCard(playerId, payload.card));
      } else if (action === 'DEFEND') {
        result = this.engine.defend(playerId, String(payload.targetCardId), this.resolveCard(playerId, payload.card));
      } else if (action === 'TRANSFER') {
        result = this.engine.transferAttack(playerId, this.resolveCard(playerId, payload.card));
      } else if (action === 'TAKE') {
        result = this.engine.takeCards(playerId);
      } else if (action === 'PASS') {
        result = this.engine.passOrBita(playerId);
      }
    }

    if (result.success) {
      this.afterMove(result);
    }

    return result;
  }

  // Maslahat: bot qanday yurgan bo'lardi. Faqat bot bilan o'yinda (reytingli o'yinda adolatsiz bo'lardi)
  public getHint(playerId: string): { success: boolean; message: string; cardIds?: string[] } {
    const humans = this.engine.players.filter(p => !p.isBot).length;
    if (humans > 1) return { success: false, message: "Maslahat faqat botlar bilan o'yinda ishlaydi" };
    if (this.engine.status !== 'PLAYING') return { success: false, message: "O'yin hozir faol emas" };
    const me = this.engine.players[this.engine.activePlayerIndex];
    if (!me || me.id !== playerId) return { success: false, message: 'Navbatingizni kuting' };

    if (this.engine instanceof BuraEngine) {
      const move = BotAI.makeBuraMove(this.engine, playerId);
      if (move.action === 'DECLARE') return { success: true, message: `💡 Kombinatsiyani oching: ${move.type}!` };
      if (move.action === 'FOLD') {
        const cards = move.cards && move.cards.length > 0 ? move.cards : this.engine.getCheapestCards(me.hand, this.engine.lastLeadCards.length);
        return { success: true, message: "💡 Ura olmaysiz - eng arzon kartalarni tashlang", cardIds: cards.map(c => c.id) };
      }
      const cards = move.cards || [];
      const text = this.engine.tableCards.length === 0 ? '💡 Shu karta(lar) bilan yuring' : '💡 Shu karta(lar) bilan uring';
      return { success: true, message: text, cardIds: cards.map(c => c.id) };
    }
    if (this.engine instanceof OneHundredEightEngine) {
      const move = BotAI.make108Move(this.engine, playerId);
      if (move.action === 'PLAY' && move.card) return { success: true, message: '💡 Shu kartani tashlang', cardIds: [move.card.id] };
      return { success: true, message: this.engine.pendingPenaltyCards > 0 ? '💡 Jarima kartalarini oling' : "💡 Mos karta yo'q - bozordan oling" };
    }
    if (this.engine instanceof DurakEngine) {
      const move = BotAI.makeDurakMove(this.engine, playerId);
      if ((move.action === 'ATTACK' || move.action === 'DEFEND') && move.card) {
        return { success: true, message: move.action === 'ATTACK' ? '💡 Shu karta bilan yuring' : '💡 Shu karta bilan uring', cardIds: [move.card.id] };
      }
      return { success: true, message: move.action === 'TAKE' ? '💡 Ura olmaysiz - kartalarni oling' : '💡 "Bita" deng' };
    }
    return { success: false, message: "Maslahat yo'q" };
  }

  // "Yana bir partiya": stolda ulangan barcha odamlar rozi bo'lgach, xuddi shu tarkib bilan yangi partiya boshlanadi
  public requestRematch(playerId: string): { success: boolean; message: string } {
    if (this.engine.status !== 'GAME_OVER') return { success: false, message: "Partiya hali tugamagan" };
    if (!this.engine.players.some(p => p.id === playerId)) return { success: false, message: "Siz bu stolda o'ynamagansiz" };
    this.rematchVotes.add(playerId);

    const waitingFor = this.engine.players.filter(p => !p.isBot && this.clients.has(p.id) && !this.rematchVotes.has(p.id));
    if (waitingFor.length === 0) {
      this.rematchVotes.clear();
      this.resultRecorded = false;
      this.turnKey = '';
      this.startGame();
      return { success: true, message: 'Yangi partiya boshlandi!' };
    }
    this.broadcastState();
    return { success: true, message: `Boshqalar kutilmoqda (${waitingFor.length})` };
  }

  private markReady(playerId: string): { success: boolean; message: string } {
    const engine = this.engine as any;
    if (typeof engine.playerReadyForNextRound !== 'function') {
      return { success: false, message: "Noma'lum harakat" };
    }
    const started = engine.playerReadyForNextRound(playerId);
    this.broadcastState();
    if (started) {
      this.triggerBotTurnIfNeeded();
    }
    return { success: true, message: 'Tayyorlik tasdiqlandi' };
  }

  private afterMove(_result: ActionResult): void {
    this.broadcastState();
    this.scheduleTrickResolveOrNextTurn();
  }

  // Vzyatka yakunlanganini qaytarilgan bayroqdan emas, dvijok holatidan aniqlaymiz: avtomatik
  // kombinatsiya (Molodka/41) yurishi ham vzyatkani yakunlashi mumkin va bu bayroq yo'qolib qolardi.
  private scheduleTrickResolveOrNextTurn(): void {
    if (this.engine instanceof BuraEngine && this.engine.isResolvingTrick) {
      if (this.trickTimer) clearTimeout(this.trickTimer);
      this.trickTimer = setTimeout(() => {
        if (this.disposed || !(this.engine instanceof BuraEngine)) return;
        this.engine.resolveTrick();
        this.broadcastState();
        this.scheduleTrickResolveOrNextTurn();
      }, TRICK_RESOLVE_DELAY_MS);
      return;
    }
    this.triggerBotTurnIfNeeded();
  }

  // Holat o'zgargandagina taymer qayta boshlanadi (masalan, boshqa o'yinchi qayta ulanganda vaqt uzaymaydi)
  private updateTurnTimer(): void {
    if (this.disposed) return;
    const engine = this.engine;
    const beatenCount = engine.tableCards.filter(tc => !!tc.beatenBy).length;
    const resolving = engine instanceof BuraEngine && engine.isResolvingTrick;
    const key = `${engine.status}|${engine.roundNumber}|${engine.activePlayerIndex}|${engine.tableCards.length}|${beatenCount}|${resolving}`;
    if (key === this.turnKey) return;
    this.turnKey = key;
    if (this.turnTimer) clearTimeout(this.turnTimer);
    this.turnTimer = undefined;
    this.turnDeadline = null;

    // Faqat kamida 2 ta odam o'ynaganda: bot bilan yolg'iz o'ynayotgan odamni shoshiltirish shart emas
    const humanCount = engine.players.filter(p => !p.isBot).length;
    if (humanCount < 2) return;

    if (engine.status === 'PLAYING' && !resolving) {
      const active = engine.players[engine.activePlayerIndex];
      // Bot va uzilgan odamlar uchun triggerBotTurnIfNeeded o'zi yuradi
      if (!active || this.isAutoPlayed(active.id)) return;
      const ms = Math.max(1, this.settings.turnTimeoutSeconds) * 1000;
      this.turnDeadline = Date.now() + ms;
      this.turnTimer = setTimeout(() => {
        if (this.disposed || this.turnKey !== key) return;
        console.log(`[GameRoom ${this.id}] ${active.username} vaqtida yurmadi - avtomatik yurish`);
        this.executeBotTurn(active.id);
      }, ms);
    } else if (engine.status === 'ROUND_OVER') {
      this.turnDeadline = Date.now() + READY_TIMEOUT_MS;
      this.turnTimer = setTimeout(() => {
        if (this.disposed || this.turnKey !== key) return;
        const summary = (this.engine as any).roundSummary;
        for (const r of summary?.results || []) {
          if (!r.readyForNext && !r.isEliminated) this.markReady(r.playerId);
        }
      }, READY_TIMEOUT_MS);
    }
  }

  // Bot yoki stoldan uzilgan odam - ikkalasi uchun ham server o'zi yuradi
  private isAutoPlayed(playerId: string): boolean {
    const player = this.engine.players.find(p => p.id === playerId);
    if (!player) return false;
    return player.isBot || !this.clients.has(playerId);
  }

  public triggerBotTurnIfNeeded(): void {
    if (this.disposed) return;

    // Raund tugaganda uzilgan odamlar ham "tayyor" deb belgilanadi, aks holda stol qotib qoladi
    if (this.engine.status === 'ROUND_OVER') {
      const summary = (this.engine as any).roundSummary;
      const waiting = summary?.results?.filter((r: any) => !r.readyForNext && this.isAutoPlayed(r.playerId)) || [];
      if (waiting.length > 0 && this.clients.size > 0) {
        for (const r of waiting) this.markReady(r.playerId);
      }
      return;
    }

    if (this.engine.status !== 'PLAYING') return;
    if (this.clients.size === 0) return; // Hech kim qaramayapti - o'yinni behuda yurgizmaymiz

    const activePlayer = this.engine.players[this.engine.activePlayerIndex];
    if (!activePlayer || !this.isAutoPlayed(activePlayer.id)) return;

    if (this.botTimer) clearTimeout(this.botTimer);

    // Bot 1.5 soniya o'ylab yuradi (insondek tabiiy va sekin ko'rinishi uchun)
    this.botTimer = setTimeout(() => {
      if (this.disposed) return;
      const current = this.engine.players[this.engine.activePlayerIndex];
      if (this.engine.status !== 'PLAYING' || !current || current.id !== activePlayer.id) return;
      this.executeBotTurn(activePlayer.id);
    }, BOT_THINK_DELAY_MS);
  }

  private executeBotTurn(botId: string): void {
    let moveResult: ActionResult = { success: false, message: '' };
    // Botlar stol sozlamasidagi darajada o'ynaydi; uzilgan/vaqti tugagan odam o'rniga esa standart darajada
    const isRealBot = !!this.engine.players.find(p => p.id === botId)?.isBot;
    const level = isRealBot ? this.settings.options?.botLevel || 'MEDIUM' : 'MEDIUM';

    if (this.engine instanceof BuraEngine) {
      const move = BotAI.makeBuraMove(this.engine, botId, level);
      if (move.action === 'DECLARE' && move.type) {
        moveResult = this.engine.declareCombination(botId, move.type);
      } else if (move.action === 'PLAY' && move.cards) {
        moveResult = this.engine.playCards(botId, move.cards);
      } else if (move.action === 'FOLD' && move.cards) {
        moveResult = this.engine.foldOrPass(botId, move.cards);
      }
      // Zaxira: bot noto'g'ri yurish tanlasa, eng arzon kartalarni tashlaydi (aks holda stol qotib qolardi)
      if (!moveResult.success) {
        moveResult = this.engine.foldOrPass(botId, []);
      }
    } else if (this.engine instanceof OneHundredEightEngine) {
      const move = BotAI.make108Move(this.engine, botId, level);
      if (move.action === 'PLAY' && move.card) {
        moveResult = this.engine.playCard(botId, move.card, move.chosenSuit);
      }
      if (!moveResult.success) {
        moveResult = this.engine.drawCard(botId);
      }
    } else if (this.engine instanceof DurakEngine) {
      const move = BotAI.makeDurakMove(this.engine, botId, level);
      if (move.action === 'ATTACK' && move.card) {
        moveResult = this.engine.attack(botId, move.card);
      } else if (move.action === 'DEFEND' && move.card && move.targetCardId) {
        moveResult = this.engine.defend(botId, move.targetCardId, move.card);
      } else if (move.action === 'TAKE') {
        moveResult = this.engine.takeCards(botId);
      } else {
        moveResult = this.engine.passOrBita(botId);
      }
      if (!moveResult.success) {
        const isDefender = this.engine.players[this.engine.defenderIndex]?.id === botId;
        moveResult = isDefender ? this.engine.takeCards(botId) : this.engine.passOrBita(botId);
      }
    }

    if (!moveResult.success) {
      // Hech qanday yurish o'tmadi - qayta-qayta urinib CPU ni band qilmaslik uchun to'xtaymiz
      console.warn(`[GameRoom ${this.id}] Avtomatik yurish muvaffaqiyatsiz (${botId}): ${moveResult.message}`);
      this.broadcastState();
      return;
    }

    this.afterMove(moveResult);
  }
}
