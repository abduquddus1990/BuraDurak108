import { BaseEngine } from './BaseEngine';
import { Card, Suit, BURA_CARD_POINTS, BURA_CARD_STRENGTH } from '../../../shared/src/types/card';
import { RoomSettings, BuraRules, RoundSummary, RoundPlayerResult, TableState } from '../../../shared/src/types/game';
import { detectSpecialCombinations, canBeatCard } from '../../../shared/src/utils/deck';

export class BuraEngine extends BaseEngine {
  public buraRule: BuraRules;
  public cardsPerHand: number;
  public lastLeadCards: Card[] = [];
  public currentTrickWinnerIndex: number = 0;
  public leadPlayerIndex: number = 0;
  public passCount: number = 0;
  public playedCountInTrick: number = 0;
  public roundSummary?: RoundSummary;
  public isResolvingTrick: boolean = false;
  // Partiya Moskva bilan tugagan bo'lsa - uning egasi
  public moskvaWinnerId?: string;
  // "Tuxum" (яйцо): qo'l durang tugasa keyingi qo'l jarimalari 2 barobar (yana tuxum bo'lsa 4, 8 ...)
  public eggMultiplier: number = 1;

  constructor(roomId: string, settings: RoomSettings) {
    super(roomId, settings);
    this.buraRule = settings.rules as BuraRules;
    this.cardsPerHand = this.buraRule === 'SIX_CARDS' ? 6 : 4;
  }

  public override initGame(): void {
    super.initGame();
    this.cardsPerHand = this.buraRule === 'SIX_CARDS' ? 6 : 4;
    this.roundNumber = 1;
    this.roundSummary = undefined;
    this.isResolvingTrick = false;
    this.moskvaWinnerId = undefined;
    this.eggMultiplier = 1;

    for (const player of this.players) {
      player.penaltyPoints = 0; // O'yin boshida jarima 0
      player.score = 0;
      player.wonCards = [];
    }

    this.startNewHand();
  }

  public startNewHand(): void {
    this.deck = this.createAndShuffleDeck();
    this.isLastTrumpRevealed = false;
    this.revealedTrumpCard = undefined;
    this.specialCombinationAlert = null;

    for (const player of this.players) {
      player.hand = [];
      player.score = 0;
      player.wonCards = [];
    }

    this.dealCardsRoundRobin(this.cardsPerHand, 0);

    // Foydalanuvchi qoidasi: So'nggi kartadan bitta oldingi karta OCHIQ va u KOZER.
    // Eng so'nggi karta esa koloda ostidagi yopiq karta bo'ladi va faqat oxirgi krugda ochilib kozer almashadi.
    if (this.deck.length >= 2) {
      this.trumpCard = this.deck[this.deck.length - 2];
      this.trumpSuit = this.trumpCard.suit;
    } else if (this.deck.length === 1) {
      this.trumpCard = this.deck[0];
      this.trumpSuit = this.trumpCard.suit;
    }

    // 1-raundda eng kichik kozirga ega o'yinchi birinchi yuradi.
    // Keyingi raundlarda esa oldingi raund g'olibi boshlaydi.
    let starterIndex = 0;
    if (this.roundNumber === 1) {
      let lowestTrumpRank = 999;
      for (let i = 0; i < this.players.length; i++) {
        for (const card of this.players[i].hand) {
          if (card.suit === this.trumpSuit) {
            const strength = BURA_CARD_STRENGTH[card.rank];
            if (strength < lowestTrumpRank) {
              lowestTrumpRank = strength;
              starterIndex = i;
            }
          }
        }
      }
    } else if (this.winnerId) {
      const prevWinner = this.players.findIndex(p => p.id === this.winnerId);
      if (prevWinner !== -1) starterIndex = prevWinner;
    }

    this.leadPlayerIndex = starterIndex;
    this.activePlayerIndex = starterIndex;
    this.currentTrickWinnerIndex = starterIndex;
    this.passCount = 0;
    this.playedCountInTrick = 0;
    this.tableCards = [];
    this.lastLeadCards = [];
    this.status = 'PLAYING';
    this.roundSummary = undefined;
    this.isResolvingTrick = false;
    this.updatePlayerTurns();

    // Moskva yoki Burani avtomatik tekshirish
    this.autoCheckInstantWins();
  }

