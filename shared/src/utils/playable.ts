import { Card, Suit } from '../types/card';
import { TableState, OneHundredEightRules } from '../types/game';
import { canBeatCard } from './deck';

export interface OneHundredEightPlayContext {
  topCard?: Card;
  activeSuit?: Suit;
  pendingPenaltyCount: number;
  pendingPenaltyRank?: '6' | '7' | null;
  rule: OneHundredEightRules;
}

// 108: karta stoldagi kartaga tushadimi (server dvijogi va klientdagi yordamchi ko'rsatkich uchun bitta qoida)
export function can108Play(card: Card, ctx: OneHundredEightPlayContext): boolean {
  if (ctx.pendingPenaltyCount > 0 && ctx.pendingPenaltyRank) {
    return card.rank === ctx.pendingPenaltyRank;
  }
  if (!ctx.topCard) return true;

  // 1-variantda Valet, 2-variantda Dama istalgan karta ustiga tushadi
  if (ctx.rule === 'KOROL_QARGA' && card.rank === 'J') return true;
  if (ctx.rule === 'KOROL_OLMA' && card.rank === 'Q') return true;

  const requiredSuit = ctx.activeSuit || ctx.topCard.suit;
  return card.suit === requiredSuit || card.rank === ctx.topCard.rank;
}

export type PlayableHint =
  | { mode: 'none' }
  // dim: mos kelmaydigan kartalar xiralashtiriladi (108, Durak)
  // highlight: foydali kartalar yoritiladi, qolganlari ham yurilishi mumkin (Bura - ura olmasa tashlaydi)
  | { mode: 'dim' | 'highlight'; ids: Set<string> };

// Stoldagi (yuzi ochiq) kartalarni id bo'yicha topish
function findTableCard(state: TableState, id: string): Card | undefined {
  for (const tc of state.tableCards) {
    if (tc.card.id === id && !tc.isFaceDown) return tc.card;
    if (tc.beatenBy?.id === id) return tc.beatenBy;
  }
  return undefined;
}

/**
 * Hozir qo'ldagi qaysi kartalar bilan yurish mumkinligini aniqlaydi (faqat ko'rsatkich uchun,
 * yakuniy tekshiruv baribir serverda). canActNow - o'yinchining navbati (yoki Durakda tashlash imkoni) bormi.
 */
export function getPlayableHint(state: TableState, hand: Card[], myId: string, canActNow: boolean): PlayableHint {
  if (!canActNow || state.status !== 'PLAYING' || hand.length === 0) return { mode: 'none' };
  const gameType = state.settings.gameType;

  if (gameType === 'ONE_HUNDRED_EIGHT') {
    const top = state.tableCards[state.tableCards.length - 1]?.card;
    const ctx: OneHundredEightPlayContext = {
      topCard: top,
      activeSuit: state.activeSuit,
      pendingPenaltyCount: state.pendingPenaltyCount || 0,
      pendingPenaltyRank: state.pendingPenaltyRank ?? null,
      rule: state.settings.rules as OneHundredEightRules,
    };
    return { mode: 'dim', ids: new Set(hand.filter(c => can108Play(c, ctx)).map(c => c.id)) };
  }

  if (gameType === 'DURAK') {
    const isDefender = state.currentDefenderId === myId;
    const unbeaten = state.tableCards.filter(tc => !tc.beatenBy);
    if (isDefender) {
      const ids = hand.filter(c => {
        const canBeat = unbeaten.some(tc => canBeatCard(tc.card, c, state.trumpSuit));
        const canTransfer = state.settings.rules === 'PEREKIDLI'
          && state.tableCards.length > 0
          && state.tableCards.every(tc => !tc.beatenBy && tc.card.rank === c.rank);
        return canBeat || canTransfer;
      });
      return { mode: 'dim', ids: new Set(ids.map(c => c.id)) };
    }
    if (state.tableCards.length === 0) return { mode: 'dim', ids: new Set(hand.map(c => c.id)) };
    const ranks = new Set<string>();
    for (const tc of state.tableCards) {
      ranks.add(tc.card.rank);
      if (tc.beatenBy) ranks.add(tc.beatenBy.rank);
    }
    return { mode: 'dim', ids: new Set(hand.filter(c => ranks.has(c.rank)).map(c => c.id)) };
  }

  // BURA: birinchi yurishda hamma karta mumkin; javobda ura oladiganlar yoritiladi
  const leadIds = state.leadCardIds || [];
  if (state.tableCards.length === 0 || leadIds.length === 0) return { mode: 'none' };
  const leadCards = leadIds.map(id => findTableCard(state, id)).filter((c): c is Card => !!c);
  const ids = hand.filter(c => leadCards.some(lead => canBeatCard(lead, c, state.trumpSuit, true)));
  return { mode: 'highlight', ids: new Set(ids.map(c => c.id)) };
}
