import { Card, Suit } from './card';

export type GameType = 'BURA' | 'DURAK' | 'ONE_HUNDRED_EIGHT';

export type BuraRules = 'ODDIY' | 'MOLOTKALI' | 'FORTY_ONE' | 'SIX_CARDS';
export type DurakRules = 'PEREKIDLI' | 'PEREKIDSIZ';
export type OneHundredEightRules = 'KOROL_QARGA' | 'KOROL_OLMA';

export type GameRules = BuraRules | DurakRules | OneHundredEightRules;

export type SpecialCombinationType = 'MOSKVA' | 'BURA' | 'MOLODKA' | 'FORTY_ONE';

export interface SpecialCombination {
  type: SpecialCombinationType;
  cards: Card[];
  points?: number;
  playerId: string;
}

export type BotLevel = 'EASY' | 'MEDIUM' | 'HARD';

// Mezbon tanlaydigan stol sozlamalari (choyxonalar orasida qoidalar farq qiladi)
export interface RoomOptions {
  eggRule?: boolean; // Bura: tuxum qoidasi (standart: yoqilgan)
  loneQueenBonus?: boolean; // 108: yolg'iz dama 20/40 va dama bilan chiqishda minus (standart: yoqilgan)
  botLevel?: BotLevel; // Botlar darajasi (standart: MEDIUM)
}

export const TURN_SECONDS_OPTIONS = [15, 30, 60] as const;

export interface RoomSettings {
  id: string;
  gameType: GameType;
  rules: GameRules;
  maxPlayers: number;
  turnTimeoutSeconds: number;
  isPrivate: boolean;
  deckType: '36' | '52';
  targetScore?: number; // Burkozelda 12 jarima, 108 da 108 ochko
  options?: RoomOptions;
}

export interface PlayerPublic {
  id: string;
  username: string;
  avatarUrl?: string;
  isBot: boolean;
  cardsCount: number;
  score: number; // Joriy raunddagi vzyatka ochkosi
  penaltyPoints: number; // Burkozelda jami jarima ochkolari (0 dan 12 gacha) yoki 108 da jami ochkolar
  isTurn: boolean;
  isFolded: boolean;
  ready: boolean;
  isEliminated?: boolean; // 108 da 108 dan oshib chiqib ketgan o'yinchilar
  isConnected?: boolean; // Odam stolga ulanganmi (uzilgan bo'lsa uning o'rniga server yuradi)
  badge?: string; // Masalan VIP uchun "👑"
}

export interface PlayerPrivate extends PlayerPublic {
  hand: Card[];
  wonCards?: Card[]; // Raundda yutib olgan barcha kartalari (oxirida ochiq ko'rsatish uchun)
}

export interface PlayedTrickCard {
  playerId: string;
  card: Card;
  beatenBy?: Card;
  beatenByPlayerId?: string;
  isFaceDown?: boolean; // Ura olmasdan tashlangan karta yopiq holda ko'rinadi
}

export interface RoundPlayerResult {
  playerId: string;
  username: string;
  wonCards: Card[];
  roundScore: number;
  roundPenalty: number;
  totalPenalty: number;
  isEliminated?: boolean;
  readyForNext?: boolean;
}

export interface RoundSummary {
  roundNumber: number;
  results: RoundPlayerResult[];
  isGameOver: boolean;
  reason?: string;
  winnerId?: string;
}

export interface SpecialCombinationAlert {
  playerId: string;
  playerName: string;
  type: SpecialCombinationType;
  cards: Card[];
  title: string;
  description: string;
  timestamp: number;
}

export interface TableState {
  roomId: string;
  settings: RoomSettings;
  status: 'WAITING' | 'PLAYING' | 'ROUND_OVER' | 'GAME_OVER';
  trumpSuit: Suit;
  trumpCard?: Card;
  deckCount: number;
  activePlayerIndex: number;
  players: PlayerPublic[];
  tableCards: PlayedTrickCard[];
  currentAttackerId?: string;
  currentDefenderId?: string;
  activeSuit?: Suit;
  declaredCombination?: SpecialCombination;
  winnerId?: string;
  lastActionMessage?: string;
  roundNumber: number;
  roundSummary?: RoundSummary;
  isLastTrumpRevealed?: boolean;
  revealedTrumpCard?: Card;
  specialCombinationAlert?: SpecialCombinationAlert | null;
  pendingPenaltyCount?: number; // 108 da to'plangan 6/7 jarima kartalari
  turnRemainingMs?: number; // Navbat (yoki raund oxirida tayyorlik) uchun qolgan vaqt
  eggMultiplier?: number; // Bura: "tuxum"dan keyingi jarima ko'paytiruvchisi (1, 2, 4 ...)
  dealerId?: string; // 108: joriy qo'lni tarqatgan o'yinchi
  pendingPenaltyRank?: '6' | '7' | null; // 108: qaysi karta zanjiri ketyapti
  leadCardIds?: string[]; // Bura: javob berilishi kerak bo'lgan (oxirgi yurilgan/urilgan) kartalar
  lastTrick?: { winnerId: string; cards: PlayedTrickCard[] }; // Bura: oxirgi olingan vzyatka
  rematchVotes?: string[]; // O'yin tugagach "Yana bir partiya" deganlar
  defenderTaking?: boolean; // Durak vdogonku: himoyachi oladi, qo'shnilar qo'shimcha tashlay oladi
}
