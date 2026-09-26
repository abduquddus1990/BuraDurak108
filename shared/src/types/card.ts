export type Suit = 'HEARTS' | 'DIAMONDS' | 'SPADES' | 'CLUBS';
// O'zbekcha choyxona atamalari:
// HEARTS = Olma / Qizil olma (♥)
// DIAMONDS = G'isht (♦)
// SPADES = Qarg'a / Pika (♠)
// CLUBS = Chillik / Krest (♣)

export type Rank = '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
  suit: Suit;
  rank: Rank;
  id: string; // Masalan: "HEARTS_A", "SPADES_10"
}

// Bura va Burkozel ochkolari
export const BURA_CARD_POINTS: Record<Rank, number> = {
  'A': 11,
  '10': 10,
  'K': 4,
  'Q': 3,
  'J': 2,
  '9': 0,
  '8': 0,
  '7': 0,
  '6': 0,
};

// 108 o'yinidagi qo'lda qolgan kartalar jarima ochkosi
// Dama: 20 ochko, Qarg'a (♠) damasi esa 40 - bu OneHundredEightEngine.cardPenalty() da hisoblanadi
export const ONE_HUNDRED_EIGHT_POINTS: Record<Rank, number> = {
  'A': 11,
  '10': 10,
  'K': 4,
  'Q': 20,
  'J': 2, // Variantga qarab qo'lda qolsa 2 yoki 20 bo'lishi mumkin
  '9': 9,
  '8': 8,
  '7': 7,
  '6': 6,
};

// Durakdagi kartalarning ketma-ketlik kuchi (kattaligi)
export const CARD_STRENGTH: Record<Rank, number> = {
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  '10': 10,
  'J': 11,
  'Q': 12,
  'K': 13,
  'A': 14,
};

// Buradagi kartalarning ketma-ketlik kuchi (10 kartasi J, Q va K lardan katta!)
export const BURA_CARD_STRENGTH: Record<Rank, number> = {
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  'J': 11,
  'Q': 12,
  'K': 13,
  '10': 14,
  'A': 15,
};

export const SUIT_SYMBOLS: Record<Suit, string> = {
  HEARTS: '♥',
  DIAMONDS: '♦',
  SPADES: '♠',
  CLUBS: '♣',
};

export const SUIT_NAMES_UZ: Record<Suit, string> = {
  HEARTS: 'Olma (♥)',
  DIAMONDS: 'G\'isht (♦)',
  SPADES: 'Qarg\'a (♠)',
  CLUBS: 'Chillik (♣)',
};

export const SUIT_COLORS: Record<Suit, string> = {
  HEARTS: '#e11d48', // qizil
  DIAMONDS: '#ea580c', // qizg'ish olov
  SPADES: '#1e293b', // qora
  CLUBS: '#0f172a', // to'q qora
};