  public is6CardsMode(): boolean {
    return this.buraRule === 'SIX_CARDS';
  }

  private comboSize(): number {
    return this.is6CardsMode() ? 5 : 4;
  }

  // Moskva (4 ta Tuz) yoki Burani navbatsiz avtomatik e'lon qilish
  private autoCheckInstantWins(): boolean {
    if (this.status !== 'PLAYING') return false;
    for (const player of this.players) {
      const combinations = detectSpecialCombinations(
        player.hand,
        this.trumpSuit,
        player.id,
        this.is6CardsMode(),
        this.buraRule
      );

      const moskva = combinations.find(c => c.type === 'MOSKVA');
      if (moskva) {
        this.status = 'GAME_OVER';
        this.winnerId = player.id;
        this.specialCombinationAlert = {
          playerId: player.id,
          playerName: player.username,
          type: 'MOSKVA',
          cards: moskva.cards,
          title: '👑 MOSKVA! (4 ta Tuz)',
          description: `${player.username} qo'lida 4 ta Tuz ochib, butun o'yin g'olibi bo'ldi!`,
          timestamp: Date.now(),
        };
        this.finishRoundWithWinner(player, `👑 MOSKVA! 4 ta Tuz bilan ${player.username} butun o'yinni yutdi!`, true);
        return true;
      }

      const bura = combinations.find(c => c.type === 'BURA');
      if (bura) {
        player.score = 61;
        this.specialCombinationAlert = {
          playerId: player.id,
          playerName: player.username,
          type: 'BURA',
          cards: bura.cards,
          title: `⚡ BURA! (${this.comboSize()} ta Kozir)`,
          description: `${player.username} ${this.comboSize()} ta Kozir (Bura) ochib, raundda g'alaba qozondi!`,
          timestamp: Date.now(),
        };
        this.finishRoundWithWinner(player, `⚡ BURA! Kozirlar bilan ${player.username} raundni yutdi!`);
        return true;
      }
    }
    return false;
  }

  // Navbatdagi o'yinchining avtomatik Molodka yoki 41+ kombinatsiyasini tekshirish
  public checkActivePlayerAutoCombinations(): boolean {
    const activePlayer = this.players[this.activePlayerIndex];
    if (this.status !== 'PLAYING' || !activePlayer || this.tableCards.length > 0) return false;

    const combinations = detectSpecialCombinations(
      activePlayer.hand,
      this.trumpSuit,
      activePlayer.id,
      this.is6CardsMode(),
      this.buraRule
    );

    const molodka = combinations.find(c => c.type === 'MOLODKA');
    if (molodka) {
      this.specialCombinationAlert = {
        playerId: activePlayer.id,
        playerName: activePlayer.username,
        type: 'MOLODKA',
        cards: molodka.cards,
        title: `🔨 MOLODKA! (${this.comboSize()} ta bir xil mast)`,
        description: `${activePlayer.username} ${this.comboSize()} ta bir xil mast (Molodka) bilan navbatsiz yurdi!`,
        timestamp: Date.now(),
      };
      this.playCards(activePlayer.id, molodka.cards);
      return true;
    }

    const fortyOne = combinations.find(c => c.type === 'FORTY_ONE');
    if (fortyOne) {
      this.specialCombinationAlert = {
        playerId: activePlayer.id,
        playerName: activePlayer.username,
        type: 'FORTY_ONE',
        cards: fortyOne.cards,
        title: '🎯 41+ OCHKO!',
        description: `${activePlayer.username} bir yurishda 41 dan ortiq ochkolik kartalar bilan yurdi!`,
        timestamp: Date.now(),
      };
      this.playCards(activePlayer.id, fortyOne.cards);
      return true;
    }

    return false;
  }

