import { Card, Suit, BURA_CARD_POINTS, CARD_STRENGTH, BURA_CARD_STRENGTH } from '../../../shared/src/types/card';
import { BuraEngine } from '../engine/BuraEngine';
import { OneHundredEightEngine } from '../engine/OneHundredEightEngine';
import { DurakEngine } from '../engine/DurakEngine';
import { canBeatCard } from '../../../shared/src/utils/deck';
import { BotLevel } from '../../../shared/src/types/game';

const pickRandom = <T>(items: T[]): T => items[Math.floor(Math.random() * items.length)];
const shuffled = <T>(items: T[]): T[] => [...items].sort(() => Math.random() - 0.5);
// "Yengil" bot yarim holatlarda o'ylamasdan tasodifiy (lekin qoidaga mos) yuradi
const actsRandomly = (level: BotLevel) => level === 'EASY' && Math.random() < 0.5;

/**
 * Bot darajalari:
 *  EASY   - yangi boshlovchilar uchun: yarim yurishlari tasodifiy
 *  MEDIUM - standart: har yurishda eng arzon foydali variant
 *  HARD   - usta: kozir va maxsus kartalarni tejaydi, kerak bo'lsa ataylab oladi
 */
export class BotAI {
  // 1. BURA / BURKOZEL UCHUN BOT QARORI
  public static makeBuraMove(engine: BuraEngine, botId: string, level: BotLevel = 'MEDIUM'): { action: 'DECLARE' | 'PLAY' | 'FOLD'; cards?: Card[]; type?: string } {
    const bot = engine.players.find(p => p.id === botId);
    if (!bot || bot.hand.length === 0) return { action: 'FOLD', cards: [] };

    // A. Avval Moskva yoki Bura bor-yo'qligini tekshirish (navbatsiz)
    const aces = bot.hand.filter(c => c.rank === 'A');
    if (aces.length === 4) {
      return { action: 'DECLARE', type: 'MOSKVA' };
    }

    const trumps = bot.hand.filter(c => c.suit === engine.trumpSuit);
    const buraThreshold = engine.is6CardsMode() ? 5 : 4;
    if (trumps.length >= buraThreshold) {
      return { action: 'DECLARE', type: 'BURA' };
    }

    // B. Agar navbati kelmagan bo'lsa, kutadi
    if (!bot.isTurn) return { action: 'FOLD', cards: [] };

    if (actsRandomly(level)) {
      if (engine.tableCards.length === 0) return { action: 'PLAY', cards: [pickRandom(bot.hand)] };
      const count = engine.lastLeadCards.length;
      if (bot.hand.length >= count) return { action: 'PLAY', cards: shuffled(bot.hand).slice(0, count) };
    }

    // C. Birinchi yurish (Stol bo'sh)
    if (engine.tableCards.length === 0) {
      // 41+ kombinatsiyasini tekshirish (faqat 41 lik rejimida ruxsat etiladi - boshqa rejimlarda
      // turli mastli kartalar bilan yurish rad etilib, bot bir joyda aylanib qolardi)
      if (engine.buraRule === 'FORTY_ONE') {
        const sortedScoring = [...bot.hand].sort((a, b) => BURA_CARD_POINTS[b.rank] - BURA_CARD_POINTS[a.rank]);
        let pts = 0;
        const fortyOneGroup: Card[] = [];
        for (const c of sortedScoring) {
          if (BURA_CARD_POINTS[c.rank] > 0) {
            pts += BURA_CARD_POINTS[c.rank];
            fortyOneGroup.push(c);
            if (pts >= 41) {
              return { action: 'PLAY', cards: fortyOneGroup };
            }
          }
        }
      }

      // Kichik nokozir karta bilan yurish (10 kartasini asrash kerak!)
      const nonTrumps = bot.hand.filter(c => c.suit !== engine.trumpSuit);
      if (nonTrumps.length > 0) {
        // 1. 0 ochkolik kartalar birinchi (6, 7, 8, 9)
        const zeroPointNonTrumps = nonTrumps.filter(c => BURA_CARD_POINTS[c.rank] === 0);
        if (zeroPointNonTrumps.length > 0) {
          zeroPointNonTrumps.sort((a, b) => BURA_CARD_STRENGTH[a.rank] - BURA_CARD_STRENGTH[b.rank]);
          return { action: 'PLAY', cards: [zeroPointNonTrumps[0]] };
        }

        // 2. Kichik ochkolik kartalar (J, Q, K)
        const lowPointNonTrumps = nonTrumps.filter(c => c.rank === 'J' || c.rank === 'Q' || c.rank === 'K');
        if (lowPointNonTrumps.length > 0) {
          lowPointNonTrumps.sort((a, b) => BURA_CARD_STRENGTH[a.rank] - BURA_CARD_STRENGTH[b.rank]);
          return { action: 'PLAY', cards: [lowPointNonTrumps[0]] };
        }

        // 3. Katta kartalardan: Tuz (A) bilan yurish xavfsiz (nokozirlar urolmaydi)
        const acesNonTrump = nonTrumps.filter(c => c.rank === 'A');
        if (acesNonTrump.length > 0) {
          return { action: 'PLAY', cards: [acesNonTrump[0]] };
        }

        // 4. Oxirgi chora: 10
        return { action: 'PLAY', cards: [nonTrumps[0]] };
      }

      // Faqat kozirlar qolgan bo'lsa, eng kichik kozir bilan yurish
      const lowestTrump = [...bot.hand].sort((a, b) => BURA_CARD_STRENGTH[a.rank] - BURA_CARD_STRENGTH[b.rank])[0];
      return { action: 'PLAY', cards: [lowestTrump] };
    }

    // D. Stolga javob berish (Urish yoki Tashlash)
    const requiredCount = engine.lastLeadCards.length;
    if (bot.hand.length < requiredCount) return { action: 'FOLD', cards: bot.hand };

    // Qo'ldagi kartalardan requiredCount ta unikal kartani kombinatsiyalarini qidiramiz
    const getCombinations = (arr: Card[], k: number): Card[][] => {
      if (k === 0) return [[]];
      if (arr.length < k) return [];
      const head = arr[0];
      const tail = arr.slice(1);
      const withHead = getCombinations(tail, k - 1).map(c => [head, ...c]);
      const withoutHead = getCombinations(tail, k);
      return [...withHead, ...withoutHead];
    };

    const candidateCombinations = getCombinations(bot.hand, requiredCount);
    let bestBeatingCards: Card[] | null = null;
    let minBeatingPoints = 999;

    for (const combo of candidateCombinations) {
      const match = engine.findBeatingMatching(engine.lastLeadCards, combo);
      if (match) {
        // Ushbu kombinatsiya barcha kartalarni ura oladi!
        const pts = combo.reduce((sum, c) => sum + BURA_CARD_POINTS[c.rank], 0);
        if (pts < minBeatingPoints) {
          minBeatingPoints = pts;
          bestBeatingCards = combo;
        }
      }
    }

    // Usta bot: 0 ochkoli yurishni kozir sarflab urmaydi (koloda hali ko'p bo'lsa) - kozirni katta vzyatkaga asraydi
    if (bestBeatingCards && level === 'HARD') {
      const leadPoints = engine.lastLeadCards.reduce((sum, c) => sum + BURA_CARD_POINTS[c.rank], 0);
      const spendsTrump = bestBeatingCards.some(c => c.suit === engine.trumpSuit);
      if (spendsTrump && leadPoints === 0 && engine.deck.length > 4) {
        return { action: 'FOLD', cards: engine.getCheapestCards(bot.hand, requiredCount) };
      }
    }

    // Agar barcha kartalarni ura olsa - uradi!
    if (bestBeatingCards) {
      return { action: 'PLAY', cards: bestBeatingCards };
    }

    // Ura olmasa, eng arzon (0 ochkolik) va nokozir kartalarni tashlaydi (10, A va kozirlarni asraydi!)
    const sortedDiscards = [...bot.hand].sort((a, b) => {
      const aIsTrump = a.suit === engine.trumpSuit;
      const bIsTrump = b.suit === engine.trumpSuit;
      if (!aIsTrump && bIsTrump) return -1;
      if (aIsTrump && !bIsTrump) return 1;

      const ptDiff = BURA_CARD_POINTS[a.rank] - BURA_CARD_POINTS[b.rank];
      if (ptDiff !== 0) return ptDiff;

      return BURA_CARD_STRENGTH[a.rank] - BURA_CARD_STRENGTH[b.rank];
    });

    return { action: 'FOLD', cards: sortedDiscards.slice(0, requiredCount) };
  }

