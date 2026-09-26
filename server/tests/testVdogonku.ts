// Durak "vdogonku": himoyachi "olaman" degach qo'shnilar qo'shimcha karta tashlaydi, keyin hammasi olinadi
import { DurakEngine } from '../src/engine/DurakEngine';
import { Card, Rank, Suit } from '../../shared/src/types/card';
import { GameRules, RoomSettings } from '../../shared/src/types/game';

function assert(condition: boolean, testName: string) {
  if (!condition) {
    console.error(`❌ TEST FAILED: ${testName}`);
    process.exit(1);
  }
  console.log(`✅ TEST PASSED: ${testName}`);
}

const card = (suit: Suit, rank: Rank): Card => ({ suit, rank, id: `${suit}_${rank}` });
const settings = (rules: GameRules, maxPlayers: number): RoomSettings => ({
  id: 'd', gameType: 'DURAK', rules, maxPlayers, turnTimeoutSeconds: 15, isPrivate: true, deckType: '36',
});

console.log('--- 🧪 DURAK VDOGONKU TESTLARI ---\n');

// 1. To'liq oqim: olaman -> hujumchi tashlaydi -> tamom -> ikkinchi qo'shni tashlaydi -> cheklov to'ldi -> olindi
{
  const d = new DurakEngine('d', settings('PEREKIDSIZ', 3));
  ['p1', 'p2', 'p3'].forEach(id => d.addPlayer({ id, username: id, isBot: false }));
  d.initGame();
  d.trumpSuit = 'HEARTS';
  d.attackerIndex = 0;
  d.defenderIndex = 1;
  d.activePlayerIndex = 0;
  d.tableCards = [];
  d.players[0].hand = [card('CLUBS', '6'), card('DIAMONDS', '6'), card('SPADES', 'K')];
  d.players[1].hand = [card('CLUBS', '7'), card('CLUBS', '8'), card('DIAMONDS', '9')];
  d.players[2].hand = [card('SPADES', '6'), card('SPADES', '9')];
  d.updatePlayerTurns();

  d.attack('p1', card('CLUBS', '6'));
  assert(d.takeCards('p2').success && d.defenderTaking && d.tableCards.length === 1, "Himoyachi \"olaman\" dedi - kartalar hali stolda");
  assert(d.getTableState().defenderTaking === true, 'Holat klientga yuboriladi');
  assert(d.activePlayerIndex === 0, "Avval hujumchi qo'shimcha tashlaydi");
  assert(!d.defend('p2', 'CLUBS_6', card('CLUBS', '7')).success, "Olishga qaror qilgach urib bo'lmaydi");
  assert(!d.takeCards('p2').success, "Ikkinchi marta \"olaman\" deyish rad etiladi");
  assert(d.attack('p1', card('DIAMONDS', '6')).success, 'Hujumchi vdogonku tashladi');
  assert(d.activePlayerIndex === 2, "Hujumchida boshqa mos karta yo'q - navbat avtomatik ikkinchi qo'shniga o'tdi");
  assert(d.attack('p3', card('SPADES', '6')).success, "Ikkinchi qo'shni ham tashladi");
  assert(d.tableCards.length === 0 && !d.defenderTaking, "Cheklov to'ldi (himoyachida 3 ta karta) - avtomatik olindi");
  const takenIds = ['CLUBS_6', 'DIAMONDS_6', 'SPADES_6'];
  assert(takenIds.every(id => d.players[1].hand.some(c => c.id === id)), "Himoyachi uchala 6 ni oldi");
  assert(d.attackerIndex === 2, "Olgan o'yinchi navbatini yo'qotdi, keyingi hujum undan keyingisidan");
}

// 2. Hech kimda mos karta bo'lmasa - himoyachi darhol oladi
{
  const d = new DurakEngine('d2', settings('PEREKIDSIZ', 2));
  ['p1', 'p2'].forEach(id => d.addPlayer({ id, username: id, isBot: false }));
  d.initGame();
  d.attackerIndex = 0;
  d.defenderIndex = 1;
  d.activePlayerIndex = 0;
  d.tableCards = [];
  d.players[0].hand = [card('CLUBS', '6'), card('SPADES', 'K')];
  d.players[1].hand = [card('CLUBS', '7')];
  d.updatePlayerTurns();
  d.attack('p1', card('CLUBS', '6'));
  d.takeCards('p2');
  assert(!d.defenderTaking && d.tableCards.length === 0, "Tashlash uchun mos karta yo'q - darhol olindi");
}

// 3. Ikkala qo'shni ham "tamom" desa - olinadi; qo'shni bo'lmagan o'yinchi tashlay olmaydi
{
  const d = new DurakEngine('d3', settings('PEREKIDLI', 4));
  ['p1', 'p2', 'p3', 'p4'].forEach(id => d.addPlayer({ id, username: id, isBot: false }));
  d.initGame();
  d.trumpSuit = 'HEARTS';
  d.attackerIndex = 0;
  d.defenderIndex = 1;
  d.activePlayerIndex = 0;
  d.tableCards = [];
  d.players[0].hand = [card('CLUBS', '9'), card('DIAMONDS', '9')];
  d.players[1].hand = [card('CLUBS', '6'), card('CLUBS', '7'), card('CLUBS', '8'), card('SPADES', '7')];
  d.players[2].hand = [card('SPADES', '9')];
  d.players[3].hand = [card('HEARTS', '9')];
  d.updatePlayerTurns();
  d.attack('p1', card('CLUBS', '9'));
  d.takeCards('p2');
  assert(!d.attack('p4', card('HEARTS', '9')).success, "Qarshida o'tirgan (qo'shni emas) tashlay olmaydi");
  d.passOrBita('p1');
  assert(d.activePlayerIndex === 2 && d.defenderTaking, "Birinchi qo'shni tamom dedi - ikkinchisi kutilmoqda");
  d.passOrBita('p3');
  assert(!d.defenderTaking && d.players[1].hand.some(c => c.id === 'CLUBS_9'), "Ikkalasi tamom dedi - himoyachi oldi");
}

console.log('\n🎉 VDOGONKU TESTLARI O\'TDI!');
