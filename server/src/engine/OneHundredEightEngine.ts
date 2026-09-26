import { BaseEngine } from './BaseEngine';
import { Card, Suit, ONE_HUNDRED_EIGHT_POINTS } from '../../../shared/src/types/card';
import { RoomSettings, OneHundredEightRules, RoundSummary, RoundPlayerResult, TableState } from '../../../shared/src/types/game';
import { can108Play } from '../../../shared/src/utils/playable';

const SUITS: Suit[] = ['HEARTS', 'DIAMONDS', 'SPADES', 'CLUBS'];

export class OneHundredEightEngine extends BaseEngine {
  public oneHundredEightRule: OneHundredEightRules;
  public topDiscardCard?: Card;
  public pendingPenaltyCards: number = 0;
  public pendingPenaltyRank: '7' | '6' | null = null;
  public roundSummary?: RoundSummary;
  // Joriy navbatda bozordan karta olinganmi (pas faqat karta olingandan keyin mumkin)
  public hasDrawnThisTurn: boolean = false;
  // Joriy qo'lni tarqatgan o'yinchi; undan keyingi o'yinchi birinchi yuradi
  public dealerIndex: number = -1;

  constructor(roomId: string, settings: RoomSettings) {
    super(roomId, settings);
    this.oneHundredEightRule = settings.rules as OneHundredEightRules;
  }

  public override initGame(): void {
    super.initGame();
    this.roundNumber = 1;
    this.roundSummary = undefined;
    this.dealerIndex = -1;

    for (const p of this.players) {
      p.penaltyPoints = 0;
      p.isEliminated = false;
    }

    this.startNewHand();
  }

  public startNewHand(): void {
    this.pendingPenaltyCards = 0;
    this.pendingPenaltyRank = null;
    this.deck = this.createAndShuffleDeck();
    this.hasDrawnThisTurn = false;

    for (const player of this.players) {
      player.hand = [];
      player.isFolded = player.isEliminated || false;
    }

    this.dealerIndex = this.chooseDealer();
    const n = this.players.length;

    // Faqat o'yinda qolganlarga 4 tadan karta tarqatiladi (chiqib ketganlarga emas), tarqatuvchidan keyingisidan boshlab
    for (let round = 0; round < 4; round++) {
      for (let step = 1; step <= n; step++) {
        const player = this.players[(this.dealerIndex + step) % n];
        if (!player.isEliminated && this.deck.length > 0) {
          player.hand.push(this.deck.shift()!);
        }
      }
    }
    for (const player of this.players) {
      player.cardsCount = player.hand.length;
    }

    this.topDiscardCard = this.deck.shift();
    if (this.topDiscardCard) {
      this.tableCards = [{
        playerId: 'SYSTEM',
        card: this.topDiscardCard,
      }];
      this.activeSuit = this.topDiscardCard.suit;
    }

    // Tarqatuvchidan keyingi o'yinchi birinchi yuradi
    this.activePlayerIndex = this.dealerIndex;
    this.activePlayerIndex = this.getNextActivePlayerIndex();
    this.status = 'PLAYING';
    this.roundSummary = undefined;
    this.updatePlayerTurns();
  }

  // Tarqatuvchi: 1-qo'lda 1-o'rindiqdagi o'yinchi; keyin eng ko'p ochko to'plagan (yutqazayotgan) o'yinchi.
  // Ochkolar teng bo'lsa - oldingi tarqatuvchidan keyin birinchi kelgani.
  private chooseDealer(): number {
    const n = this.players.length;
    const active = this.players.map((p, i) => ({ p, i })).filter(x => !x.p.isEliminated);
    if (active.length === 0) return 0;
    if (this.dealerIndex === -1) return active[0].i;

    const maxPoints = Math.max(...active.map(x => x.p.penaltyPoints));
    for (let step = 1; step <= n; step++) {
      const idx = (this.dealerIndex + step) % n;
      const player = this.players[idx];
      if (!player.isEliminated && player.penaltyPoints === maxPoints) return idx;
    }
    return active[0].i;
  }

  // Dama yolg'iz o'zi qolgandagi (yoki oxirgi karta sifatida tashlangandagi) qiymati: Qarg'a (♠) 40, boshqalari 20
  public static loneQueenValue(card: Card): number {
    return card.suit === 'SPADES' ? 40 : 20;
  }

  // Qo'lda qolgan kartalar jarimasi. Dama faqat qo'lda yolg'iz o'zi qolsa 20/40 hisoblanadi;
  // yonida boshqa kartalar ham bo'lsa - oddiy 3 ochko.
  public static handPenalty(hand: Card[], loneQueenBonus: boolean = true): number {
    if (loneQueenBonus && hand.length === 1 && hand[0].rank === 'Q') return OneHundredEightEngine.loneQueenValue(hand[0]);
    return hand.reduce((sum, c) => sum + (ONE_HUNDRED_EIGHT_POINTS[c.rank] || 0), 0);
  }

