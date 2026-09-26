import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { GameType } from '../../../shared/src/types/game';

export interface StoredUser {
  id: string;
  telegramId?: number;
  username: string;
  displayName: string;
  avatarUrl?: string;
  ratingElo: number;
  gamesPlayed: number;
  gamesWon: number;
  createdAt: number;
  lastSeenAt: number;
}

export interface GameResultInput {
  gameType: GameType;
  // Faqat odamlar (botlar reytingga kirmaydi)
  humanPlayerIds: string[];
  winners: string[];
  losers: string[];
  // Kamida 2 ta odam o'ynagan bo'lsa ELO o'zgaradi; botlar bilan o'yinda faqat statistika yoziladi
  rated: boolean;
}

interface StoreFile {
  version: 1;
  secret: string;
  users: Record<string, StoredUser>;
}

export const DEFAULT_ELO = 1000;
const ELO_K = 32;
const SAVE_DEBOUNCE_MS = 1000;

/**
 * Oddiy JSON-fayl ombori: tashqi paketsiz, istalgan hostingda ishlaydi.
 * Foydalanuvchilar ko'payganda shu interfeysni saqlagan holda SQLite/PostgreSQL ga almashtirish mumkin.
 */
export class UserStore {
  private data: StoreFile;
  private saveTimer?: NodeJS.Timeout;

  constructor(private filePath: string | null) {
    this.data = this.load();
  }

  private load(): StoreFile {
    if (this.filePath && fs.existsSync(this.filePath)) {
      try {
        const parsed = JSON.parse(fs.readFileSync(this.filePath, 'utf-8'));
        if (parsed && parsed.version === 1 && parsed.users && parsed.secret) return parsed;
      } catch (e: any) {
        // Buzilgan faylni o'chirib yubormaslik uchun zaxira nusxasini qoldiramiz
        const backup = `${this.filePath}.corrupt-${Date.now()}`;
        fs.copyFileSync(this.filePath, backup);
        console.error(`⚠️ [UserStore] Fayl o'qilmadi (${e.message}), nusxasi: ${backup}`);
      }
    }
    return { version: 1, secret: crypto.randomBytes(32).toString('hex'), users: {} };
  }

  // Server-tomonli maxfiy kalit (mehmon tokenlarini imzolash uchun). Faylda saqlanadi - qayta ishga tushganda o'zgarmaydi.
  public get secret(): string {
    return this.data.secret;
  }

  public get(id: string): StoredUser | undefined {
    return this.data.users[id];
  }

  public upsert(id: string, fields: { telegramId?: number; username: string; displayName: string; avatarUrl?: string }): StoredUser {
    const now = Date.now();
    const existing = this.data.users[id];
    const user: StoredUser = existing
      ? { ...existing, telegramId: fields.telegramId ?? existing.telegramId, username: fields.username, avatarUrl: fields.avatarUrl ?? existing.avatarUrl, lastSeenAt: now }
      : {
          id,
          telegramId: fields.telegramId,
          username: fields.username,
          displayName: fields.displayName,
          avatarUrl: fields.avatarUrl,
          ratingElo: DEFAULT_ELO,
          gamesPlayed: 0,
          gamesWon: 0,
          createdAt: now,
          lastSeenAt: now,
        };
    this.data.users[id] = user;
    this.scheduleSave();
    return user;
  }

  public setDisplayName(id: string, displayName: string): StoredUser | undefined {
    const user = this.data.users[id];
    if (!user) return undefined;
    user.displayName = displayName;
    this.scheduleSave();
    return user;
  }

  public recordGameResult(result: GameResultInput): Map<string, number> {
    const deltas = result.rated ? computeEloDeltas(result.winners, result.losers, id => this.data.users[id]?.ratingElo ?? DEFAULT_ELO) : new Map<string, number>();
    const winners = new Set(result.winners);
    for (const id of result.humanPlayerIds) {
      const user = this.data.users[id];
      if (!user) continue;
      user.gamesPlayed++;
      if (winners.has(id)) user.gamesWon++;
      user.ratingElo = Math.max(100, user.ratingElo + (deltas.get(id) || 0));
    }
    this.scheduleSave();
    return deltas;
  }

  public leaderboard(limit: number = 30): StoredUser[] {
    return Object.values(this.data.users)
      .filter(u => u.gamesPlayed > 0)
      .sort((a, b) => b.ratingElo - a.ratingElo || b.gamesWon - a.gamesWon)
      .slice(0, limit);
  }

  private scheduleSave(): void {
    if (!this.filePath || this.saveTimer) return;
    this.saveTimer = setTimeout(() => {
      this.saveTimer = undefined;
      this.flush();
    }, SAVE_DEBOUNCE_MS);
  }

  // Atomar yozish: avval vaqtinchalik faylga, keyin nomini almashtirish (yozish paytida uzilsa fayl buzilmaydi)
  public flush(): void {
    if (!this.filePath) return;
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = undefined;
    }
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    const tmp = `${this.filePath}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(this.data));
    fs.renameSync(tmp, this.filePath);
  }
}

/**
 * Ko'p o'yinchili ELO: har bir g'olib har bir yutqazganga qarshi alohida juftlik sifatida hisoblanadi.
 * K koeffitsiyenti (o'yinchilar soni - 1) ga bo'linadi: har bir juftlikda bir tomon olgan ball
 * ikkinchi tomon yo'qotganiga teng, shuning uchun umumiy reyting "shishib" ketmaydi.
 */
export function computeEloDeltas(winners: string[], losers: string[], ratingOf: (id: string) => number): Map<string, number> {
  const deltas = new Map<string, number>();
  const add = (id: string, value: number) => deltas.set(id, (deltas.get(id) || 0) + value);
  const participants = new Set([...winners, ...losers]).size;
  if (participants < 2) return deltas;
  const k = ELO_K / (participants - 1);
  for (const w of winners) {
    for (const l of losers) {
      if (w === l) continue;
      const expectedW = 1 / (1 + Math.pow(10, (ratingOf(l) - ratingOf(w)) / 400));
      add(w, k * (1 - expectedW));
      add(l, -k * (1 - expectedW));
    }
  }
  for (const [id, value] of deltas) deltas.set(id, Math.round(value));
  return deltas;
}
