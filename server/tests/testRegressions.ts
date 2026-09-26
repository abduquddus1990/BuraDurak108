import { BuraEngine } from '../src/engine/BuraEngine';
import { DurakEngine } from '../src/engine/DurakEngine';
import { OneHundredEightEngine } from '../src/engine/OneHundredEightEngine';
import { GameRoom } from '../src/rooms/GameRoom';
import { ChatManager } from '../src/chat/ChatManager';
import { BotAI } from '../src/ai/BotAI';
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
  id: `test_${gameType}_${rules}`,
  gameType,
  rules,
  maxPlayers,
  turnTimeoutSeconds: 15,
  isPrivate: true,
  deckType: '36',
});

// Tasodifiy tarqatishga bog'liq bo'lmaslik uchun qo'l va navbatni qo'lda o'rnatamiz
function setupBura(rules: GameRules, hands: Card[][], trump: Suit = 'HEARTS'): BuraEngine {
  const engine = new BuraEngine('b', settings('BURA', rules, hands.length));
  hands.forEach((_, i) => engine.addPlayer({ id: `p${i + 1}`, username: `P${i + 1}`, isBot: false }));
  engine.initGame();
  engine.status = 'PLAYING';
  engine.winnerId = undefined;
  engine.roundSummary = undefined;
  engine.specialCombinationAlert = null;
  engine.trumpSuit = trump;
  engine.deck = [];
  engine.tableCards = [];
  engine.lastLeadCards = [];
  engine.isResolvingTrick = false;
  hands.forEach((h, i) => {
    engine.players[i].hand = [...h];
    engine.players[i].score = 0;
    engine.players[i].penaltyPoints = 0;
    engine.players[i].wonCards = [];
  });
  engine.activePlayerIndex = 0;
  engine.updatePlayerTurns();
  return engine;
}

console.log('--- 🧪 REGRESSIYA TESTLARI ---\n');

// 1. Moskva butun o'yinni tugatadi (ilgari ROUND_OVER ga qaytib qolardi)
{
  const bura = setupBura('ODDIY', [
    [card('HEARTS', 'A'), card('SPADES', 'A'), card('CLUBS', 'A'), card('DIAMONDS', 'A')],
    [card('HEARTS', '6'), card('SPADES', '7'), card('CLUBS', '8'), card('DIAMONDS', '9')],
  ]);
  const res = bura.declareCombination('p1', 'MOSKVA');
  assert(res.success, 'Moskva e\'lon qilindi');
  assert(bura.status === 'GAME_OVER', 'Moskva butun partiyani tugatadi (GAME_OVER)');
  assert(bura.roundSummary?.isGameOver === true, 'Raund xulosasi ham o\'yin tugaganini ko\'rsatadi');
}

// 2. 3 kishilik Burada qayta urilgan karta ochkosi ikki marta sanalmaydi
{
  const bura = setupBura('ODDIY', [
    [card('SPADES', 'K'), card('CLUBS', '6'), card('CLUBS', '7'), card('CLUBS', '8')],
    [card('SPADES', '10'), card('DIAMONDS', '6'), card('DIAMONDS', '7'), card('DIAMONDS', '8')],
    [card('SPADES', 'A'), card('HEARTS', '6'), card('HEARTS', '7'), card('HEARTS', '8')],
  ]);
  bura.playCards('p1', [card('SPADES', 'K')]); // 4
  bura.playCards('p2', [card('SPADES', '10')]); // 10 (K ni uradi)
  const r = bura.playCards('p3', [card('SPADES', 'A')]); // 11 (10 ni uradi)
  assert(r.success && r.trickCompleted === true, '3-o\'yinchi qayta urdi va vzyatka yakunlandi');
  bura.resolveTrick();
  assert(bura.players[2].score === 25, `Vzyatka ochkosi to'g'ri: 4+10+11=25 (olindi: ${bura.players[2].score})`);
  assert(bura.players[2].wonCards!.length === 3, 'Yutilgan kartalar takrorlanmagan (3 ta)');
}