  // Karta tashlash mumkinligini tekshirish
  public canPlayCard(card: Card): boolean {
    return can108Play(card, {
      topCard: this.topDiscardCard,
      activeSuit: this.activeSuit,
      pendingPenaltyCount: this.pendingPenaltyCards,
      pendingPenaltyRank: this.pendingPenaltyRank,
      rule: this.oneHundredEightRule,
    });
  }

  // Karta tashlash
  // Mast buyurtma qiluvchi karta: 1-variantda Valet, 2-variantda Dama
  private isSuitChanger(card: Card): boolean {
    return (this.oneHundredEightRule === 'KOROL_QARGA' && card.rank === 'J')
      || (this.oneHundredEightRule === 'KOROL_OLMA' && card.rank === 'Q');
  }

  public playCard(playerId: string, card: Card, requestedSuit?: Suit): { success: boolean; message: string } {
    if (this.status !== 'PLAYING') return { success: false, message: "O'yin hozir faol emas" };
    // Buyurtma faqat Valet/Dama bilan va faqat haqiqiy mast nomi bilan qabul qilinadi
    if (!requestedSuit || !SUITS.includes(requestedSuit) || !this.isSuitChanger(card)) {
      requestedSuit = undefined;
    }
    const playerIndex = this.players.findIndex(p => p.id === playerId);
    if (playerIndex === -1) return { success: false, message: "O'yinchi topilmadi" };
    if (this.activePlayerIndex !== playerIndex) return { success: false, message: "Hozir sizning navbatingiz emas!" };

    const player = this.players[playerIndex];
    if (player.isEliminated) return { success: false, message: "Siz o'yindan chiqib ketgansiz!" };

    if (!player.hand.some(c => c.id === card.id)) {
      return { success: false, message: "Qo'lingizda bu karta yo'q!" };
    }

    if (!this.canPlayCard(card)) {
      if (this.pendingPenaltyCards > 0) {
        return { success: false, message: `Stolda ${this.pendingPenaltyRank} zanjiri ketyapti (${this.pendingPenaltyCards} ta jarima)!` };
      }
      return { success: false, message: "Ushbu kartani tashlab bo'lmaydi! Mast yoki nominal mos kelishi kerak." };
    }

    player.hand = player.hand.filter(c => c.id !== card.id);
    this.topDiscardCard = card;
    this.tableCards.push({
      playerId,
      card,
    });
    this.activeSuit = requestedSuit || card.suit;
    this.hasDrawnThisTurn = false;

    // Raund g'alabasini tekshirish (Qo'lda karta qolmadi)
    if (player.hand.length === 0) {
      this.resolveRoundEnd(player.id, card);
      return { success: true, message: `🎉 ${player.username} barcha kartalaridan qutulib, raundda g'olib bo'ldi!` };
    }

    // 1. 7-LIK ZANJIRI (Stacking +2)
    if (card.rank === '7') {
      this.pendingPenaltyCards += 2;
      this.pendingPenaltyRank = '7';
      this.nextActiveTurn();
      return {
        success: true,
        message: `🔥 7 tashlandi! Jarima yig'ilmoqda: jami ${this.pendingPenaltyCards} ta karta!`
      };
    }

    // 2. 6-LIK ZANJIRI (Stacking +1)
    if (card.rank === '6') {
      this.pendingPenaltyCards += 1;
      this.pendingPenaltyRank = '6';
      this.nextActiveTurn();
      return {
        success: true,
        message: `⚡ 6 tashlandi! Jarima yig'ilmoqda: jami ${this.pendingPenaltyCards} ta karta!`
      };
    }

    const nextIndex = this.getNextActivePlayerIndex();
    const nextPlayer = this.players[nextIndex];

    // --- VARIANT 1 (KOROL_QARGA) ---
    if (this.oneHundredEightRule === 'KOROL_QARGA') {
      if (card.suit === 'SPADES' && card.rank === 'K') {
        this.drawCardsForPlayer(nextPlayer, 4);
        this.nextActiveTurn();
        this.nextActiveTurn();
        return { success: true, message: `♠ Qarg'a Qiroli! ${nextPlayer.username} 4 ta karta oldi va navbatini o'tkazdi!` };
      }

      if (card.rank === 'J' && requestedSuit) {
        this.activeSuit = requestedSuit;
        this.nextActiveTurn();
        return { success: true, message: `${player.username} yangi mast buyurtma qildi: ${requestedSuit}` };
      }
    }

    // --- VARIANT 2 (KOROL_OLMA) ---
    if (this.oneHundredEightRule === 'KOROL_OLMA') {
      if (card.suit === 'HEARTS' && card.rank === 'K') {
        this.drawCardsForPlayer(nextPlayer, 5);
        this.nextActiveTurn();
        this.nextActiveTurn();
        return { success: true, message: `♥ Olma Qiroli! ${nextPlayer.username} 5 ta karta oldi va navbatini o'tkazdi!` };
      }

      if (card.rank === 'Q' && requestedSuit) {
        this.activeSuit = requestedSuit;
        this.nextActiveTurn();
        return { success: true, message: `${player.username} yangi mast buyurtma qildi: ${requestedSuit}` };
      }
    }

    // 3. 8-LIK QOIDASI (Ikkala variant uchun):
    // 8 tashlagan o'yinchi unga mos gulda yana boshqa karta yurishga haqqi bor.
    // 8 ustidan yana 8 yurilsa, yangi 8 ning guliga moslab karta yuradi yoki Dama/Valet qoidasini ishlatib gul tanlaydi.
    if (card.rank === '8') {
      this.activeSuit = card.suit;
      this.updatePlayerTurns();
      return {
        success: true,
        message: `${player.username} 8 tashladi! Yangi mast: ${card.suit}. Shu mastda karta yoki 8/Dama tashlashi mumkin.`
      };
    }

    // Tuz (A) -> Propusk
    if (card.rank === 'A') {
      this.nextActiveTurn();
      this.nextActiveTurn();
      return { success: true, message: `${player.username} Tuz tashladi: ${nextPlayer.username} navbatini o'tkazdi.` };
    }

    this.nextActiveTurn();
    return { success: true, message: `${player.username} ${card.suit}_${card.rank} tashladi.` };
  }

