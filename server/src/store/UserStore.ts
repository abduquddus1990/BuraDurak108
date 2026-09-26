import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { GameType } from '../../../shared/src/types/game';
import { ClanDetail, ClanItem } from '../../../shared/src/types/social';
import { AchievementId, findShopItem, weekKeyOf } from '../../../shared/src/types/progress';
import { ProgressFields, applyOutcome } from './progression';

export interface StoredUser extends ProgressFields {
  id: string;
  telegramId?: number;
  username: string;
  displayName: string;
  avatarUrl?: string;
  createdAt: number;
  lastSeenAt: number;
  clanId?: string;
  ownedItems?: string[];
  vipUntil?: number;
}

export interface StoredClan {
  id: string;
  name: string;
  tag: string;
  leaderId: string;
  members: string[];
  createdAt: number;
}

export interface GameResultInput {
  gameType: GameType;
  rules?: string;
  // Faqat odamlar (botlar reytingga kirmaydi)
  humanPlayerIds: string[];
  winners: string[];
  losers: string[];
  // Kamida 2 ta odam o'ynagan bo'lsa ELO o'zgaradi; botlar bilan o'yinda faqat statistika yoziladi
  rated: boolean;
  // Tarix uchun: stoldagi barcha o'yinchilar (botlar ham) ismlari
  playerNames?: Record<string, string>;
  // Yutuqlar uchun: o'yinchi -> partiya davomidagi hodisalar (MOSKVA, BURA, ...)
  eventsByPlayer?: Record<string, string[]>;
  now?: number;
}

export interface PlayerResultEffects {
  delta: number;
  newAchievements: AchievementId[];
  dailyJustCompleted: boolean;
}

interface StoreFile {
  version: 1;
  secret: string;
  users: Record<string, StoredUser>;
  clans?: Record<string, StoredClan>;
  // hafta (dushanba sanasi) -> mahalla -> ochko
  weeklyClanPoints?: Record<string, Record<string, number>>;
  // Telegram to'lovlari (bir to'lov ikki marta qo'llanmasligi uchun)
  payments?: Record<string, { userId: string; itemId: string; at: number }>;
}

