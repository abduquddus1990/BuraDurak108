import { BaseEngine } from './BaseEngine';
import { Card, CARD_STRENGTH } from '../../../shared/src/types/card';
import { RoomSettings, DurakRules, TableState } from '../../../shared/src/types/game';
import { canBeatCard } from '../../../shared/src/utils/deck';

// Bitta hujumda stolga tashlanadigan kartalar chegarasi
const MAX_ATTACK_CARDS = 6;
// Botlar bir xil holatni cheksiz takrorlab qolmasligi uchun: shuncha hujumdan keyin o'yin durang bilan tugaydi
const MAX_BOUTS = 300;

export class DurakEngine extends BaseEngine {
  public durakRule: DurakRules;
  public defenderIndex: number = 1;
  public attackerIndex: number = 0;
  public passedPlayers: Set<string> = new Set();
  public boutCount: number = 0;

  constructor(roomId: string, settings: RoomSettings) {
    super(roomId, settings);
    this.durakRule = settings.rules as DurakRules;
  }

  public override initGame(): void {
    super.initGame();
    this.dealCardsToAll(6);

    // 1-raundda eng kichik kozirga ega o'yinchi birinchi hujum qiladi
    let lowestTrumpRankVal = 999;
    let starterIndex = 0;
    for (let i = 0; i < this.players.length; i++) {
      for (const card of this.players[i].hand) {
        if (card.suit === this.trumpSuit) {
          const strength = CARD_STRENGTH[card.rank];
          if (strength < lowestTrumpRankVal) {
            lowestTrumpRankVal = strength;
            starterIndex = i;
          }
        }
      }
    }

    this.boutCount = 0;
    this.attackerIndex = starterIndex;
    this.defenderIndex = (starterIndex + 1) % this.players.length;
    this.activePlayerIndex = this.attackerIndex;
    this.passedPlayers.clear();
    this.updatePlayerTurns();
  }

  // Kolodada ham, qo'lida ham karta qolmagan o'yinchi o'yindan chiqqan hisoblanadi
  private isOut(index: number): boolean {
    return this.deck.length === 0 && this.players[index].hand.length === 0;
  }

  // from dan keyingi o'yinda qolgan o'yinchi (topilmasa from ning o'zi)
  private nextInGame(from: number): number {
    const n = this.players.length;
    for (let step = 1; step <= n; step++) {
      const idx = (from + step) % n;
      if (!this.isOut(idx)) return idx;
    }
    return from;
  }

  // Yangi hujum: hujumchi va himoyachini belgilash
  private startNewBout(attacker: number): void {
    this.boutCount++;
    if (this.boutCount >= MAX_BOUTS) {
      this.status = 'GAME_OVER';
      this.winnerId = undefined;
      this.updatePlayerTurns();
      return;
    }
    this.attackerIndex = this.isOut(attacker) ? this.nextInGame(attacker) : attacker;
    this.defenderIndex = this.nextInGame(this.attackerIndex);
    this.activePlayerIndex = this.attackerIndex;
    this.passedPlayers.clear();
    this.updatePlayerTurns();
  }

  public isDefenderNeighbor(playerIndex: number): boolean {
    const n = this.players.length;
    if (n < 4) return true;

    // Chap qo'shni (counter-clockwise)
    let left = (this.defenderIndex - 1 + n) % n;
    while (left !== this.defenderIndex && this.players[left].hand.length === 0 && this.deck.length === 0) {
      left = (left - 1 + n) % n;
    }

    // O'ng qo'shni (clockwise)
    let right = (this.defenderIndex + 1) % n;
    while (right !== this.defenderIndex && this.players[right].hand.length === 0 && this.deck.length === 0) {
      right = (right + 1) % n;
    }

    return playerIndex === left || playerIndex === right;
  }