  // Kombinatsiyalarni qo'lda e'lon qilish (agar tugma bosilsa)
  public declareCombination(playerId: string, combinationType: string): { success: boolean; message: string } {
    if (this.status !== 'PLAYING') return { success: false, message: "O'yin hozir faol emas" };
    if (this.isResolvingTrick) return { success: false, message: "Vzyatka hisoblanmoqda, biroz kuting..." };
    const playerIndex = this.players.findIndex(p => p.id === playerId);
    if (playerIndex === -1) return { success: false, message: "O'yinchi topilmadi" };

    const player = this.players[playerIndex];
    const combinations = detectSpecialCombinations(
      player.hand,
      this.trumpSuit,
      playerId,
      this.is6CardsMode(),
      this.buraRule
    );
    const matched = combinations.find(c => c.type === combinationType);

    if (!matched) {
      return { success: false, message: "Ushbu kombinatsiya qo'lingizda mavjud emas!" };
    }

    if (matched.type === 'MOSKVA') {
      this.status = 'GAME_OVER';
      this.winnerId = playerId;
      this.specialCombinationAlert = {
        playerId: player.id,
        playerName: player.username,
        type: 'MOSKVA',
        cards: matched.cards,
        title: '👑 MOSKVA! (4 ta Tuz)',
        description: `${player.username} qo'lida 4 ta Tuz ochib, butun o'yinda mutlaq g'olib bo'ldi!`,
        timestamp: Date.now(),
      };
      this.finishRoundWithWinner(player, `👑 MOSKVA! 4 ta Tuz bilan ${player.username} butun o'yinni yutdi!`, true);
      return { success: true, message: `👑 MOSKVA! ${player.username} butun o'yinni yutdi!` };
    }

    if (matched.type === 'BURA') {
      player.score = 61;
      this.specialCombinationAlert = {
        playerId: player.id,
        playerName: player.username,
        type: 'BURA',
        cards: matched.cards,
        title: `⚡ BURA! (${this.comboSize()} ta Kozir)`,
        description: `${player.username} ${this.comboSize()} ta Kozir (Bura) ochib, raundda g'alaba qozondi!`,
        timestamp: Date.now(),
      };
      this.finishRoundWithWinner(player, `⚡ BURA! ${player.username} raundni yutdi!`);
      return { success: true, message: `⚡ BURA! ${player.username} raundni yutdi!` };
    }

    if (this.activePlayerIndex !== playerIndex) {
      return { success: false, message: "Molodka yoki 41+ kombinatsiyasini faqat o'z navbatingizda ochishingiz mumkin!" };
    }

    if (matched.type === 'MOLODKA' || matched.type === 'FORTY_ONE') {
      this.specialCombinationAlert = {
        playerId: player.id,
        playerName: player.username,
        type: matched.type,
        cards: matched.cards,
        title: matched.type === 'MOLODKA' ? `🔨 MOLODKA! (${this.comboSize()} ta bir xil mast)` : '🎯 41+ OCHKO!',
        description: matched.type === 'MOLODKA'
          ? `${player.username} ${this.comboSize()} ta bir xil mast (Molodka) bilan navbatsiz yurdi!`
          : `${player.username} 41 dan ortiq ochkolik kartalar bilan yurdi!`,
        timestamp: Date.now(),
      };
      return this.playCards(playerId, matched.cards);
    }

    return { success: false, message: "Noma'lum harakat" };
  }

  // Kombinatsiyalarni topish va solishtirish (Ko'p kartali yurishni urish)
  public findBeatingMatching(leadCards: Card[], defenseCards: Card[]): Card[] | null {
    if (leadCards.length !== defenseCards.length) return null;
    const n = leadCards.length;
    const getPermutations = (arr: Card[]): Card[][] => {
      if (arr.length <= 1) return [arr];
      const result: Card[][] = [];
      for (let i = 0; i < arr.length; i++) {
        const current = arr[i];
        const remaining = [...arr.slice(0, i), ...arr.slice(i + 1)];
        for (const p of getPermutations(remaining)) {
          result.push([current, ...p]);
        }
      }
      return result;
    };

    const perms = getPermutations(defenseCards);
    for (const perm of perms) {
      let allBeat = true;
      for (let i = 0; i < n; i++) {
        if (!canBeatCard(leadCards[i], perm[i], this.trumpSuit, true)) {
          allBeat = false;
          break;
        }
      }
      if (allBeat) {
        return perm;
      }
    }
    return null;
  }