  // 2. 108 O'YINI UCHUN BOT QARORI
  public static make108Move(engine: OneHundredEightEngine, botId: string, level: BotLevel = 'MEDIUM'): { action: 'PLAY' | 'DRAW'; card?: Card; chosenSuit?: Suit } {
    const bot = engine.players.find(p => p.id === botId);
    if (!bot || bot.hand.length === 0) return { action: 'DRAW' };

    // Tashlash mumkin bo'lgan barcha kartalarni topamiz
    const playableCards = bot.hand.filter(c => engine.canPlayCard(c));

    if (playableCards.length === 0) {
      return { action: 'DRAW' };
    }

    if (actsRandomly(level)) {
      return { action: 'PLAY', card: pickRandom(playableCards), chosenSuit: pickRandom(['HEARTS', 'DIAMONDS', 'SPADES', 'CLUBS'] as Suit[]) };
    }

    // Mast buyurtma qiluvchi karta (1-variantda Valet, 2-variantda Dama)
    const isSuitChanger = (c: Card) =>
      (engine.oneHundredEightRule === 'KOROL_QARGA' && c.rank === 'J') || (engine.oneHundredEightRule === 'KOROL_OLMA' && c.rank === 'Q');

    // Bot o'zida eng ko'p bo'lgan mastni aniqlaydi (Valet yoki Dama tashlaganda buyurtma qilish uchun)
    const suitCounts: Record<Suit, number> = { HEARTS: 0, DIAMONDS: 0, SPADES: 0, CLUBS: 0 };
    for (const c of bot.hand) {
      // Buyurtma qiluvchi kartaning o'zi tashlab yuboriladi - uni hisobga olmaymiz
      if (!isSuitChanger(c)) suitCounts[c.suit]++;
    }
    let bestSuit: Suit = 'HEARTS';
    let maxCount = -1;
    for (const [s, count] of Object.entries(suitCounts) as [Suit, number][]) {
      if (count > maxCount) {
        maxCount = count;
        bestSuit = s;
      }
    }

    // Maxsus kartalarni tekshiramiz (masalan ♠ Qirol yoki ♥ Qirol)
    const specialAttackCard = playableCards.find(c => 
      (c.suit === 'SPADES' && c.rank === 'K') || 
      (c.suit === 'HEARTS' && c.rank === 'K') || 
      c.rank === '7' || 
      c.rank === '6'
    );
    if (specialAttackCard) {
      return { action: 'PLAY', card: specialAttackCard };
    }

    // Oddiy yurish: qo'lda qolsa eng ko'p jarima beradigan kartadan birinchi qutulamiz.
    // Damani esa oxiriga asraymiz: yolg'iz qolsa ham, oxirgi karta sifatida tashlansa -20/-40 minus beradi.
    const value = (c: Card) => (c.rank === 'Q' ? -1 : OneHundredEightEngine.handPenalty([c]));
    // Usta bot mast buyurtma qiluvchi kartani boshqa iloji qolmaguncha asraydi
    const pool = level === 'HARD' && playableCards.some(c => !isSuitChanger(c))
      ? playableCards.filter(c => !isSuitChanger(c))
      : playableCards;
    const byPenalty = [...pool].sort((a, b) => value(b) - value(a));
    return {
      action: 'PLAY',
      card: byPenalty[0],
      chosenSuit: bestSuit,
    };
  }