// 3. Raund tugagach karta tashlab bo'lmaydi
{
  const bura = setupBura('ODDIY', [
    [card('SPADES', '6'), card('CLUBS', '6')],
    [card('SPADES', '7'), card('CLUBS', '7')],
  ]);
  bura.status = 'ROUND_OVER';
  const res = bura.playCards('p1', [card('SPADES', '6')]);
  assert(!res.success, 'ROUND_OVER holatida playCards rad etiladi');
}

// 4. 6 talikda kartasi yetmagan o'yinchi avtomatik pas qiladi (ilgari o'yin qotib qolardi)
{
  const bura = setupBura('SIX_CARDS', [
    [card('CLUBS', '6'), card('CLUBS', '7'), card('CLUBS', '8')],
    [card('CLUBS', '9'), card('CLUBS', 'J'), card('CLUBS', 'Q'), card('DIAMONDS', '6'), card('DIAMONDS', '7'), card('DIAMONDS', '8')],
  ]);
  bura.playCards('p1', [card('CLUBS', '6'), card('CLUBS', '7'), card('CLUBS', '8')]);
  const r = bura.playCards('p2', [card('CLUBS', '9'), card('CLUBS', 'J'), card('CLUBS', 'Q')]);
  assert(r.success && r.trickCompleted === true, 'Ali qo\'lida karta qolmagani uchun vzyatka avtomatik yakunlandi');
}

// 5. FOLD: tanlangan kartalar soni mos kelmasa eng arzonlari tashlanadi; yopiq karta tarmoqqa oshkor qilinmaydi
{
  const bura = setupBura('ODDIY', [
    [card('CLUBS', 'A'), card('CLUBS', '10'), card('SPADES', '6'), card('SPADES', '7')],
    [card('DIAMONDS', '6'), card('DIAMONDS', 'A'), card('HEARTS', 'K'), card('DIAMONDS', '10')],
  ]);
  bura.playCards('p1', [card('CLUBS', 'A'), card('CLUBS', '10')]);
  const r = bura.foldOrPass('p2', []);
  assert(r.success, 'Bo\'sh FOLD da server kartalarni o\'zi tanladi');
  assert(bura.players[1].hand.some(c => c.id === 'HEARTS_K'), 'Kozir (HEARTS_K) asralib qoldi');
  const state = bura.getTableState();
  const hidden = state.tableCards.filter(tc => tc.isFaceDown);
  assert(hidden.length === 2 && hidden.every(tc => tc.card.id.startsWith('hidden_')), 'Yopiq kartalar holatda yashirilgan');
}

// 6. Bot oddiy rejimda 41+ uchun turli mastli kartalar bilan yurmaydi (ilgari cheksiz siklga tushardi)
{
  const bura = setupBura('ODDIY', [
    [card('CLUBS', 'A'), card('SPADES', 'A'), card('CLUBS', '10'), card('DIAMONDS', '10')],
    [card('DIAMONDS', '6'), card('DIAMONDS', '7'), card('SPADES', '8'), card('SPADES', '9')],
  ]);
  const move = BotAI.makeBuraMove(bura, 'p1');
  const res = bura.playCards('p1', move.cards || []);
  assert(res.success, 'Bot tanlagan yurish dvijok tomonidan qabul qilindi');
}