export const DEFAULT_ELO = 1000;
const ELO_K = 32;
const SAVE_DEBOUNCE_MS = 1000;
export const CLAN_MAX_MEMBERS = 50;
const WEEKS_TO_KEEP = 8;

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

  public ratingFor(id: string, gameType: GameType): number {
    return this.data.users[id]?.ratings?.[gameType] ?? DEFAULT_ELO;
  }

  public isVip(id: string, now: number = Date.now()): boolean {
    const vipUntil = this.data.users[id]?.vipUntil;
    return !!vipUntil && vipUntil > now;
  }

  public recordGameResult(result: GameResultInput): Map<string, PlayerResultEffects> {
    const now = result.now ?? Date.now();
    const deltas = result.rated
      ? computeEloDeltas(result.winners, result.losers, id => this.ratingFor(id, result.gameType))
      : new Map<string, number>();
    const winners = new Set(result.winners);
    const losers = new Set(result.losers);
    const humans = new Set(result.humanPlayerIds);
    const names = result.playerNames || {};
    const effects = new Map<string, PlayerResultEffects>();
    const week = weekKeyOf(now);

    for (const id of result.humanPlayerIds) {
      const user = this.data.users[id];
      if (!user) continue;
      const delta = deltas.get(id) || 0;
      const won = winners.has(id);
      user.gamesPlayed++;
      if (won) user.gamesWon++;
      user.ratingElo = Math.max(100, user.ratingElo + delta);
      user.ratings = user.ratings || {};
      user.ratings[result.gameType] = Math.max(100, this.ratingFor(id, result.gameType) + delta);

      const opponents = Object.keys(names).filter(pid => pid !== id);
      const outcome = applyOutcome(
        user,
        {
          gameType: result.gameType,
          rules: result.rules || '',
          result: won ? 'WIN' : losers.has(id) ? 'LOSS' : 'DRAW',
          eloDelta: delta,
          opponents: opponents.map(pid => names[pid]),
          vsHumans: opponents.some(pid => humans.has(pid)),
          events: result.eventsByPlayer?.[id] || [],
        },
        now
      );
      effects.set(id, { delta, ...outcome });

      // Mahalla haftalik ligasi: odamga qarshi g'alaba 3, botga qarshi 1 ochko
      if (won && user.clanId && this.data.clans?.[user.clanId]) {
        const points = opponents.some(pid => humans.has(pid)) ? 3 : 1;
        this.data.weeklyClanPoints = this.data.weeklyClanPoints || {};
        const weekly = (this.data.weeklyClanPoints[week] = this.data.weeklyClanPoints[week] || {});
        weekly[user.clanId] = (weekly[user.clanId] || 0) + points;
      }
    }
    this.pruneOldWeeks(week);
    this.scheduleSave();
    return effects;
  }

  public leaderboard(limit: number = 30, gameType?: GameType): StoredUser[] {
    if (!gameType) {
      return Object.values(this.data.users)
        .filter(u => u.gamesPlayed > 0)
        .sort((a, b) => b.ratingElo - a.ratingElo || b.gamesWon - a.gamesWon)
        .slice(0, limit);
    }
    return Object.values(this.data.users)
      .filter(u => (u.statsByGame?.[gameType]?.played || 0) > 0)
      .sort((a, b) =>
        (b.ratings?.[gameType] ?? DEFAULT_ELO) - (a.ratings?.[gameType] ?? DEFAULT_ELO) ||
        (b.statsByGame?.[gameType]?.won || 0) - (a.statsByGame?.[gameType]?.won || 0)
      )
      .slice(0, limit);
  }

  // --- Mahallalar (klanlar) ---

  public getClan(clanId: string): StoredClan | undefined {
    return this.data.clans?.[clanId];
  }

  public createClan(userId: string, name: string, tag: string, now: number = Date.now()): { clan?: StoredClan; error?: string } {
    const user = this.data.users[userId];
    if (!user) return { error: 'Foydalanuvchi topilmadi' };
    if (user.clanId && this.getClan(user.clanId)) return { error: "Siz allaqachon mahalladasiz - avval undan chiqing" };
    const clans = (this.data.clans = this.data.clans || {});
    const lowerName = name.toLowerCase();
    if (Object.values(clans).some(c => c.tag === tag || c.name.toLowerCase() === lowerName)) {
      return { error: 'Bunday nom yoki teg band' };
    }
    const clan: StoredClan = { id: `clan_${crypto.randomBytes(5).toString('hex')}`, name, tag, leaderId: userId, members: [userId], createdAt: now };
    clans[clan.id] = clan;
    user.clanId = clan.id;
    this.scheduleSave();
    return { clan };
  }

  public joinClan(userId: string, clanId: string): { clan?: StoredClan; error?: string } {
    const user = this.data.users[userId];
    const clan = this.getClan(clanId);
    if (!user || !clan) return { error: 'Mahalla topilmadi' };
    if (user.clanId === clanId) return { clan };
    if (user.clanId && this.getClan(user.clanId)) return { error: "Siz allaqachon mahalladasiz - avval undan chiqing" };
    if (clan.members.length >= CLAN_MAX_MEMBERS) return { error: `Mahalla to'lgan (${CLAN_MAX_MEMBERS} kishi)` };
    clan.members.push(userId);
    user.clanId = clanId;
    this.scheduleSave();
    return { clan };
  }

  public leaveClan(userId: string): void {
    const user = this.data.users[userId];
    if (!user?.clanId) return;
    const clan = this.getClan(user.clanId);
    user.clanId = undefined;
    if (clan) {
      clan.members = clan.members.filter(id => id !== userId);
      if (clan.members.length === 0) {
        delete this.data.clans![clan.id];
      } else if (clan.leaderId === userId) {
        clan.leaderId = clan.members[0]; // oqsoqollik eng eski a'zoga o'tadi
      }
    }
    this.scheduleSave();
  }

  private clanItem(clan: StoredClan, week: string): ClanItem {
    return {
      id: clan.id,
      name: clan.name,
      tag: clan.tag,
      leaderId: clan.leaderId,
      membersCount: clan.members.length,
      totalElo: clan.members.reduce((sum, id) => sum + (this.data.users[id]?.ratingElo ?? DEFAULT_ELO), 0),
      description: '',
      weeklyPoints: this.data.weeklyClanPoints?.[week]?.[clan.id] || 0,
    };
  }

  // Haftalik liga jadvali: joriy hafta ochkolari, teng bo'lsa a'zolar reytingi yig'indisi
  public listClans(now: number = Date.now(), limit: number = 50): ClanItem[] {
    const week = weekKeyOf(now);
    return Object.values(this.data.clans || {})
      .map(c => this.clanItem(c, week))
      .sort((a, b) => (b.weeklyPoints || 0) - (a.weeklyPoints || 0) || b.totalElo - a.totalElo)
      .slice(0, limit);
  }

  public clanDetail(clanId: string, now: number = Date.now()): ClanDetail | undefined {
    const clan = this.getClan(clanId);
    if (!clan) return undefined;
    return {
      ...this.clanItem(clan, weekKeyOf(now)),
      members: clan.members
        .map(id => this.data.users[id])
        .filter((u): u is StoredUser => !!u)
        .map(u => ({ id: u.id, displayName: u.displayName, ratingElo: u.ratingElo, isLeader: u.id === clan.leaderId }))
        .sort((a, b) => b.ratingElo - a.ratingElo),
    };
  }

  private pruneOldWeeks(currentWeek: string): void {
    const weeks = Object.keys(this.data.weeklyClanPoints || {}).sort();
    for (const week of weeks.slice(0, Math.max(0, weeks.length - WEEKS_TO_KEEP))) {
      if (week !== currentWeek) delete this.data.weeklyClanPoints![week];
    }
  }

  // --- Do'kon (Telegram Stars) ---

  // To'lov idempotent: bitta chargeId faqat bir marta qo'llanadi
  public grantShopItem(userId: string, itemId: string, chargeId: string, now: number = Date.now()): StoredUser | undefined {
    const user = this.data.users[userId];
    const item = findShopItem(itemId);
    if (!user || !item) return undefined;
    this.data.payments = this.data.payments || {};
    if (this.data.payments[chargeId]) return user;
    this.data.payments[chargeId] = { userId, itemId, at: now };

    if (item.kind === 'VIP') {
      const from = Math.max(now, user.vipUntil || 0);
      user.vipUntil = from + (item.durationDays || 30) * 86400000;
    } else {
      user.ownedItems = Array.from(new Set([...(user.ownedItems || []), item.id]));
    }
    this.flush(); // to'lov darhol diskka yoziladi
    return user;
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
