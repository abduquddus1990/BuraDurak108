import { GameRules, GameType } from '../../../shared/src/types/game';

export interface QueueEntry {
  playerId: string;
  elo: number;
  gameType: GameType;
  rules: GameRules;
  totalPlayers: number;
  joinedAt: number;
}

export interface QueueStatus {
  waiting: number; // shu turdagi o'yinni kutayotganlar
  needed: number; // stol uchun kerakli o'yinchilar
  waitedMs: number;
  botFillInMs: number; // qancha vaqtdan so'ng botlar qo'shiladi
}

const keyOf = (e: Pick<QueueEntry, 'gameType' | 'rules' | 'totalPlayers'>) => `${e.gameType}|${e.rules}|${e.totalPlayers}`;

// ELO oralig'i: dastlab ±200, har soniya kutishda +50 (uzoq kutgan o'yinchi kengroq tanlovga ega bo'ladi)
const eloWindow = (waitedMs: number) => 200 + 50 * Math.floor(waitedMs / 1000);

/**
 * Tez o'yin navbati: bir xil o'yin turi/qoida/o'yinchi sonini tanlaganlarni ELO bo'yicha yaqinlarini juftlaydi.
 * Yetarli odam topilmasa, eng uzoq kutgan o'yinchi botFillAfterMs dan keyin mavjud odamlar + botlar bilan o'ynaydi.
 */
export class Matchmaker {
  private queue: QueueEntry[] = [];

  constructor(
    // fillWithBots=true - stol odamlar bilan to'lmadi, qolgan o'rinlarga bot qo'shiladi
    private onMatch: (entries: QueueEntry[], fillWithBots: boolean) => void,
    private onQueueChanged: (entries: QueueEntry[]) => void = () => {},
    private botFillAfterMs: number = 30000,
    autoTick: boolean = true
  ) {
    if (autoTick) setInterval(() => this.tick(), 2000).unref();
  }

  public join(entry: Omit<QueueEntry, 'joinedAt'>, now: number = Date.now()): void {
    this.leave(entry.playerId, false);
    const full: QueueEntry = { ...entry, joinedAt: now };
    this.queue.push(full);
    if (!this.tryMatch(keyOf(full), now)) this.notify(keyOf(full));
  }

  public leave(playerId: string, notify: boolean = true): void {
    const entry = this.queue.find(e => e.playerId === playerId);
    if (!entry) return;
    this.queue = this.queue.filter(e => e.playerId !== playerId);
    if (notify) this.notify(keyOf(entry));
  }

  public isQueued(playerId: string): boolean {
    return this.queue.some(e => e.playerId === playerId);
  }

  public statusFor(playerId: string, now: number = Date.now()): QueueStatus | null {
    const entry = this.queue.find(e => e.playerId === playerId);
    if (!entry) return null;
    const sameKey = this.queue.filter(e => keyOf(e) === keyOf(entry));
    const oldest = Math.min(...sameKey.map(e => e.joinedAt));
    return {
      waiting: sameKey.length,
      needed: entry.totalPlayers,
      waitedMs: now - entry.joinedAt,
      botFillInMs: Math.max(0, this.botFillAfterMs - (now - oldest)),
    };
  }

  public tick(now: number = Date.now()): void {
    const keys = new Set(this.queue.map(keyOf));
    for (const key of keys) {
      if (this.tryMatch(key, now)) continue;
      const entries = this.entriesFor(key);
      const oldest = entries[0];
      if (oldest && now - oldest.joinedAt >= this.botFillAfterMs) {
        // Uzoq kutildi: bor odamlar (ELO dan qat'i nazar) + botlar
        const group = entries.slice(0, oldest.totalPlayers);
        this.remove(group);
        this.onMatch(group, group.length < oldest.totalPlayers);
      }
    }
  }

  private entriesFor(key: string): QueueEntry[] {
    return this.queue.filter(e => keyOf(e) === key).sort((a, b) => a.joinedAt - b.joinedAt);
  }

  private tryMatch(key: string, now: number): boolean {
    const entries = this.entriesFor(key);
    const anchor = entries[0];
    if (!anchor) return false;
    const window = eloWindow(now - anchor.joinedAt);
    const group = entries.filter(e => Math.abs(e.elo - anchor.elo) <= window).slice(0, anchor.totalPlayers);
    if (group.length < anchor.totalPlayers) return false;
    this.remove(group);
    this.onMatch(group, false);
    this.notify(key);
    return true;
  }

  private remove(group: QueueEntry[]): void {
    const ids = new Set(group.map(e => e.playerId));
    this.queue = this.queue.filter(e => !ids.has(e.playerId));
  }

  private notify(key: string): void {
    this.onQueueChanged(this.entriesFor(key));
  }
}