  // Hujum qilish (Karta tashlash)
  public attack(playerId: string, card: Card): { success: boolean; message: string } {
    if (this.status !== 'PLAYING') return { success: false, message: "O'yin hozir faol emas" };
    const playerIndex = this.players.findIndex(p => p.id === playerId);
    if (playerIndex === -1) return { success: false, message: "O'yinchi topilmadi" };

    if (playerIndex === this.defenderIndex) {
      return { success: false, message: "Himoyachi hujum qila olmaydi!" };
    }

    // Yangi hujumni faqat navbatdagi hujumchi boshlaydi
    if (this.tableCards.length === 0 && playerIndex !== this.attackerIndex) {
      return { success: false, message: "Hujumni navbatdagi hujumchi boshlaydi!" };
    }

    // 4 yoki 6 kishi o'ynaganda faqat himoyachining ikki yonidagi o'yinchilar hujum qila oladi!
    if (this.players.length >= 4 && !this.isDefenderNeighbor(playerIndex)) {
      return {
        success: false,
        message: "4 yoki 6 kishilik o'yinda faqat himoyachining yonidagi raqiblar (qo'shnilar) karta tashlay oladi!",
      };
    }

    const player = this.players[playerIndex];
    if (!player.hand.some(c => c.id === card.id)) {
      return { success: false, message: "Qo'lingizda bu karta yo'q!" };
    }

    if (this.tableCards.length > 0) {
      const allowedRanks = new Set<string>();
      for (const tc of this.tableCards) {
        allowedRanks.add(tc.card.rank);
        if (tc.beatenBy) allowedRanks.add(tc.beatenBy.rank);
      }
      if (!allowedRanks.has(card.rank)) {
        return { success: false, message: "Faqat stoldagi mavjud kartalar nominali bilan tashlash mumkin!" };
      }
    }

    // Himoyachi ura oladigandan ko'p karta tashlab bo'lmaydi
    const defender = this.players[this.defenderIndex];
    const unbeatenCount = this.tableCards.filter(tc => !tc.beatenBy).length;
    if (this.tableCards.length >= MAX_ATTACK_CARDS || unbeatenCount + 1 > defender.hand.length) {
      return { success: false, message: "Himoyachida bunchalik karta yo'q - boshqa tashlab bo'lmaydi!" };
    }

    player.hand = player.hand.filter(c => c.id !== card.id);
    this.tableCards.push({
      playerId,
      card,
    });

    this.activePlayerIndex = this.defenderIndex;
    this.passedPlayers.clear();
    this.updatePlayerTurns();
    return { success: true, message: `${player.username} ${card.suit}_${card.rank} bilan hujum qildi.` };
  }

  // Himoyalanish (Kartani urish)
  public defend(playerId: string, targetCardId: string, defenseCard: Card): { success: boolean; message: string } {
    if (this.status !== 'PLAYING') return { success: false, message: "O'yin hozir faol emas" };
    if (this.players[this.defenderIndex].id !== playerId) {
      return { success: false, message: "Siz himoyachi emassiz!" };
    }

    const defender = this.players[this.defenderIndex];
    if (!defender.hand.some(c => c.id === defenseCard.id)) {
      return { success: false, message: "Qo'lingizda bu karta yo'q!" };
    }

    const targetTrick = this.tableCards.find(tc => tc.card.id === targetCardId && !tc.beatenBy);
    if (!targetTrick) {
      return { success: false, message: "Ushbu karta allaqachon urilgan yoki topilmadi!" };
    }

    if (!canBeatCard(targetTrick.card, defenseCard, this.trumpSuit)) {
      return { success: false, message: "Bu karta bilan urib bo'lmaydi!" };
    }

    defender.hand = defender.hand.filter(c => c.id !== defenseCard.id);
    targetTrick.beatenBy = defenseCard;
    targetTrick.beatenByPlayerId = playerId;

    const allBeaten = this.tableCards.every(tc => !!tc.beatenBy);
    if (allBeaten) {
      this.activePlayerIndex = this.attackerIndex;
    }
    this.updatePlayerTurns();
    return { success: true, message: `${defender.username} kartani urdi!` };
  }

  // Perekidli (Perevodnoy) o'tkazish
  public transferAttack(playerId: string, transferCard: Card): { success: boolean; message: string } {
    if (this.status !== 'PLAYING') return { success: false, message: "O'yin hozir faol emas" };
    if (this.durakRule !== 'PEREKIDLI') {
      return { success: false, message: "Bu xonada perevodnoy qoidasi o'chirilgan!" };
    }
    if (this.players[this.defenderIndex].id !== playerId) {
      return { success: false, message: "Faqat himoyachi kartani o'tkaza oladi!" };
    }

    if (this.tableCards.length === 0) {
      return { success: false, message: "Stolda o'tkaziladigan karta yo'q!" };
    }

    const anyBeaten = this.tableCards.some(tc => !!tc.beatenBy);
    if (anyBeaten) {
      return { success: false, message: "Urilgan kartalarni o'tkazib bo'lmaydi!" };
    }

    const defender = this.players[this.defenderIndex];
    if (!defender.hand.some(c => c.id === transferCard.id)) {
      return { success: false, message: "Qo'lingizda bu karta yo'q!" };
    }

    if (!this.tableCards.every(tc => tc.card.rank === transferCard.rank)) {
      return { success: false, message: "O'tkazish uchun stoldagi karta bilan bir xil nominaldagi karta kerak!" };
    }

    // Yangi himoyachi o'tkazilgan barcha kartalarni ura olishi uchun yetarli kartaga ega bo'lishi kerak
    const newDefenderIndex = this.nextInGame(this.defenderIndex);
    if (this.players[newDefenderIndex].hand.length < this.tableCards.length + 1) {
      return { success: false, message: "Keyingi o'yinchida yetarli karta yo'q - o'tkazib bo'lmaydi!" };
    }

    defender.hand = defender.hand.filter(c => c.id !== transferCard.id);
    this.tableCards.push({
      playerId,
      card: transferCard,
    });

    this.attackerIndex = this.defenderIndex;
    this.defenderIndex = newDefenderIndex;
    this.activePlayerIndex = this.defenderIndex;
    this.updatePlayerTurns();

    return { success: true, message: `${defender.username} hujumni ${this.players[this.defenderIndex].username} ga o'tkazdi!` };
  }