// 7. Klient karta masti/qiymatini soxtalashtira olmaydi (server qo'ldagi haqiqiy kartani ishlatadi)
{
  const room = new GameRoom('spoof', settings('BURA', 'ODDIY', 2), new ChatManager());
  const noop = () => {};
  room.addPlayer('p1', 'Ali', false, noop);
  room.addPlayer('p2', 'Vali', false, noop);
  const engine = room.engine as BuraEngine;
  engine.status = 'PLAYING';
  engine.tableCards = [];
  engine.isResolvingTrick = false;
  engine.trumpSuit = 'HEARTS';
  engine.players[0].hand = [card('CLUBS', '6'), card('CLUBS', '7'), card('CLUBS', '8'), card('CLUBS', '9')];
  engine.players[1].hand = [card('SPADES', '6'), card('SPADES', '7'), card('SPADES', '8'), card('SPADES', '9')];
  engine.activePlayerIndex = 0;
  engine.updatePlayerTurns();

  room.handlePlayerAction('p1', 'PLAY_CARDS', { cards: [card('CLUBS', '6')] });
  // Vali o'zining SPADES_6 kartasini "kozir tuz" qilib ko'rsatishga urinadi
  const res = room.handlePlayerAction('p2', 'PLAY_CARDS', { cards: [{ id: 'SPADES_6', suit: 'HEARTS', rank: 'A' }] });
  assert(res.success, 'Harakat qabul qilindi (karta qo\'lda bor)');
  const played = engine.tableCards.find(tc => tc.playerId === 'p2');
  assert(!!played && played.isFaceDown === true && played.card.suit === 'SPADES' && played.card.rank === '6',
    'Soxta masti/qiymat e\'tiborsiz qoldirildi - karta ura olmadi');
  room.dispose();
}

// 8. 108: mast faqat Valet/Dama bilan buyurtma qilinadi; pas faqat karta olgandan keyin; jarimadan qochib bo'lmaydi
{
  const e = new OneHundredEightEngine('e', settings('ONE_HUNDRED_EIGHT', 'KOROL_QARGA', 2));
  e.addPlayer({ id: 'p1', username: 'Ali', isBot: false });
  e.addPlayer({ id: 'p2', username: 'Vali', isBot: false });
  e.initGame();
  e.activePlayerIndex = 0;
  e.updatePlayerTurns();
  e.topDiscardCard = card('HEARTS', '9');
  e.activeSuit = 'HEARTS';
  e.pendingPenaltyCards = 0;
  e.pendingPenaltyRank = null;
  e.players[0].hand = [card('HEARTS', '10'), card('CLUBS', '9'), card('CLUBS', 'Q')];
  e.players[1].hand = [card('DIAMONDS', '9'), card('DIAMONDS', 'Q'), card('SPADES', 'Q')];

  e.playCard('p1', card('HEARTS', '10'), 'CLUBS');
  assert(e.activeSuit === 'HEARTS', 'Oddiy karta bilan mast buyurtma qilib bo\'lmaydi');

  const passRes = e.pass('p2');
  assert(!passRes.success, 'Karta olmasdan pas qilib bo\'lmaydi');

  e.pendingPenaltyCards = 2;
  e.pendingPenaltyRank = '7';
  const passPenalty = e.pass('p2');
  assert(!passPenalty.success, 'Jarima zanjirida pas qilib qutulib bo\'lmaydi');

  const state = e.getTableState();
  assert(state.pendingPenaltyCount === 2, 'Jarima soni table state orqali klientga yuboriladi');
}

// 9. 108: roundSummary klientga yuboriladi va chiqib ketgan o'yinchiga karta tarqatilmaydi
{
  const e = new OneHundredEightEngine('e2', settings('ONE_HUNDRED_EIGHT', 'KOROL_OLMA', 3));
  e.addPlayer({ id: 'p1', username: 'Ali', isBot: false });
  e.addPlayer({ id: 'p2', username: 'Vali', isBot: false });
  e.addPlayer({ id: 'p3', username: 'Hasan', isBot: false });
  e.initGame();
  e.players[2].penaltyPoints = 105;
  e.activePlayerIndex = 0;
  e.pendingPenaltyCards = 0;
  e.pendingPenaltyRank = null;
  e.topDiscardCard = card('HEARTS', '9');
  e.activeSuit = 'HEARTS';
  e.players[0].hand = [card('HEARTS', '10')];
  e.players[2].hand = [card('SPADES', 'A')]; // 11 jarima -> 116 > 108 -> chiqib ketadi
  e.playCard('p1', card('HEARTS', '10'));
  assert(e.status === 'ROUND_OVER', 'Raund tugadi');
  assert(!!e.getTableState().roundSummary, 'roundSummary table state ichida bor');
  assert(e.players[2].isEliminated === true, 'Hasan 108 dan oshib chiqib ketdi');
  e.playerReadyForNextRound('p1');
  e.playerReadyForNextRound('p2');
  assert(e.status === 'PLAYING', 'Keyingi qo\'l boshlandi');
  assert(e.players[2].hand.length === 0, 'Chiqib ketgan o\'yinchiga karta tarqatilmadi');
}

