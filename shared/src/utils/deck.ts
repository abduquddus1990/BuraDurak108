import { Card, Rank, Suit, BURA_CARD_POINTS, CARD_STRENGTH, BURA_CARD_STRENGTH } from '../types/card';
import { SpecialCombination, BuraRules } from '../types/game';

export const SUITS: Suit[] = ['HEARTS', 'DIAMONDS', 'SPADES', 'CLUBS'];
export const RANKS_36: Rank[] = ['6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

export function createDeck36(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS_36) {
      deck.push({
        suit,
        rank,
        id: `${suit}_${rank}`,
      });
    }
  }
  return deck;
}

export function shuffleDeck(deck: Card[]): Card[] {
  const result = [...deck];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// Qo'ldagi kartalarni qiymatiga qarab tartiblash (Katta kozir birinchi, keyin Tuz, 10, Qirol...)
export function sortHand(hand: Card[], trumpSuit?: Suit, isBura: boolean = false): Card[] {
  const strength = isBura ? BURA_CARD_STRENGTH : CARD_STRENGTH;
  return [...hand].sort((a, b) => {
    // 1. Kozirlar eng birinchi turadi
    const aIsTrump = trumpSuit && a.suit === trumpSuit;
    const bIsTrump = trumpSuit && b.suit === trumpSuit;

    if (aIsTrump && !bIsTrump) return -1;
    if (!aIsTrump && bIsTrump) return 1;

    // 2. Agar ikkalasi ham kozir bo'lsa, kuchi bo'yicha (kattasi oldinda)
    if (aIsTrump && bIsTrump) {
      return strength[b.rank] - strength[a.rank];
    }

    // 3. Agar nokozir bo'lsa, mastlari bo'yicha guruhlanadi
    if (a.suit !== b.suit) {
      return a.suit.localeCompare(b.suit);
    }

    // 4. Bir xil mastdagi kartalar kuchi bo'yicha kamayish tartibida
    return strength[b.rank] - strength[a.rank];
  });
}

// Kombinatsiyalarni tekshirish (Bura va Burkozel uchun)
export function detectSpecialCombinations(
  hand: Card[],
  trumpSuit: Suit,
  playerId: string,
  is6CardsMode: boolean = false,
  rule?: BuraRules
): SpecialCombination[] {
  const combinations: SpecialCombination[] = [];

  // 1. MOSKVA (4 ta Tuz) - Eng katta qo'l, butun o'yin tugaydi! Har doim mavjud
  const aces = hand.filter(c => c.rank === 'A');
  if (aces.length === 4) {
    combinations.push({
      type: 'MOSKVA',
      cards: aces,
      playerId,
    });
  }

  // 2. BURA (4 ta kozir 4-kartalikda, 5 ta 6-kartalikda) - Har doim mavjud
  const trumps = hand.filter(c => c.suit === trumpSuit);
  const requiredBuraTrumps = is6CardsMode ? 5 : 4;
  if (trumps.length >= requiredBuraTrumps) {
    combinations.push({
      type: 'BURA',
      cards: trumps,
      playerId,
    });
  }

  // 3. MOLODKA - MOLOTKALI, SIX_CARDS va 41 LIK rejimida ochiladi!
  const allowMolodka = !rule || rule === 'MOLOTKALI' || rule === 'SIX_CARDS' || rule === 'FORTY_ONE';
  if (allowMolodka) {
    const requiredMolodka = is6CardsMode ? 5 : 4;
    for (const suit of SUITS) {
      if (suit === trumpSuit) continue;
      const sameSuitCards = hand.filter(c => c.suit === suit);
      if (sameSuitCards.length >= requiredMolodka) {
        combinations.push({
          type: 'MOLODKA',
          cards: sameSuitCards,
          playerId,
        });
      }
    }
  }

  // 4. 41+ QOIDASI - FAQAT FORTY_ONE rejimida ochiladi! Oddiy va molotkalida ochilmaydi!
  const allowFortyOne = rule === 'FORTY_ONE';
  if (allowFortyOne) {
    const sortedScoringCards = [...hand].sort(
      (a, b) => BURA_CARD_POINTS[b.rank] - BURA_CARD_POINTS[a.rank]
    );
    let totalScore = 0;
    const fortyOneCards: Card[] = [];
    for (const card of sortedScoringCards) {
      if (BURA_CARD_POINTS[card.rank] > 0) {
        totalScore += BURA_CARD_POINTS[card.rank];
        fortyOneCards.push(card);
        if (totalScore >= 41) {
          break;
        }
      }
    }
    if (totalScore >= 41) {
      combinations.push({
        type: 'FORTY_ONE',
        cards: fortyOneCards,
        points: totalScore,
        playerId,
      });
    }
  }

  return combinations;
}

export function canBeatCard(
  attackCard: Card,
  defenseCard: Card,
  trumpSuit: Suit,
  isBura: boolean = false
): boolean {
  const strength = isBura ? BURA_CARD_STRENGTH : CARD_STRENGTH;
  if (attackCard.suit === defenseCard.suit) {
    return strength[defenseCard.rank] > strength[attackCard.rank];
  }
  if (defenseCard.suit === trumpSuit && attackCard.suit !== trumpSuit) {
    return true;
  }
  return false;
}
