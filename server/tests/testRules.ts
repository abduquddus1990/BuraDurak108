// Foydalanuvchi tasdiqlagan choyxona qoidalari: Bura "tuxum", 108 damalari va tarqatuvchi, Durak qo'shnilari
import { BuraEngine } from '../src/engine/BuraEngine';
import { DurakEngine } from '../src/engine/DurakEngine';
import { OneHundredEightEngine } from '../src/engine/OneHundredEightEngine';
import { Card, Rank, Suit } from '../../shared/src/types/card';
import { GameRules, GameType, RoomSettings } from '../../shared/src/types/game';

function assert(condition: boolean, testName: string) {
  if (!condition) {
    console.error(`❌ TEST FAILED: ${testName}`);
    process.exit(1);
  }
  console.log(`✅ TEST PASSED: ${testName}`);
}

const card = (suit: Suit, rank: Rank): Card => ({ suit, rank, id: `${suit}_${rank}` });
const settings = (gameType: GameType, rules: GameRules, maxPlayers: number): RoomSettings => ({
  id: 't', gameType, rules, maxPlayers, turnTimeoutSeconds: 15, isPrivate: true, deckType: '36',
});

console.log('--- 🧪 CHOYXONA QOIDALARI TESTLARI ---\n');

// 1. Bura: tuxum (teng ochko) -> jarima yo'q, keyingi qo'l jarimalari x2, yana tuxum -> x4
{
  const bura = new BuraEngine('b', settings('BURA', 'ODDIY', 2));
  bura.addPlayer({ id: 'p1', username: 'Ali', isBot: false });
  bura.addPlayer({ id: 'p2', username: 'Vali', isBot: false });
  bura.initGame();
  const finish = () => (bura as any).finishRoundByCardsEnd();
  // Yangi qo'lni tarqatmasdan holatni tiklaymiz: tasodifiy tarqatishdagi Bura/Moskva ko'paytiruvchini
  // "sarflab" yubormasligi uchun (bu test faqat jarima hisobini tekshiradi)
  const nextHand = () => {
    bura.status = 'PLAYING';
    bura.roundSummary = undefined;
  };

  bura.players[0].score = 60;
  bura.players[1].score = 60;
  finish();
  assert(bura.status === 'ROUND_OVER' && bura.players.every(p => p.penaltyPoints === 0), "Tuxum: teng ochkoda hech kimga jarima yozilmadi");
  assert(bura.eggMultiplier === 2 && !!bura.roundSummary?.reason?.includes('TUXUM'), 'Tuxumdan keyin ko\'paytiruvchi x2');

  nextHand();
  bura.players[0].score = 70;
  bura.players[1].score = 20;
  finish();
  assert(bura.players[1].penaltyPoints === 8, "31 dan kam ochko bilan yutqazgan: 4 x2 = 8 jarima");
  assert(bura.eggMultiplier === 1, "Oddiy qo'ldan keyin ko'paytiruvchi 1 ga qaytdi");

  // Ketma-ket ikki tuxum -> x4
  bura.players.forEach(p => (p.penaltyPoints = 0));
  nextHand();
  bura.players[0].score = 60; bura.players[1].score = 60; finish();
  nextHand();
  bura.players[0].score = 60; bura.players[1].score = 60; finish();
  assert(bura.eggMultiplier === 4, 'Ikkinchi tuxum: x4');
  nextHand();
  bura.players[0].score = 80;
  bura.players[1].score = 40;
  finish();
  assert(bura.players[1].penaltyPoints === 8, "31+ ochko bilan yutqazgan: 2 x4 = 8 jarima");
}

// 2. 108: qo'lda qolgan damalar (♠ = 40, boshqalar = 20) va 6+7+K = 17
{
  const e = new OneHundredEightEngine('e', settings('ONE_HUNDRED_EIGHT', 'KOROL_OLMA', 3));
  e.addPlayer({ id: 'p1', username: 'Ali', isBot: false });
  e.addPlayer({ id: 'p2', username: 'Vali', isBot: false });
  e.addPlayer({ id: 'p3', username: 'Hasan', isBot: false });
  e.initGame();
  e.activePlayerIndex = 0;
  e.pendingPenaltyCards = 0;
  e.pendingPenaltyRank = null;
  e.topDiscardCard = card('HEARTS', '9');
  e.activeSuit = 'HEARTS';
  e.players[0].hand = [card('HEARTS', '10')];
  e.players[1].hand = [card('CLUBS', '6'), card('CLUBS', '7'), card('CLUBS', 'K')];
  e.players[2].hand = [card('SPADES', 'Q'), card('HEARTS', 'Q')];
  e.playCard('p1', card('HEARTS', '10'));
  assert(e.players[1].penaltyPoints === 17, '6 + 7 + Qirol = 17 ochko');
  assert(e.players[2].penaltyPoints === 60, "Qarg'a damasi 40 + boshqa dama 20 = 60 ochko");
}

