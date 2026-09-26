import { OneHundredEightEngine } from '../src/engine/OneHundredEightEngine';
import { BuraEngine } from '../src/engine/BuraEngine';
import { DurakEngine } from '../src/engine/DurakEngine';
import { Card } from '../../shared/src/types/card';

function assert(condition: boolean, testName: string) {
  if (!condition) {
    console.error(`❌ TEST FAILED: ${testName}`);
    process.exit(1);
  } else {
    console.log(`✅ TEST PASSED: ${testName}`);
  }
}

console.log('--- 🧪 "CHOYXONA GAMES" YANGILANGAN TESTLARI (4-TALIK VA 6-TALIK BURA) ---\n');

// 1. 4-TALIK BURA TESTI: 4 ta karta tarqatiladi, oxirgi kishi javob berishi bilan vzyatka olinadi!
{
  const bura4 = new BuraEngine('bura_4_test', {
    id: 'bura_4_test',
    gameType: 'BURA',
    rules: 'ODDIY',
    maxPlayers: 2,
    turnTimeoutSeconds: 15,
    isPrivate: true,
    deckType: '36',
  });
  bura4.addPlayer({ id: 'p1', username: 'Ali', isBot: false });
  bura4.addPlayer({ id: 'p2', username: 'Vali', isBot: false });
  bura4.initGame();
  // Tasodifiy tarqatishda Moskva/Bura chiqib qolsa ham test barqaror bo'lishi uchun
  bura4.status = 'PLAYING';
  bura4.roundSummary = undefined;

  assert(bura4.players[0].hand.length === 4, '4-Talik Burada Ali 4 ta karta oldi');
  assert(bura4.players[1].hand.length === 4, '4-Talik Burada Vali 4 ta karta oldi');

  // Test uchun navbatni p1 ga o'rnatamiz
  bura4.activePlayerIndex = 0;
  bura4.updatePlayerTurns();

  // Ali bitta karta bilan yuradi
  const cardAli: Card = { suit: 'SPADES', rank: 'K', id: 'SPADES_K' };
  bura4.players[0].hand[0] = cardAli;
  const playRes1 = bura4.playCards('p1', [cardAli]);
  assert(playRes1.success, 'Ali yurish qildi');
  assert(bura4.tableCards.length === 1, 'Ali stolga 1 ta karta tashladi');
  assert(bura4.activePlayerIndex === 1, 'Navbat Valiga o\'tdi');

  // Vali 10 bilan uradi (Burada 10 kartasi K dan katta!)
  bura4.trumpSuit = 'HEARTS';
  const cardVali: Card = { suit: 'SPADES', rank: '10', id: 'SPADES_10' };
  bura4.players[1].hand[0] = cardVali;
  const playRes2 = bura4.playCards('p2', [cardVali]);
  assert(playRes2.success && playRes2.trickCompleted === true, 'Vali 10 bilan K ni urdi va trickCompleted belgilandi');

  // 1.8s dan so'ng resolveTrick chaqirilganda stol tozalanadi va ochko beriladi
  bura4.resolveTrick();
  assert(bura4.tableCards.length === 0, 'resolveTrick dan keyin stol tozalandi (Vzyatka olindi)');
  assert(bura4.players[1].score > 0, 'Vali vzyatkani urib olgani uchun ochko unga yozildi');
  assert(bura4.players[0].hand.length === 4, 'Alining qo\'li yana 4 tagacha to\'ldirildi');
  assert(bura4.players[1].hand.length === 4, 'Valining qo\'li yana 4 tagacha to\'ldirildi');
  assert(bura4.activePlayerIndex === 1, 'Keyingi vzyatkani urib olgan Vali boshlaydi');
}