  // 3. DURAK O'YINI UCHUN BOT QARORI
  public static makeDurakMove(engine: DurakEngine, botId: string, level: BotLevel = 'MEDIUM'): { action: 'ATTACK' | 'DEFEND' | 'TAKE' | 'PASS'; card?: Card; targetCardId?: string } {
    const bot = engine.players.find(p => p.id === botId);
    if (!bot || bot.hand.length === 0) return { action: 'PASS' };

    const isDefender = engine.players[engine.defenderIndex]?.id === botId;

    if (isDefender) {
      // Himoyachi roli: urilmagan har bir kartani eng arzon mos karta bilan urishga urinadi
      const unbeatenTricks = engine.tableCards.filter(tc => !tc.beatenBy);
      if (unbeatenTricks.length === 0) return { action: 'PASS' };

      if (actsRandomly(level)) {
        const trick = pickRandom(unbeatenTricks);
        const options = bot.hand.filter(c => canBeatCard(trick.card, c, engine.trumpSuit));
        if (options.length > 0) return { action: 'DEFEND', card: pickRandom(options), targetCardId: trick.card.id };
        return { action: 'TAKE' };
      }

      const byStrength = (a: Card, b: Card) => {
        const aTrump = a.suit === engine.trumpSuit ? 20 : 0;
        const bTrump = b.suit === engine.trumpSuit ? 20 : 0;
        return (CARD_STRENGTH[a.rank] + aTrump) - (CARD_STRENGTH[b.rank] + bTrump);
      };
      for (const trick of unbeatenTricks) {
        const validDefenders = bot.hand.filter(c => canBeatCard(trick.card, c, engine.trumpSuit)).sort(byStrength);
        if (validDefenders.length > 0) {
          const best = validDefenders[0];
          // Usta bot: o'yin boshida arzon nokozir kartani katta kozir (Dama/Qirol/Tuz) bilan urmaydi - olib qo'ya qoladi
          const wastesBigTrump = best.suit === engine.trumpSuit && trick.card.suit !== engine.trumpSuit && CARD_STRENGTH[best.rank] >= 12;
          if (level === 'HARD' && wastesBigTrump && engine.deck.length >= 10 && engine.tableCards.length <= 2) {
            return { action: 'TAKE' };
          }
          return { action: 'DEFEND', card: best, targetCardId: trick.card.id };
        }
      }

      // Ura olmasa, kartalarni oladi
      return { action: 'TAKE' };
    } else {
      // Hujumchi roli
      if (engine.tableCards.length === 0) {
        if (actsRandomly(level)) return { action: 'ATTACK', card: pickRandom(bot.hand) };
        // Birinchi hujum: eng kichik nokozir karta bilan hujum qiladi.
        // Usta bot juftligi bor nominalni afzal ko'radi - keyin yana tashlash imkoni bo'ladi.
        const rankCount = (c: Card) => bot.hand.filter(h => h.rank === c.rank && h.suit !== engine.trumpSuit).length;
        const value = (c: Card) =>
          CARD_STRENGTH[c.rank] + (c.suit === engine.trumpSuit ? 20 : 0) - (level === 'HARD' ? 2 * (rankCount(c) - 1) : 0);
        const minValue = Math.min(...bot.hand.map(value));
        // Bir xil kuchli kartalar orasidan tasodifiy tanlaymiz - botlar bir xil holatni cheksiz takrorlamasligi uchun
        const weakest = bot.hand.filter(c => value(c) === minValue);
        return { action: 'ATTACK', card: weakest[Math.floor(Math.random() * weakest.length)] };
      }

      // Podkidnoy qilish mumkin bo'lgan kartalar
      const allowedRanks = new Set<string>();
      for (const tc of engine.tableCards) {
        allowedRanks.add(tc.card.rank);
        if (tc.beatenBy) allowedRanks.add(tc.beatenBy.rank);
      }
      // Kozirni behuda tashlamaslik: avval nokozir mos kartalar
      const matches = bot.hand.filter(c => allowedRanks.has(c.rank));
      const nonTrumpMatches = matches.filter(c => c.suit !== engine.trumpSuit);
      const pool = nonTrumpMatches.length > 0 ? nonTrumpMatches : matches;
      if (pool.length > 0) {
        // Usta bot o'yin boshida kozirni tashlamaydi
        if (level === 'HARD' && nonTrumpMatches.length === 0 && engine.deck.length >= 6) return { action: 'PASS' };
        return { action: 'ATTACK', card: pool[Math.floor(Math.random() * pool.length)] };
      }

      return { action: 'PASS' };
    }
  }
}