// 10. Durak: himoyachi hujum qila olmaydi, bita deya olmaydi, qo'lidagidan ko'p karta tashlanmaydi
{
  const d = new DurakEngine('d', settings('DURAK', 'PEREKIDSIZ', 2));
  d.addPlayer({ id: 'p1', username: 'Ali', isBot: false });
  d.addPlayer({ id: 'p2', username: 'Vali', isBot: false });
  d.initGame();
  d.trumpSuit = 'HEARTS';
  d.attackerIndex = 0;
  d.defenderIndex = 1;
  d.activePlayerIndex = 0;
  d.tableCards = [];
  d.players[0].hand = [card('CLUBS', '6'), card('SPADES', '6'), card('DIAMONDS', '6')];
  d.players[1].hand = [card('CLUBS', '7'), card('CLUBS', '8')];
  d.updatePlayerTurns();

  assert(!d.attack('p2', card('CLUBS', '7')).success, 'Himoyachi o\'ziga hujum qila olmaydi');
  assert(d.attack('p1', card('CLUBS', '6')).success, 'Hujumchi hujum qildi');
  assert(d.attack('p1', card('SPADES', '6')).success, 'Hujumchi bir xil nominal tashladi');
  assert(!d.attack('p1', card('DIAMONDS', '6')).success, 'Himoyachida 2 ta karta - 3-karta tashlanmaydi');
  assert(!d.passOrBita('p2').success, 'Himoyachi bita deya olmaydi');
  assert(!d.passOrBita('p1').success, 'Hamma karta urilmaguncha bita bo\'lmaydi');
}

// 11. Durak: kartasi tugagan o'yinchiga navbat berilmaydi (3 kishilik, koloda bo'sh)
{
  const d = new DurakEngine('d3', settings('DURAK', 'PEREKIDSIZ', 3));
  d.addPlayer({ id: 'p1', username: 'Ali', isBot: false });
  d.addPlayer({ id: 'p2', username: 'Vali', isBot: false });
  d.addPlayer({ id: 'p3', username: 'Hasan', isBot: false });
  d.initGame();
  d.trumpSuit = 'HEARTS';
  d.deck = [];
  d.attackerIndex = 0;
  d.defenderIndex = 1;
  d.activePlayerIndex = 0;
  d.tableCards = [];
  d.players[0].hand = [card('CLUBS', '6'), card('SPADES', '9')];
  d.players[1].hand = [card('CLUBS', '7')];
  d.players[2].hand = [card('DIAMONDS', '6'), card('DIAMONDS', '7')];
  d.updatePlayerTurns();

  d.attack('p1', card('CLUBS', '6'));
  d.defend('p2', 'CLUBS_6', card('CLUBS', '7'));
  const bita = d.passOrBita('p1');
  assert(bita.success, 'Bita');
  // Vali (p2) kartasiz qoldi -> keyingi hujumchi Hasan (p3), himoyachi Ali (p1)
  assert(d.attackerIndex === 2 && d.defenderIndex === 0, 'Kartasiz o\'yinchi o\'tkazib yuborildi');
}

console.log('\n🎉 BARCHA REGRESSIYA TESTLARI O\'TDI!');
