// Tez o'yin navbati, "Yana bir partiya", stol sozlamalari va bot darajalari
import { Matchmaker, QueueEntry } from '../src/rooms/Matchmaker';
import { GameRoom } from '../src/rooms/GameRoom';
import { ChatManager } from '../src/chat/ChatManager';
import { BuraEngine } from '../src/engine/BuraEngine';
import { OneHundredEightEngine } from '../src/engine/OneHundredEightEngine';
import { Card, Rank, Suit } from '../../shared/src/types/card';
import { GameRules, GameType, RoomOptions, RoomSettings } from '../../shared/src/types/game';

function assert(condition: boolean, testName: string) {
  if (!condition) {
    console.error(`❌ TEST FAILED: ${testName}`);
    process.exit(1);
  }
  console.log(`✅ TEST PASSED: ${testName}`);
}

const card = (suit: Suit, rank: Rank): Card => ({ suit, rank, id: `${suit}_${rank}` });
const settings = (gameType: GameType, rules: GameRules, maxPlayers: number, options?: RoomOptions): RoomSettings => ({
  id: 't', gameType, rules, maxPlayers, turnTimeoutSeconds: 15, isPrivate: true, deckType: '36', options,
});

console.log('--- 🧪 TEZ O\'YIN, YANA BIR PARTIYA VA SOZLAMALAR ---\n');

// 1. Matchmaker: o'xshash ELO juftlanadi, uzoq ELO darhol juftlanmaydi, kutish bilan oraliq kengayadi
{
  const matches: { ids: string[]; bots: boolean }[] = [];
  const mm = new Matchmaker((entries, bots) => matches.push({ ids: entries.map(e => e.playerId), bots }), () => {}, 30000, false);
  const base = { gameType: 'BURA' as GameType, rules: 'ODDIY' as GameRules, totalPlayers: 2 };
  mm.join({ ...base, playerId: 'a', elo: 1000 }, 0);
  mm.join({ ...base, playerId: 'far', elo: 1600 }, 0);
  assert(matches.length === 0, "ELO farqi katta (600) - darhol juftlanmadi");
  mm.join({ ...base, playerId: 'b', elo: 1100 }, 1000);
  assert(matches.length === 1 && matches[0].ids.sort().join() === 'a,b' && !matches[0].bots, "O'xshash ELO (1000/1100) juftlandi");

  mm.join({ ...base, playerId: 'c', elo: 1000 }, 2000);
  mm.tick(2000 + 5000);
  assert(matches.length === 1, '5 soniyada oraliq hali 600 ga yetmadi');
  mm.tick(2000 + 9000);
  assert(matches.length === 2 && matches[1].ids.sort().join() === 'c,far', "Kutish cho'zilgach oraliq kengayib juftlandi");

  mm.join({ ...base, playerId: 'd', elo: 1000 }, 50000);
  assert(mm.statusFor('d', 50000)?.waiting === 1, 'Navbat holati: 1 kishi kutmoqda');
  mm.tick(50000 + 29000);
  assert(matches.length === 2, "30 soniyadan oldin botlar qo'shilmaydi");
  mm.tick(50000 + 30000);
  assert(matches.length === 3 && matches[2].bots && matches[2].ids.join() === 'd', "30 soniyada topilmadi - botlar bilan boshlandi");

  mm.join({ ...base, totalPlayers: 3, playerId: 'e', elo: 1000 }, 0);
  mm.leave('e');
  assert(!mm.isQueued('e'), 'Navbatdan chiqish ishlaydi');

  const other: QueueEntry[] = [];
  const mm2 = new Matchmaker(entries => other.push(...entries), () => {}, 30000, false);
  mm2.join({ ...base, playerId: 'x', elo: 1000 }, 0);
  mm2.join({ gameType: 'DURAK', rules: 'PEREKIDSIZ', totalPlayers: 2, playerId: 'y', elo: 1000 }, 0);
  assert(other.length === 0, "Boshqa o'yin turini tanlaganlar juftlanmaydi");
}

// 2. Yana bir partiya: ikkala odam rozi bo'lgach yangi partiya boshlanadi, natija qayta yoziladi
{
  const room = new GameRoom('rm', settings('DURAK', 'PEREKIDSIZ', 2), new ChatManager());
  let gameOvers = 0;
  room.onGameOver = () => gameOvers++;
  room.addPlayer('p1', 'Ali', false, () => {});
  room.addPlayer('p2', 'Vali', false, () => {});
  room.engine.status = 'GAME_OVER';
  room.engine.players[0].hand = [];
  room.broadcastState();
  assert(gameOvers === 1, 'Birinchi partiya natijasi yozildi');

  const r1 = room.handlePlayerAction('p1', 'REMATCH', {});
  assert(r1.success && room.engine.status === 'GAME_OVER', 'Bitta odam rozi - ikkinchisi kutilmoqda');
  room.handlePlayerAction('p2', 'REMATCH', {});
  assert((room.engine.status as string) === 'PLAYING', 'Ikkalasi rozi - yangi partiya boshlandi');
  assert(room.engine.players.every(p => p.hand.length === 6), "Yangi partiyada hammaga 6 tadan karta (eski qo'llar tozalandi)");
  room.engine.status = 'GAME_OVER';
  room.broadcastState();
  assert(gameOvers === 2, 'Ikkinchi partiya natijasi ham yozildi');
  room.dispose();
}

// 3. Stol sozlamalari: tuxum o'chirilgan, yolg'iz dama o'chirilgan
{
  const bura = new BuraEngine('b', settings('BURA', 'ODDIY', 2, { eggRule: false }));
  bura.addPlayer({ id: 'p1', username: 'Ali', isBot: false });
  bura.addPlayer({ id: 'p2', username: 'Vali', isBot: false });
  bura.initGame();
  bura.status = 'PLAYING';
  bura.players[0].score = 60;
  bura.players[1].score = 60;
  (bura as any).finishRoundByCardsEnd();
  assert(bura.eggMultiplier === 1 && bura.players[1].penaltyPoints === 2, "Tuxum o'chirilgan: teng ochkoda oddiy jarima yozildi");

  const e = new OneHundredEightEngine('e', settings('ONE_HUNDRED_EIGHT', 'KOROL_OLMA', 2, { loneQueenBonus: false }));
  e.addPlayer({ id: 'p1', username: 'Ali', isBot: false });
  e.addPlayer({ id: 'p2', username: 'Vali', isBot: false });
  e.initGame();
  e.activePlayerIndex = 0;
  e.pendingPenaltyCards = 0;
  e.pendingPenaltyRank = null;
  e.topDiscardCard = card('SPADES', '9');
  e.activeSuit = 'SPADES';
  e.players[0].penaltyPoints = 50;
  e.players[0].hand = [card('SPADES', 'Q')];
  e.players[1].hand = [card('HEARTS', 'Q')];
  e.playCard('p1', card('SPADES', 'Q'));
  assert(e.players[0].penaltyPoints === 50 && e.players[1].penaltyPoints === 3, "Yolg'iz dama o'chirilgan: dama 3 ochko, chiqishda minus yo'q");
}

console.log('\n🎉 TEZ O\'YIN VA SOZLAMALAR TESTLARI O\'TDI!');
