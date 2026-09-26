import { GameType } from '../../../shared/src/types/game';
import {
  AchievementId,
  DAILY_TASKS,
  DailyTaskId,
  DailyView,
  GameHistoryEntry,
  dailyTaskIdsFor,
  dateKeyOf,
} from '../../../shared/src/types/progress';
import { GameStats } from '../../../shared/src/types/social';

const HISTORY_LIMIT = 20;
const ALL_GAMES: GameType[] = ['BURA', 'DURAK', 'ONE_HUNDRED_EIGHT'];

// Foydalanuvchining o'sish ma'lumotlari (UserStore dagi yozuvning bir qismi)
export interface ProgressFields {
  gamesPlayed: number;
  gamesWon: number;
  ratingElo: number;
  ratings?: Partial<Record<GameType, number>>;
  statsByGame?: Partial<Record<GameType, GameStats>>;
  achievements?: Partial<Record<AchievementId, number>>;
  winStreak?: number;
  bestStreak?: number;
  history?: GameHistoryEntry[];
  daily?: { date: string; progress: Partial<Record<DailyTaskId, number>>; completed: boolean };
  dailyStreak?: number;
  lastDailyCompleted?: string; // oxirgi marta hamma kunlik vazifa bajarilgan sana
}

export interface PlayerOutcome {
  gameType: GameType;
  rules: string;
  result: 'WIN' | 'LOSS' | 'DRAW';
  eloDelta: number;
  opponents: string[];
  vsHumans: boolean;
  events: string[]; // shu o'yinchi bilan bog'liq hodisalar (MOSKVA, BURA, ...)
}

export interface OutcomeEffects {
  newAchievements: AchievementId[];
  dailyJustCompleted: boolean;
}

// Bugungi kunlik vazifalar (sana o'zgarsa - yangi)
function ensureToday(user: ProgressFields, now: number) {
  const today = dateKeyOf(now);
  if (!user.daily || user.daily.date !== today) {
    user.daily = { date: today, progress: {}, completed: false };
  }
  return user.daily;
}

export function getDailyView(user: ProgressFields, now: number = Date.now()): DailyView {
  const today = dateKeyOf(now);
  const daily = user.daily && user.daily.date === today ? user.daily : { date: today, progress: {}, completed: false };
  return {
    date: today,
    tasks: dailyTaskIdsFor(today).map(id => ({
      id,
      title: DAILY_TASKS[id].title,
      target: DAILY_TASKS[id].target,
      progress: Math.min(DAILY_TASKS[id].target, daily.progress[id] || 0),
    })),
    completed: daily.completed,
    streak: currentDailyStreak(user, now),
  };
}

// Ketma-ketlik faqat kecha yoki bugun bajarilgan bo'lsa davom etadi
function currentDailyStreak(user: ProgressFields, now: number): number {
  if (!user.lastDailyCompleted) return 0;
  const today = dateKeyOf(now);
  const yesterday = dateKeyOf(now - 86400000);
  return user.lastDailyCompleted === today || user.lastDailyCompleted === yesterday ? user.dailyStreak || 0 : 0;
}

const EVENT_ACHIEVEMENTS: Record<string, AchievementId> = {
  MOSKVA: 'MOSKVA',
  BURA: 'BURA_COMBO',
  MOLODKA: 'MOLODKA',
  QUEEN_SPADES_EXIT: 'QUEEN_SPADES_EXIT',
  KAMIKADZE: 'KAMIKADZE',
};

/** Bitta tugagan partiyaning natijasini foydalanuvchiga qo'llaydi (statistika, seriya, tarix, kunlik vazifa, yutuq). */
export function applyOutcome(user: ProgressFields, outcome: PlayerOutcome, now: number = Date.now()): OutcomeEffects {
  const won = outcome.result === 'WIN';

  // Statistika
  user.statsByGame = user.statsByGame || {};
  const stats = user.statsByGame[outcome.gameType] || { played: 0, won: 0 };
  stats.played++;
  if (won) stats.won++;
  user.statsByGame[outcome.gameType] = stats;

  // G'alabalar seriyasi
  user.winStreak = won ? (user.winStreak || 0) + 1 : outcome.result === 'LOSS' ? 0 : user.winStreak || 0;
  user.bestStreak = Math.max(user.bestStreak || 0, user.winStreak);

  // Tarix (eng yangisi birinchi)
  user.history = [
    {
      at: now,
      gameType: outcome.gameType,
      rules: outcome.rules,
      result: outcome.result,
      eloDelta: outcome.eloDelta,
      opponents: outcome.opponents,
      vsHumans: outcome.vsHumans,
    },
    ...(user.history || []),
  ].slice(0, HISTORY_LIMIT);

  // Kunlik vazifalar
  const daily = ensureToday(user, now);
  const bump = (id: DailyTaskId) => (daily.progress[id] = (daily.progress[id] || 0) + 1);
  bump('PLAY_3');
  if (won) bump('WIN_1');
  if (outcome.gameType === 'BURA') bump('PLAY_BURA');
  if (outcome.gameType === 'DURAK') bump('PLAY_DURAK');
  if (outcome.gameType === 'ONE_HUNDRED_EIGHT') bump('PLAY_108');
  if (won && outcome.vsHumans) bump('WIN_VS_HUMAN');

  let dailyJustCompleted = false;
  const todays = dailyTaskIdsFor(daily.date);
  if (!daily.completed && todays.every(id => (daily.progress[id] || 0) >= DAILY_TASKS[id].target)) {
    daily.completed = true;
    dailyJustCompleted = true;
    user.dailyStreak = currentDailyStreak(user, now) + 1;
    user.lastDailyCompleted = daily.date;
  }

  // Yutuqlar
  user.achievements = user.achievements || {};
  const newAchievements: AchievementId[] = [];
  const unlock = (id: AchievementId, condition: boolean) => {
    if (condition && !user.achievements![id]) {
      user.achievements![id] = now;
      newAchievements.push(id);
    }
  };
  unlock('FIRST_WIN', user.gamesWon >= 1);
  unlock('WINS_10', user.gamesWon >= 10);
  unlock('WINS_50', user.gamesWon >= 50);
  unlock('GAMES_100', user.gamesPlayed >= 100);
  unlock('STREAK_5', (user.winStreak || 0) >= 5);
  unlock('ALL_GAMES', ALL_GAMES.every(g => (user.statsByGame?.[g]?.won || 0) > 0));
  unlock('ELO_1200', Object.values(user.ratings || {}).some(r => (r || 0) >= 1200));
  unlock('DAILY_7', (user.dailyStreak || 0) >= 7);
  for (const event of outcome.events) {
    const id = EVENT_ACHIEVEMENTS[event];
    if (id) unlock(id, true);
  }

  return { newAchievements, dailyJustCompleted };
}