// 2. 6-TALIK QAYTARMA BURA TESTI: 6 ta karta tarqatiladi, qaytarma krug aylanadi!
{
  const bura6 = new BuraEngine('bura_6_test', {
    id: 'bura_6_test',
    gameType: 'BURA',
    rules: 'SIX_CARDS',
    maxPlayers: 2,
    turnTimeoutSeconds: 15,
    isPrivate: true,
    deckType: '36',
  });
  bura6.addPlayer({ id: 'p1', username: 'Ali', isBot: false });
  bura6.addPlayer({ id: 'p2', username: 'Vali', isBot: false });
  bura6.initGame();
  // Tasodifiy tarqatishda Moskva/Bura chiqib qolsa ham test barqaror bo'lishi uchun
  bura6.status = 'PLAYING';
  bura6.roundSummary = undefined;

  assert(bura6.players[0].hand.length === 6, '6-Talik Qaytarmada har bir o\'yinchi 6 ta karta oldi');

  bura6.activePlayerIndex = 0;
  bura6.updatePlayerTurns();

  bura6.trumpSuit = 'HEARTS';
  const c1: Card = { suit: 'SPADES', rank: '9', id: 'SPADES_9' };
  const c2: Card = { suit: 'SPADES', rank: '10', id: 'SPADES_10' };
  bura6.players[0].hand.push(c1);
  bura6.players[1].hand.push(c2);

  bura6.playCards('p1', [c1]);
  bura6.playCards('p2', [c2]); // Vali urdi

  // 6-talikda krug davom etadi (qaytarib urish imkoni)
  assert(bura6.tableCards.length > 0, '6-talikda karta urilgandan keyin ham krug davom etadi');
  assert(bura6.activePlayerIndex === 0, 'Navbat yana Aliga qaytdi (qaytarib urishi uchun)');
}

// 3. 108: 7-LIK ZANJIRI TESTI
{
  const engine108 = new OneHundredEightEngine('test_7_chain', {
    id: 'test_7_chain',
    gameType: 'ONE_HUNDRED_EIGHT',
    rules: 'KOROL_QARGA',
    maxPlayers: 2,
    turnTimeoutSeconds: 15,
    isPrivate: true,
    deckType: '36',
  });
  engine108.addPlayer({ id: 'p1', username: 'Ali', isBot: false });
  engine108.addPlayer({ id: 'p2', username: 'Vali', isBot: false });
  engine108.initGame();

  const s1: Card = { suit: 'HEARTS', rank: '7', id: 'HEARTS_7' };
  const s2: Card = { suit: 'DIAMONDS', rank: '7', id: 'DIAMONDS_7' };
  engine108.players[0].hand.push(s1);
  engine108.players[1].hand.push(s2);
  engine108.activeSuit = 'HEARTS';
  engine108.topDiscardCard = { suit: 'HEARTS', rank: '10', id: 'HEARTS_10' };

  engine108.playCard('p1', s1);
  assert(engine108.pendingPenaltyCards === 2, '7 tashlanganda jarima 2 ta');
  engine108.playCard('p2', s2);
  assert(engine108.pendingPenaltyCards === 4, 'Vali ham 7 tashladi -> jarima 4 ta bo\'ldi');
}

// 4. DURAK: KARTALARNI OLISH VA QO'SHNI HUJUM QOIDASI TESTI
{
  const durak = new DurakEngine('durak_test', {
    id: 'durak_test',
    gameType: 'DURAK',
    rules: 'PEREKIDSIZ',
    maxPlayers: 4,
    turnTimeoutSeconds: 15,
    isPrivate: true,
    deckType: '36',
  });
  durak.addPlayer({ id: 'p1', username: 'Ali', isBot: false });
  durak.addPlayer({ id: 'p2', username: 'Vali', isBot: false });
  durak.addPlayer({ id: 'p3', username: 'Hasan', isBot: false });
  durak.addPlayer({ id: 'p4', username: 'Husan', isBot: false });
  durak.initGame();

  durak.attackerIndex = 0;
  durak.defenderIndex = 1; // Vali himoyachi. Chap qo'shni: Ali (0), O'ng qo'shni: Hasan (2). Husan (3) qo'shni emas!
  durak.activePlayerIndex = 0;
  durak.updatePlayerTurns();

  const attackCard: Card = { suit: 'HEARTS', rank: '8', id: 'HEARTS_8' };
  durak.players[0].hand.push(attackCard);
  const attRes = durak.attack('p1', attackCard);
  assert(attRes.success, 'Ali (chap qo\'shni) hujum qildi');

  // Husan (3) himoyachining qarshisida (qo'shnisi emas), u hujum qila olmaydi
  const illegalCard: Card = { suit: 'SPADES', rank: '8', id: 'SPADES_8' };
  durak.players[3].hand.push(illegalCard);
  const illRes = durak.attack('p4', illegalCard);
  assert(!illRes.success, '4 kishilikda yonida bo\'lmagan Husanning hujumi to\'sib qo\'yildi');

  // Himoyachi oladi
  durak.takeCards('p2');
  assert(durak.tableCards.length === 0, 'Himoyachi olgach stol tozalandi');
}

console.log('\n🎉 BARCHA YANGI TESTLAR (4-TALIK VA 6-TALIK) 100% MUVAFFAQISHLI O\'TDI!');