  // Navbatni o'tkazish (Pas)
  public pass(playerId: string): { success: boolean; message: string } {
    if (this.status !== 'PLAYING') return { success: false, message: "O'yin hozir faol emas" };
    const playerIndex = this.players.findIndex(p => p.id === playerId);
    if (playerIndex === -1) return { success: false, message: "O'yinchi topilmadi" };
    if (this.activePlayerIndex !== playerIndex) return { success: false, message: "Hozir sizning navbatingiz emas!" };

    // Jarima zanjirida pas qilib qutulib bo'lmaydi - jarima kartalari olinishi shart
    if (this.pendingPenaltyCards > 0) {
      return { success: false, message: `Avval ${this.pendingPenaltyCards} ta jarima kartasini oling!` };
    }
    if (!this.hasDrawnThisTurn) {
      return { success: false, message: "Pas qilishdan oldin bozordan karta oling!" };
    }

    this.nextActiveTurn();
    return { success: true, message: `${this.players[playerIndex].username} navbatini o'tkazdi.` };
  }

  // Bozordan karta tortish
  public drawCard(playerId: string): { success: boolean; cardDrawn?: Card; message: string } {
    if (this.status !== 'PLAYING') return { success: false, message: "O'yin hozir faol emas" };
    const playerIndex = this.players.findIndex(p => p.id === playerId);
    if (playerIndex === -1) return { success: false, message: "O'yinchi topilmadi" };
    if (this.activePlayerIndex !== playerIndex) return { success: false, message: "Hozir sizning navbatingiz emas!" };

    const player = this.players[playerIndex];

    if (this.hasDrawnThisTurn) {
      return { success: false, message: "Bu navbatda allaqachon karta oldingiz - yuring yoki pas qiling." };
    }

    if (this.pendingPenaltyCards > 0) {
      const penaltyCount = this.pendingPenaltyCards;
      this.drawCardsForPlayer(player, penaltyCount);
      this.pendingPenaltyCards = 0;
      this.pendingPenaltyRank = null;
      this.nextActiveTurn();
      return {
        success: true,
        message: `${player.username} ${penaltyCount} ta jarima kartasini ko'tardi va navbat o'tdi.`
      };
    }

    if (this.deck.length === 0) {
      this.recycleTableCardsToDeck();
    }

    if (this.deck.length === 0) {
      this.nextActiveTurn();
      return { success: true, message: "Bozorda karta qolmadi, navbat o'tdi." };
    }

    const card = this.deck.shift()!;
    player.hand.push(card);
    player.cardsCount = player.hand.length;

    if (!this.canPlayCard(card)) {
      this.nextActiveTurn();
      return { success: true, cardDrawn: card, message: `${player.username} 1 ta karta oldi va navbat o'tdi.` };
    }

    this.hasDrawnThisTurn = true;
    this.updatePlayerTurns();
    return { success: true, cardDrawn: card, message: `${player.username} 1 ta karta oldi (tashlash imkoni bor).` };
  }

  private nextActiveTurn(): void {
    this.hasDrawnThisTurn = false;
    this.activePlayerIndex = this.getNextActivePlayerIndex();
    this.updatePlayerTurns();
  }