// 3. 108: dama bilan chiqib ketsa minus ochko (75 -> 35, 0 -> -40, boshqa dama -20)
{
  const e = new OneHundredEightEngine('e', settings('ONE_HUNDRED_EIGHT', 'KOROL_QARGA', 2));
  e.addPlayer({ id: 'p1', username: 'Ali', isBot: false });
  e.addPlayer({ id: 'p2', username: 'Vali', isBot: false });
  e.initGame();
  const finishWith = (lastCard: Card, startPoints: number) => {
    e.status = 'PLAYING';
    e.roundSummary = undefined;
    e.activePlayerIndex = 0;
    e.pendingPenaltyCards = 0;
    e.pendingPenaltyRank = null;
    e.topDiscardCard = card(lastCard.suit, '9');
    e.activeSuit = lastCard.suit;
    e.players[0].penaltyPoints = startPoints;
    e.players[1].penaltyPoints = 0;
    e.players[0].hand = [lastCard];
    e.players[1].hand = [card('DIAMONDS', '6')];
    e.playCard('p1', lastCard);
  };
  finishWith(card('SPADES', 'Q'), 75);
  assert(e.players[0].penaltyPoints === 35, "Qarg'a damasi bilan chiqdi: 75 - 40 = 35");
  finishWith(card('SPADES', 'Q'), 0);
  assert(e.players[0].penaltyPoints === -40, "Nol ochko bilan: -40 dan davom etadi");
  finishWith(card('HEARTS', 'Q'), 50);
  assert(e.players[0].penaltyPoints === 30, 'Boshqa dama bilan chiqdi: 50 - 20 = 30');
  finishWith(card('HEARTS', 'K'), 50);
  assert(e.players[0].penaltyPoints === 50, "Damasiz chiqqanda ochko o'zgarmaydi");
}

// 4. 108: eng ko'p ochkoli (yutqazayotgan) o'yinchi tarqatadi, undan keyingisi yuradi
{
  const e = new OneHundredEightEngine('e', settings('ONE_HUNDRED_EIGHT', 'KOROL_OLMA', 3));
  e.addPlayer({ id: 'p1', username: 'Ali', isBot: false });
  e.addPlayer({ id: 'p2', username: 'Vali', isBot: false });
  e.addPlayer({ id: 'p3', username: 'Hasan', isBot: false });
  e.initGame();
  assert(e.dealerIndex === 0 && e.activePlayerIndex === 1, "1-qo'l: Ali tarqatdi, Vali boshlaydi");

  e.players[0].penaltyPoints = 10;
  e.players[1].penaltyPoints = 20;
  e.players[2].penaltyPoints = 50;
  e.status = 'ROUND_OVER';
  e.roundSummary = { roundNumber: 1, results: e.players.map(p => ({ playerId: p.id, username: p.username, wonCards: [], roundScore: 0, roundPenalty: 0, totalPenalty: p.penaltyPoints, readyForNext: false })), isGameOver: false };
  ['p1', 'p2', 'p3'].forEach(id => e.playerReadyForNextRound(id));
  assert(e.dealerIndex === 2, "Eng ko'p ochkoli Hasan tarqatdi");
  assert(e.activePlayerIndex === 0, "Hasandan keyingi Ali birinchi yuradi");
  assert(e.getTableState().dealerId === 'p3', 'Tarqatuvchi klientga yuboriladi');
  assert(e.players.every(p => p.hand.length === 4), "Hammaga 4 tadan karta tarqatildi");
}

// 5. Durak (4 kishi): faqat himoyachining ikki yonidagilar tashlaydi, ikkalasi bita demaguncha hujum tugamaydi
{
  const d = new DurakEngine('d', settings('DURAK', 'PEREKIDSIZ', 4));
  ['p1', 'p2', 'p3', 'p4'].forEach(id => d.addPlayer({ id, username: id, isBot: false }));
  d.initGame();
  d.trumpSuit = 'HEARTS';
  d.attackerIndex = 0;
  d.defenderIndex = 1; // qo'shnilari: p1 (0) va p3 (2); p4 (3) - qarshisida
  d.activePlayerIndex = 0;
  d.tableCards = [];
  d.players[0].hand = [card('CLUBS', '6'), card('SPADES', '9')];
  d.players[1].hand = [card('CLUBS', '7'), card('DIAMONDS', 'A'), card('DIAMONDS', 'K')];
  d.players[2].hand = [card('DIAMONDS', '6'), card('SPADES', '10')];
  d.players[3].hand = [card('CLUBS', '8'), card('SPADES', 'J')];
  d.updatePlayerTurns();

  assert(d.attack('p1', card('CLUBS', '6')).success, 'Hujumchi (chap qo\'shni) hujum qildi');
  assert(d.defend('p2', 'CLUBS_6', card('CLUBS', '7')).success, 'Himoyachi urdi');
  assert(!d.passOrBita('p4').success, "Qo'shni bo'lmagan o'yinchi bita deya olmaydi");
  assert(d.passOrBita('p1').success && d.activePlayerIndex === 2, "Ali bita dedi -> navbat o'ng qo'shni Hasanda");
  assert(d.attack('p3', card('DIAMONDS', '6')).success, "O'ng qo'shni mos nominal (6) tashladi");
  assert(d.defend('p2', 'DIAMONDS_6', card('DIAMONDS', 'A')).success && d.activePlayerIndex === 0, "Himoyachi urdi, navbat yana hujumchida");
  assert(d.passOrBita('p1').success && d.tableCards.length > 0, "Karta tashlangani uchun Ali yana bita dedi, lekin Hasan kutilmoqda");
  assert(d.passOrBita('p3').success && d.tableCards.length === 0, "Ikkala qo'shni bita dedi - hujum tugadi");
  assert(d.attackerIndex === 1, "Muvaffaqiyatli himoyalangan Vali keyingi hujumni boshlaydi");
}

console.log('\n🎉 CHOYXONA QOIDALARI TESTLARI O\'TDI!');