  // Karta tashlash / Urish
  public playCards(playerId: string, cards: Card[]): { success: boolean; message: string; trickCompleted?: boolean } {
    if (this.status !== 'PLAYING') {
      return { success: false, message: "O'yin hozir faol emas" };
    }
    if (!Array.isArray(cards) || cards.length === 0) {
      return { success: false, message: "Kamida bitta karta tanlang!" };
    }
    if (this.isResolvingTrick) {
      return { success: false, message: "Vzyatka hisoblanmoqda, biroz kuting..." };
    }

    const playerIndex = this.players.findIndex(p => p.id === playerId);
    if (playerIndex === -1) return { success: false, message: "O'yinchi topilmadi" };
    if (this.activePlayerIndex !== playerIndex) return { success: false, message: "Hozir sizning navbatingiz emas!" };

    // Bir xil kartani takrorlashni taqiqlash
    const uniqueIds = new Set(cards.map(c => c.id));
    if (uniqueIds.size !== cards.length) {
      return { success: false, message: "Bir xil kartani bir necha marta tashlab bo'lmaydi!" };
    }

    const player = this.players[playerIndex];

    for (const card of cards) {
      if (!player.hand.some(c => c.id === card.id)) {
        return { success: false, message: "Qo'lingizda bu karta yo'q!" };
      }
    }

    // A. Birinchi yurish (Stol bo'sh)
    if (this.tableCards.length === 0) {
      if (cards.length > 1) {
        const firstSuit = cards[0].suit;
        const allSameSuit = cards.every(c => c.suit === firstSuit);
        const totalPoints = cards.reduce((sum, c) => sum + BURA_CARD_POINTS[c.rank], 0);

        // 41 lik qoida faqat FORTY_ONE rejimida ruxsat etiladi
        if (!allSameSuit && (this.buraRule !== 'FORTY_ONE' || totalPoints < 41)) {
          return { success: false, message: "Bir nechta karta bilan faqat bir xil mastda yurish mumkin!" };
        }
      }

      if (cards.length >= 4) {
        const firstSuit = cards[0].suit;
        const allSameSuit = cards.every(c => c.suit === firstSuit);
        const totalPoints = cards.reduce((sum, c) => sum + BURA_CARD_POINTS[c.rank], 0);
        if (allSameSuit && firstSuit !== this.trumpSuit) {
          this.specialCombinationAlert = {
            playerId: player.id,
            playerName: player.username,
            type: 'MOLODKA',
            cards,
            title: `🔨 MOLODKA! (${this.comboSize()} ta bir xil mast)`,
            description: `${player.username} ${this.comboSize()} ta bir xil mast (Molodka) bilan yurdi!`,
            timestamp: Date.now(),
          };
        } else if (totalPoints >= 41) {
          this.specialCombinationAlert = {
            playerId: player.id,
            playerName: player.username,
            type: 'FORTY_ONE',
            cards,
            title: '🎯 41+ OCHKO!',
            description: `${player.username} bir yurishda 41 dan ortiq ochkolik kartalar bilan yurdi!`,
            timestamp: Date.now(),
          };
        }
      }

      player.hand = player.hand.filter(c => !cards.some(rc => rc.id === c.id));
      for (const card of cards) {
        this.tableCards.push({
          playerId,
          card,
          isFaceDown: false,
        });
      }
      this.lastLeadCards = cards;
      this.leadPlayerIndex = playerIndex;
      this.currentTrickWinnerIndex = playerIndex;
      this.passCount = 0;
      this.playedCountInTrick = 1;

      if (this.is6CardsMode()) {
        // Qaytarmada qo'llar teng emas - javob bera olmaydiganlar avtomatik o'tkazib yuboriladi
        if (this.advanceQaytarmaTurn()) {
          return { success: true, trickCompleted: true, message: `${player.username} yurdi. Hech kim javob bera olmadi, vzyatkani o'zi oldi!` };
        }
        return { success: true, message: `${player.username} ${cards.length} ta karta bilan yurdi` };
      }

      this.nextTurn();
      this.checkActivePlayerAutoCombinations();
      return { success: true, message: `${player.username} ${cards.length} ta karta bilan yurdi` };
    }

    // B. Stolga javob berish
    const openCardsCount = this.lastLeadCards.length;
    if (cards.length !== openCardsCount) {
      return { success: false, message: `Stoldagi ${openCardsCount} ta kartaga teng miqdorda (${openCardsCount} ta) karta tashlashingiz kerak!` };
    }

    // Ura olishini tekshirish (10 > K > Q > J tartibida)
    const matchedDefenseCards = this.findBeatingMatching(this.lastLeadCards, cards);
    const canBeatAll = matchedDefenseCards !== null;

    player.hand = player.hand.filter(c => !cards.some(rc => rc.id === c.id));

    // --- REJIM 1: 6-TALIK QAYTARMA BURA (Doiraviy qaytarish) ---
    if (this.is6CardsMode()) {
      if (canBeatAll && matchedDefenseCards) {
        for (let i = 0; i < openCardsCount; i++) {
          const leadCardToBeat = this.lastLeadCards[i];
          const tc = this.tableCards.find(t => t.card.id === leadCardToBeat.id && !t.beatenBy);
          if (tc) {
            tc.beatenBy = matchedDefenseCards[i];
            tc.beatenByPlayerId = playerId;
          } else {
            this.tableCards.push({
              playerId,
              card: matchedDefenseCards[i],
              beatenBy: matchedDefenseCards[i],
              beatenByPlayerId: playerId,
              isFaceDown: false,
            });
          }
        }
        this.lastLeadCards = matchedDefenseCards;
        this.currentTrickWinnerIndex = playerIndex;
        this.passCount = 0;

        if (this.advanceQaytarmaTurn()) {
          const winnerName = this.players[this.currentTrickWinnerIndex].username;
          return { success: true, trickCompleted: true, message: `${player.username} kartalarni urdi. Vzyatkani ${winnerName} oldi!` };
        }
        return { success: true, message: `${player.username} kartalarni urdi! Qaytarma aylanmoqda, qaytarib urish mumkin!` };
      } else {
        // Raqib urolmay yotgan karta yopiq (face-down) tashlansin!
        for (const card of cards) {
          this.tableCards.push({
            playerId,
            card,
            isFaceDown: true,
          });
        }
        this.passCount++;

        if (this.passCount >= this.players.length - 1) {
          this.isResolvingTrick = true;
          const winnerName = this.players[this.currentTrickWinnerIndex].username;
          return { success: true, trickCompleted: true, message: `${player.username} kartalarni yopiq tashladi. Vzyatkani ${winnerName} oldi!` };
        } else {
          if (this.advanceQaytarmaTurn()) {
            const winnerName = this.players[this.currentTrickWinnerIndex].username;
            return { success: true, trickCompleted: true, message: `${player.username} kartalarni yopiq tashladi. Vzyatkani ${winnerName} oldi!` };
          }
          return { success: true, message: `${player.username} kartalarni yopiq tashladi.` };
        }
      }
    }

    // --- REJIM 2: 4-TALIK BURA (Oxirgi o'yinchi urgach davra davom etmaydi) ---
    this.playedCountInTrick++;

    if (canBeatAll && matchedDefenseCards) {
      for (let i = 0; i < openCardsCount; i++) {
        const leadCardToBeat = this.lastLeadCards[i];
        const tc = this.tableCards.find(t => t.card.id === leadCardToBeat.id && !t.beatenBy);
        if (tc) {
          tc.beatenBy = matchedDefenseCards[i];
          tc.beatenByPlayerId = playerId;
        } else {
          this.tableCards.push({
            playerId,
            card: matchedDefenseCards[i],
            beatenBy: matchedDefenseCards[i],
            beatenByPlayerId: playerId,
            isFaceDown: false,
          });
        }
      }
      this.lastLeadCards = matchedDefenseCards;
      this.currentTrickWinnerIndex = playerIndex;
    } else {
      // Urolmagan karta yopiq (face-down) holda tashlansin
      for (const card of cards) {
        this.tableCards.push({
          playerId,
          card,
          isFaceDown: true,
        });
      }
    }

    if (this.playedCountInTrick >= this.players.length) {
      this.isResolvingTrick = true;
      const winnerName = this.players[this.currentTrickWinnerIndex].username;
      return { success: true, trickCompleted: true, message: `${player.username} javob berdi. Vzyatkani ${winnerName} oldi!` };
    }

    this.nextTurn();
    this.checkActivePlayerAutoCombinations();
    return { success: true, message: `${player.username} javob berdi.` };
  }