  // Himoyachi kartalarni olishi (Vzyal / Karta olish)
  public takeCards(playerId: string): { success: boolean; message: string } {
    if (this.status !== 'PLAYING') return { success: false, message: "O'yin hozir faol emas" };
    if (this.players[this.defenderIndex].id !== playerId) {
      return { success: false, message: "Faqat himoyachi kartalarni olishi mumkin!" };
    }

    if (this.tableCards.length === 0) {
      return { success: false, message: "Stolda olinadigan karta yo'q!" };
    }

    const defender = this.players[this.defenderIndex];
    for (const tc of this.tableCards) {
      defender.hand.push(tc.card);
      if (tc.beatenBy) defender.hand.push(tc.beatenBy);
    }
    this.tableCards = [];

    // Avval hujumchi, himoyachi esa oxirida to'ldiradi
    this.dealCardsRoundRobin(6, this.attackerIndex);

    this.checkGameEnd();
    if (this.status === 'PLAYING') {
      // Olgan o'yinchi navbatini yo'qotadi: keyingi hujum undan keyingi o'yinchidan boshlanadi
      this.startNewBout(this.nextInGame(this.defenderIndex));
    }

    return { success: true, message: `${defender.username} stoldagi barcha kartalarni oldi!` };
  }

  // Bita / Otboy / Pas
  public passOrBita(playerId: string): { success: boolean; message: string } {
    if (this.status !== 'PLAYING') return { success: false, message: "O'yin hozir faol emas" };
    const playerIndex = this.players.findIndex(p => p.id === playerId);
    if (playerIndex === -1) return { success: false, message: "O'yinchi topilmadi" };
    if (playerIndex === this.defenderIndex) {
      return { success: false, message: "Himoyachi bita deya olmaydi - urish yoki olish kerak!" };
    }
    if (this.tableCards.length === 0) {
      return { success: false, message: "Stol bo'sh - avval hujum qiling!" };
    }
    if (!this.tableCards.every(tc => !!tc.beatenBy)) {
      return { success: false, message: "Hali hamma karta urilmagan!" };
    }

    this.passedPlayers.add(playerId);
    const previousDefender = this.defenderIndex;
    this.tableCards = [];
    this.dealCardsRoundRobin(6, this.attackerIndex);

    this.checkGameEnd();
    if (this.status === 'PLAYING') {
      // Muvaffaqiyatli himoyalangan o'yinchi keyingi hujumni boshlaydi
      this.startNewBout(previousDefender);
    }

    return { success: true, message: "Bita (Otboy)! Stol tozalandi, yangi hujum boshlanadi." };
  }

  private checkGameEnd(): void {
    const playersWithCards = this.players.filter(p => p.hand.length > 0);
    if (this.deck.length === 0 && playersWithCards.length <= 1) {
      this.status = 'GAME_OVER';
      if (playersWithCards.length === 1) {
        // Qo'lida karta qolgan o'yinchi - durak; g'olib sifatida birinchi chiqqan o'yinchi ko'rsatiladi
        this.winnerId = this.players.find(p => p.id !== playersWithCards[0].id)?.id;
      }
      this.updatePlayerTurns();
    }
  }

  // Durakda faqat oxirida kartasi qolgan o'yinchi ("durak") yutqazadi, qolganlarning hammasi yutgan hisoblanadi
  public override getFinalResults(): { winners: string[]; losers: string[] } {
    const withCards = this.players.filter(p => p.hand.length > 0);
    if (this.status !== 'GAME_OVER' || withCards.length !== 1) return { winners: [], losers: [] };
    return {
      winners: this.players.filter(p => p.id !== withCards[0].id).map(p => p.id),
      losers: [withCards[0].id],
    };
  }

  public override getTableState(): TableState {
    const base = super.getTableState();
    return {
      ...base,
      currentDefenderId: this.players[this.defenderIndex]?.id,
      currentAttackerId: this.players[this.attackerIndex]?.id,
    };
  }
}
