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

export interface RoomSettings {
  id: string;
  gameType: GameType;
  rules: GameRules;
  maxPlayers: number;
  turnTimeoutSeconds: number;
  isPrivate: boolean;
  deckType: '36' | '52';
  targetScore?: number; // Burkozelda 12 jarima, 108 da 108 ochko
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
}