  // 6 talik qaytarmada navbatni keyingi o'yinchiga beradi. Qo'lida javob berishga yetarli karta
  // qolmagan o'yinchi avtomatik "pas" hisoblanadi (aks holda o'yin qotib qolardi).
  // Vzyatka yakunlansa true qaytaradi.
  private advanceQaytarmaTurn(): boolean {
    for (let i = 0; i < this.players.length; i++) {
      this.nextTurn();
      const active = this.players[this.activePlayerIndex];
      if (active.hand.length >= this.lastLeadCards.length) {
        this.checkActivePlayerAutoCombinations();
        return false;
      }
      this.passCount++;
      if (this.passCount >= this.players.length - 1) {
        this.isResolvingTrick = true;
        return true;
      }
    }
    this.isResolvingTrick = true;
    return true;
  }

  // Eng arzon kartalar (nokozir, kam ochkoli) - tashlash uchun
  public getCheapestCards(hand: Card[], count: number): Card[] {
    return [...hand]
      .sort((a, b) => {
        const aIsTrump = a.suit === this.trumpSuit ? 1 : 0;
        const bIsTrump = b.suit === this.trumpSuit ? 1 : 0;
        if (aIsTrump !== bIsTrump) return aIsTrump - bIsTrump;
        const ptDiff = BURA_CARD_POINTS[a.rank] - BURA_CARD_POINTS[b.rank];
        if (ptDiff !== 0) return ptDiff;
        return BURA_CARD_STRENGTH[a.rank] - BURA_CARD_STRENGTH[b.rank];
      })
      .slice(0, count);
  }

