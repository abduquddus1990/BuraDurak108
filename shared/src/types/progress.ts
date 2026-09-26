import { GameType } from './game';

// --- Yutuqlar (nishonlar) ---
export type AchievementId =
  | 'FIRST_WIN'
  | 'WINS_10'
  | 'WINS_50'
  | 'GAMES_100'
  | 'STREAK_5'
  | 'MOSKVA'
  | 'BURA_COMBO'
  | 'MOLODKA'
  | 'QUEEN_SPADES_EXIT'
  | 'KAMIKADZE'
  | 'ALL_GAMES'
  | 'ELO_1200'
  | 'DAILY_7';

export const ACHIEVEMENTS: Record<AchievementId, { icon: string; title: string; description: string }> = {
  FIRST_WIN: { icon: '🏅', title: "Birinchi g'alaba", description: 'Birinchi partiyani yuting' },
  WINS_10: { icon: '🥈', title: "10 ta g'alaba", description: "Jami 10 ta partiyada g'olib bo'ling" },
  WINS_50: { icon: '🥇', title: "50 ta g'alaba", description: "Jami 50 ta partiyada g'olib bo'ling" },
  GAMES_100: { icon: '🍵', title: 'Choyxona doimiysi', description: "100 ta partiya o'ynang" },
  STREAK_5: { icon: '🔥', title: 'Ketma-ket 5', description: "5 ta partiyani ketma-ket yuting" },
  MOSKVA: { icon: '👑', title: 'Moskva!', description: "Burada 4 ta Tuz bilan Moskva oching" },
  BURA_COMBO: { icon: '⚡', title: 'Bura!', description: 'Burada kozirlar bilan Bura oching' },
  MOLODKA: { icon: '🔨', title: 'Molodka', description: 'Burada Molodka bilan yuring' },
  QUEEN_SPADES_EXIT: { icon: '♠️', title: "Qarg'a damasi", description: "108 da oxirgi karta - Qarg'a damasi bilan chiqing" },
  KAMIKADZE: { icon: '💥', title: 'Kamikadze', description: "108 da aynan 108 ochko to'plab 0 ga tushing" },
  ALL_GAMES: { icon: '🎴', title: 'Uch karra usta', description: "Bura, Durak va 108 ning har birida yuting" },
  ELO_1200: { icon: '📈', title: 'Reyting 1200', description: "Istalgan o'yinda 1200 reytingga yeting" },
  DAILY_7: { icon: '📅', title: 'Haftalik sadoqat', description: "7 kun ketma-ket kunlik vazifalarni bajaring" },
};

// --- Kunlik vazifalar ---
export type DailyTaskId = 'PLAY_3' | 'WIN_1' | 'PLAY_BURA' | 'PLAY_DURAK' | 'PLAY_108' | 'WIN_VS_HUMAN';

export const DAILY_TASKS: Record<DailyTaskId, { title: string; target: number }> = {
  PLAY_3: { title: "3 ta partiya o'ynang", target: 3 },
  WIN_1: { title: "1 ta partiyada yuting", target: 1 },
  PLAY_BURA: { title: "Bura o'ynang", target: 1 },
  PLAY_DURAK: { title: "Durak o'ynang", target: 1 },
  PLAY_108: { title: "108 o'ynang", target: 1 },
  WIN_VS_HUMAN: { title: "Odamga qarshi yuting", target: 1 },
};

const ROTATING_TASKS: DailyTaskId[] = ['PLAY_BURA', 'PLAY_DURAK', 'PLAY_108', 'WIN_VS_HUMAN'];

// Sana (UTC) kaliti: "2026-09-26"
export const dateKeyOf = (ms: number): string => new Date(ms).toISOString().slice(0, 10);

// Har kuni 3 ta vazifa: ikkitasi doimiy, uchinchisi kunga qarab almashadi
export function dailyTaskIdsFor(dateKey: string): DailyTaskId[] {
  const dayIndex = Math.floor(Date.parse(`${dateKey}T00:00:00Z`) / 86400000);
  return ['PLAY_3', 'WIN_1', ROTATING_TASKS[dayIndex % ROTATING_TASKS.length]];
}

// Hafta kaliti (dushanbadan boshlanadi, UTC): mahallalar haftalik ligasi uchun
export function weekKeyOf(ms: number): string {
  const date = new Date(ms);
  const day = (date.getUTCDay() + 6) % 7; // dushanba = 0
  const monday = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() - day));
  return monday.toISOString().slice(0, 10);
}

export const nextWeekStartMs = (ms: number): number => Date.parse(`${weekKeyOf(ms)}T00:00:00Z`) + 7 * 86400000;

// --- O'yinlar tarixi ---
export interface GameHistoryEntry {
  at: number;
  gameType: GameType;
  rules: string;
  result: 'WIN' | 'LOSS' | 'DRAW';
  eloDelta: number;
  opponents: string[];
  vsHumans: boolean;
}

export interface DailyTaskView {
  id: DailyTaskId;
  title: string;
  progress: number;
  target: number;
}

export interface DailyView {
  date: string;
  tasks: DailyTaskView[];
  completed: boolean;
  streak: number;
}

// --- Do'kon (Telegram Stars) ---
export type ShopItemKind = 'VIP' | 'CARD_BACK' | 'TABLE_THEME';

export interface ShopItem {
  id: string;
  kind: ShopItemKind;
  title: string;
  description: string;
  priceStars: number;
  durationDays?: number; // VIP muddati
  themeId?: string; // CARD_BACK / TABLE_THEME uchun dizayn ID si
}

// Narxlar bitta joyda - o'zgartirish oson
export const SHOP_ITEMS: ShopItem[] = [
  {
    id: 'vip_30',
    kind: 'VIP',
    title: 'VIP · 30 kun',
    description: "Ismingiz yonida 👑 nishon va barcha premium dizaynlar",
    priceStars: 100,
    durationDays: 30,
  },
  {
    id: 'cardback_shoh_oltin',
    kind: 'CARD_BACK',
    title: 'Shoh Oltin karta orqasi',
    description: "Oltin naqshli premium karta orqa tomoni (doimiy)",
    priceStars: 25,
    themeId: 'shoh_oltin',
  },
  {
    id: 'table_samarqand_oltin',
    kind: 'TABLE_THEME',
    title: 'Samarqand Oltin stol',
    description: "Feruza va oltin naqshli premium xontaxta (doimiy)",
    priceStars: 25,
    themeId: 'samarqand_oltin',
  },
];

export const findShopItem = (id: string) => SHOP_ITEMS.find(i => i.id === id);

// Premium dizayn: sotib olingan yoki VIP bo'lsa ochiq
export function isThemeUnlocked(themeId: string, ownedItems: string[] = [], vipUntil?: number, now: number = Date.now()): boolean {
  const item = SHOP_ITEMS.find(i => i.themeId === themeId);
  if (!item) return true; // bepul dizayn
  return ownedItems.includes(item.id) || (!!vipUntil && vipUntil > now);
}