  private getNextActivePlayerIndex(): number {
    let next = (this.activePlayerIndex + 1) % this.players.length;
    let attempts = 0;
    while (this.players[next].isEliminated && attempts < this.players.length) {
      next = (next + 1) % this.players.length;
      attempts++;
    }
    return next;
  }

  private drawCardsForPlayer(player: any, count: number): void {
    for (let i = 0; i < count; i++) {
      if (this.deck.length === 0) {
        this.recycleTableCardsToDeck();
      }
      if (this.deck.length > 0) {
        player.hand.push(this.deck.shift()!);
      }
    }
    player.cardsCount = player.hand.length;
  }

  private recycleTableCardsToDeck(): void {
    if (this.tableCards.length <= 1) return;
    const lastCard = this.tableCards.pop()!;
    const cardsToRecycle = this.tableCards.map(tc => tc.card);
    this.tableCards = [lastCard];
    this.deck = cardsToRecycle.sort(() => Math.random() - 0.5);
  }

  // Raund yakuni, ochkolarni ochiq sanash va 108 dan oshganlarni chiqarish
  // Raund darhol tugaydi (oxirgi 6/7/Qirol ning jarimasi keyingi o'yinchiga o'tmaydi).
  // Oxirgi karta dama bo'lsa, chiqib ketgan o'yinchining ochkosidan ayriladi: ♠ dama -40, boshqa dama -20
  // (ochko manfiy bo'lishi ham mumkin).
  private resolveRoundEnd(roundWinnerId: string, lastCard?: Card): void {
    this.winnerId = roundWinnerId;
    const results: RoundPlayerResult[] = [];

    // Stol sozlamasida o'chirilgan bo'lsa - dama har doim 3 ochko, chiqishda minus yo'q
    const loneQueenBonus = this.settings.options?.loneQueenBonus !== false;
    for (const player of this.players) {
      let roundPenalty = 0;
      if (player.id === roundWinnerId) {
        if (loneQueenBonus && lastCard?.rank === 'Q') roundPenalty = -OneHundredEightEngine.loneQueenValue(lastCard);
      } else if (!player.isEliminated) {
        roundPenalty = OneHundredEightEngine.handPenalty(player.hand, loneQueenBonus);
      }

      player.penaltyPoints += roundPenalty;

      // Kamikadze: Aynan 108 bo'lsa 0 ga tushadi
      if (player.penaltyPoints === 108) {
        player.penaltyPoints = 0;
      } else if (player.penaltyPoints > 108) {
        // 108 dan oshgan o'yinchi chiqib ketadi!
        player.isEliminated = true;
        player.isFolded = true;
      }

      results.push({
        playerId: player.id,
        username: player.username,
        wonCards: player.hand, // Qo'lidagi qolgan kartalar ochiq ko'rsatiladi
        roundScore: 0,
        roundPenalty,
        totalPenalty: player.penaltyPoints,
        isEliminated: player.isEliminated,
        readyForNext: player.isBot,
      });
    }

    const activeRemaining = this.players.filter(p => !p.isEliminated);
    if (activeRemaining.length <= 1) {
      this.status = 'GAME_OVER';
      this.winnerId = activeRemaining[0]?.id || roundWinnerId;
    } else {
      this.status = 'ROUND_OVER';
    }

    this.roundSummary = {
      roundNumber: this.roundNumber,
      results,
      isGameOver: this.status === 'GAME_OVER',
      reason: `${this.players.find(p => p.id === roundWinnerId)?.username} kartalaridan qutuldi!`,
      winnerId: roundWinnerId,
    };
  }

  public override getFinalResults(): { winners: string[]; losers: string[] } {
    const remaining = this.players.filter(p => !p.isEliminated);
    if (remaining.length !== 1) return { winners: [], losers: [] };
    return { winners: [remaining[0].id], losers: this.players.filter(p => p.isEliminated).map(p => p.id) };
  }

  public override getTableState(): TableState {
    return {
      ...super.getTableState(),
      // Onlayn klient jarima zanjirini ko'rsatishi uchun (ilgari faqat lokal rejimda ko'rinardi)
      pendingPenaltyCount: this.pendingPenaltyCards,
      pendingPenaltyRank: this.pendingPenaltyRank,
      dealerId: this.players[this.dealerIndex]?.id,
      roundSummary: this.roundSummary,
    };
  }

  public playerReadyForNextRound(playerId: string): boolean {
    if (!this.roundSummary) return false;
    const playerResult = this.roundSummary.results.find(r => r.playerId === playerId);
    if (playerResult) {
      playerResult.readyForNext = true;
    }

    const allActiveReady = this.roundSummary.results
      .filter(r => !r.isEliminated)
      .every(r => r.readyForNext);

    if (allActiveReady) {
      if (this.status === 'ROUND_OVER') {
        this.roundNumber++;
        this.startNewHand();
        return true;
      }
    }
    return false;
  }
}