  public foldOrPass(playerId: string, foldCards: Card[]): { success: boolean; message: string; trickCompleted?: boolean } {
    // Tanlangan kartalar soni stoldagiga teng bo'lmasa, eng arzonlari avtomatik tanlanadi
    const player = this.players.find(p => p.id === playerId);
    const required = this.lastLeadCards.length;
    if (player && this.tableCards.length > 0 && required > 0 && foldCards.length !== required) {
      foldCards = this.getCheapestCards(player.hand, required);
    }
    return this.playCards(playerId, foldCards);
  }

  // Bura uchun maxsus navbatma-navbat (round-robin) kartalarni taqsimlash
  public dealCardsInBura(winnerIndex: number): void {
    let anyCardDealt = true;
    while (anyCardDealt && this.deck.length > 0) {
      anyCardDealt = false;
      for (let i = 0; i < this.players.length; i++) {
        const pIndex = (winnerIndex + i) % this.players.length;
        const player = this.players[pIndex];
        if (player.hand.length < this.cardsPerHand && this.deck.length > 0) {
          // Agar kolodada faqat 1 ta (eng oxirgi) karta qolgan bo'lsa:
          if (this.deck.length === 1) {
            const lastCard = this.deck.shift()!;
            // SO'NGGI YOPUQ KARTA OCHILADI VA YANGI KOZER BO'LADI!
            this.isLastTrumpRevealed = true;
            this.revealedTrumpCard = lastCard;
            this.trumpSuit = lastCard.suit;
            this.trumpCard = undefined; // Stoldan olinadi, ortiqcha qolmaydi!
            player.hand.push(lastCard);
            anyCardDealt = true;
            break;
          } else {
            // Agar 2 ta karta qolgan bo'lsa, ochiq kozer stoldan olinib o'yinchining qo'liga o'tadi
            if (this.deck.length === 2 && this.trumpCard) {
              this.trumpCard = undefined;
            }
            const card = this.deck.shift();
            if (card) {
              player.hand.push(card);
              anyCardDealt = true;
            }
          }
        }
      }
    }

    for (const player of this.players) {
      player.cardsCount = player.hand.length;
    }
  }

  public resolveTrick(): void {
    if (!this.isResolvingTrick || this.status !== 'PLAYING') return;
    this.isResolvingTrick = false;
    this.specialCombinationAlert = null;
    const winner = this.players[this.currentTrickWinnerIndex];
    winner.wonCards = winner.wonCards || [];

    // Qayta urishda (3 kishilik yoki 6 talik) bitta karta stolda ham "card", ham "beatenBy" sifatida
    // turishi mumkin - shuning uchun har bir karta id bo'yicha faqat bir marta sanaladi.
    const trickCards = new Map<string, Card>();
    for (const tc of this.tableCards) {
      trickCards.set(tc.card.id, tc.card);
      if (tc.beatenBy) trickCards.set(tc.beatenBy.id, tc.beatenBy);
    }
    let trickScore = 0;
    for (const card of trickCards.values()) {
      trickScore += BURA_CARD_POINTS[card.rank] || 0;
      winner.wonCards.push(card);
    }
    winner.score += trickScore;

    this.tableCards = [];
    this.lastLeadCards = [];
    this.passCount = 0;
    this.playedCountInTrick = 0;

    // 61 ochko yig'ilsa raund tugaydi
    if (winner.score >= 61) {
      this.finishRoundWithWinner(winner, `${winner.username} 61 ochko yig'di!`);
      return;
    }

    // Kartalarni to'ldirish (G'olib birinchi oladi, navbatma-navbat 1 tadan)
    this.dealCardsInBura(this.currentTrickWinnerIndex);

    // 6 talik qaytarmada qo'llar teng bo'lmay qoladi. Koloda tugab, faqat bitta o'yinchida karta qolsa -
    // ularga raqib yo'q, shuning uchun kartalar egasining hisobiga o'tadi va raund yakunlanadi.
    const playersWithCards = this.players.filter(p => p.hand.length > 0);
    if (this.deck.length === 0 && playersWithCards.length < 2) {
      for (const p of playersWithCards) {
        p.wonCards = p.wonCards || [];
        p.wonCards.push(...p.hand);
        p.score += p.hand.reduce((sum, c) => sum + (BURA_CARD_POINTS[c.rank] || 0), 0);
        p.hand = [];
        p.cardsCount = 0;
      }
      this.finishRoundByCardsEnd();
      return;
    }

    // Vzyatka g'olibining qo'li bo'sh bo'lsa (koloda tugagan), yurish kartasi bor keyingi o'yinchiga o'tadi
    let leaderIndex = this.currentTrickWinnerIndex;
    for (let i = 0; i < this.players.length && this.players[leaderIndex].hand.length === 0; i++) {
      leaderIndex = (leaderIndex + 1) % this.players.length;
    }
    this.currentTrickWinnerIndex = leaderIndex;

    this.activePlayerIndex = this.currentTrickWinnerIndex;
    this.updatePlayerTurns();
    if (this.autoCheckInstantWins()) return;
    this.checkActivePlayerAutoCombinations();
  }

  // Raund yakuni va Burkozel -12 (12 jarima) tizimi bo'yicha hisob-kitob
  private finishRoundWithWinner(winner: any, reason: string, endsWholeGame: boolean = false): void {
    this.winnerId = winner.id;
    this.calculateRoundPenalties(winner, reason, endsWholeGame);
  }

  private finishRoundByCardsEnd(): void {
    const maxScore = Math.max(...this.players.map(p => p.score));
    const leaders = this.players.filter(p => p.score === maxScore);

    if (leaders.length >= 2) {
      this.declareEgg(leaders.map(p => p.username));
      return;
    }

    const winner = leaders[0];
    this.winnerId = winner.id;
    this.calculateRoundPenalties(winner, "Barcha kartalar o'ynaldi!");
  }

  // Tuxum: eng ko'p ochko teng - hech kimga jarima yozilmaydi, qo'l qayta tarqatiladi,
  // keyingi qo'l jarimalari 2 barobar oshadi. Keyingi qo'lni oldingi qo'l boshlovchisi boshlaydi.
  private declareEgg(tiedNames: string[]): void {
    this.eggMultiplier *= 2;
    this.status = 'ROUND_OVER';
    this.roundSummary = {
      roundNumber: this.roundNumber,
      results: this.players.map(p => ({
        playerId: p.id,
        username: p.username,
        wonCards: p.wonCards || [],
        roundScore: p.score,
        roundPenalty: 0,
        totalPenalty: p.penaltyPoints,
        readyForNext: p.isBot,
      })),
      isGameOver: false,
      reason: `🥚 TUXUM! ${tiedNames.join(' va ')} teng ochko to'pladi. Keyingi qo'l jarimalari x${this.eggMultiplier}!`,
      winnerId: undefined,
    };
  }

  private calculateRoundPenalties(winner: any, reason: string, endsWholeGame: boolean = false): void {
    const results: RoundPlayerResult[] = [];

    for (const p of this.players) {
      let roundPenalty = 0;
      if (p.id === winner.id) {
        roundPenalty = 0; // G'olibga jarima yo'q
      } else {
        // Burkozel qoidalari:
        // Agar 0 ochko olsa: 6 jarima (yuvilmadi)
        // Agar 0 < ochko < 31: 4 jarima
        // Agar 31 <= ochko < 61: 2 jarima
        if (p.score === 0) {
          roundPenalty = 6;
        } else if (p.score < 31) {
          roundPenalty = 4;
        } else {
          roundPenalty = 2;
        }
      }

      roundPenalty *= this.eggMultiplier;
      p.penaltyPoints += roundPenalty;

      results.push({
        playerId: p.id,
        username: p.username,
        wonCards: p.wonCards || [],
        roundScore: p.score,
        roundPenalty,
        totalPenalty: p.penaltyPoints,
        readyForNext: p.isBot,
      });
    }

    this.eggMultiplier = 1;

    // O'yin -12 gacha (12 jarimagacha) davom etadi
    const hasMatchLoser = this.players.some(p => p.penaltyPoints >= 12);
    // Moskva butun partiyani darhol tugatadi (ilgari bu yerda ROUND_OVER ga qaytib qolardi)
    if (endsWholeGame) this.moskvaWinnerId = winner.id;
    if (hasMatchLoser || endsWholeGame) {
      this.status = 'GAME_OVER';
    } else {
      this.status = 'ROUND_OVER';
    }

    this.roundSummary = {
      roundNumber: this.roundNumber,
      results,
      isGameOver: this.status === 'GAME_OVER',
      reason,
      winnerId: winner.id,
    };
  }

  // Hammaning roziligi bilan keyingi qo'lga o'tish
  public playerReadyForNextRound(playerId: string): boolean {
    if (!this.roundSummary) return false;
    const playerResult = this.roundSummary.results.find(r => r.playerId === playerId);
    if (playerResult) {
      playerResult.readyForNext = true;
    }

    const allReady = this.roundSummary.results.every(r => r.readyForNext);
    if (allReady) {
      if (this.status === 'ROUND_OVER') {
        this.roundNumber++;
        this.startNewHand();
        return true;
      }
    }
    return false;
  }

  public override getFinalResults(): { winners: string[]; losers: string[] } {
    if (this.moskvaWinnerId) {
      return {
        winners: [this.moskvaWinnerId],
        losers: this.players.filter(p => p.id !== this.moskvaWinnerId).map(p => p.id),
      };
    }
    // Burkozel: 12 jarimaga yetganlar yutqazadi, eng kam jarimali o'yinchi(lar) yutadi
    const losers = this.players.filter(p => p.penaltyPoints >= 12);
    const others = this.players.filter(p => p.penaltyPoints < 12);
    if (losers.length === 0 || others.length === 0) return { winners: [], losers: [] };
    const minPenalty = Math.min(...others.map(p => p.penaltyPoints));
    return {
      winners: others.filter(p => p.penaltyPoints === minPenalty).map(p => p.id),
      losers: losers.map(p => p.id),
    };
  }

  public override getTableState(): TableState {
    const base = super.getTableState();
    return {
      ...base,
      // Yopiq tashlangan kartaning qiymati tarmoq orqali yuborilmaydi (devtools orqali ko'rib olmaslik uchun)
      tableCards: this.tableCards.map((tc, idx) =>
        tc.isFaceDown
          ? { ...tc, card: { id: `hidden_${idx}`, suit: 'SPADES' as const, rank: '6' as const } }
          : tc
      ),
      roundSummary: this.roundSummary,
      eggMultiplier: this.eggMultiplier,
    };
  }
}
