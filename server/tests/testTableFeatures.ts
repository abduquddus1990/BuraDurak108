// O'yin stoli qulayliklari: mos kartalar ko'rsatkichi, maslahat, ulanish holati, oxirgi vzyatka
import { BuraEngine } from '../src/engine/BuraEngine';
import { DurakEngine } from '../src/engine/DurakEngine';
import { OneHundredEightEngine } from '../src/engine/OneHundredEightEngine';
import { GameRoom } from '../src/rooms/GameRoom';
import { ChatManager } from '../src/chat/ChatManager';
import { getPlayableHint, can108Play } from '../../shared/src/utils/playable';
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

console.log('--- 🧪 STOL QULAYLIKLARI TESTLARI ---\n');

// 1. 108: ko'rsatkich dvijok bilan bir xil qoidani ishlatadi
{
  const e = new OneHundredEightEngine('e', settings('ONE_HUNDRED_EIGHT', 'KOROL_OLMA', 2));
  e.addPlayer({ id: 'p1', username: 'Ali', isBot: false });
  e.addPlayer({ id: 'p2', username: 'Vali', isBot: false });
  e.initGame();
  e.activePlayerIndex = 0;
  e.updatePlayerTurns();
  e.pendingPenaltyCards = 0;
  e.pendingPenaltyRank = null;
  e.topDiscardCard = card('HEARTS', '9');
  e.tableCards = [{ playerId: 'SYSTEM', card: e.topDiscardCard }];
  e.activeSuit = 'HEARTS';
  e.players[0].hand = [card('HEARTS', '6'), card('CLUBS', '9'), card('SPADES', 'Q'), card('CLUBS', 'K')];
  const hint = getPlayableHint(e.getTableState(), e.players[0].hand, 'p1', true);
  const ids = hint.mode === 'dim' ? [...hint.ids].sort().join(',') : '';
  assert(ids === 'CLUBS_9,HEARTS_6,SPADES_Q', `108: mast/nominal mos va Dama yoritildi (${ids})`);
  assert(e.players[0].hand.every(c => e.canPlayCard(c) === (hint.mode === 'dim' && hint.ids.has(c.id))), 'Ko\'rsatkich dvijok tekshiruvi bilan to\'liq mos');

  e.pendingPenaltyCards = 2;
  e.pendingPenaltyRank = '7';
  assert(!can108Play(card('HEARTS', '6'), { topCard: e.topDiscardCard, activeSuit: 'HEARTS', pendingPenaltyCount: 2, pendingPenaltyRank: '7', rule: 'KOROL_OLMA' }), '7 zanjirida faqat 7 tashlanadi');
}

// 2. Durak himoyachisi: ura oladigan kartalar ko'rsatiladi
{
  const d = new DurakEngine('d', settings('DURAK', 'PEREKIDSIZ', 2));
  d.addPlayer({ id: 'p1', username: 'Ali', isBot: false });
  d.addPlayer({ id: 'p2', username: 'Vali', isBot: false });
  d.initGame();
  d.trumpSuit = 'HEARTS';
  d.attackerIndex = 0;
  d.defenderIndex = 1;
  d.activePlayerIndex = 1;
  d.tableCards = [{ playerId: 'p1', card: card('CLUBS', '9') }];
  d.players[1].hand = [card('CLUBS', '10'), card('CLUBS', '6'), card('HEARTS', '6'), card('SPADES', 'A')];
  const hint = getPlayableHint(d.getTableState(), d.players[1].hand, 'p2', true);
  const ids = hint.mode === 'dim' ? [...hint.ids].sort().join(',') : '';
  assert(ids === 'CLUBS_10,HEARTS_6', `Durak: kattaroq shu mast va kozir yoritildi (${ids})`);
}

// 3. Bura: javob berilayotgan kartalar va oxirgi vzyatka klientga yuboriladi
{
  const b = new BuraEngine('b', settings('BURA', 'ODDIY', 2));
  b.addPlayer({ id: 'p1', username: 'Ali', isBot: false });
  b.addPlayer({ id: 'p2', username: 'Vali', isBot: false });
  b.initGame();
  b.status = 'PLAYING';
  b.trumpSuit = 'HEARTS';
  b.tableCards = [];
  b.isResolvingTrick = false;
  b.activePlayerIndex = 0;
  b.players[0].hand = [card('CLUBS', 'K'), card('CLUBS', '6'), card('CLUBS', '7'), card('CLUBS', '8')];
  b.players[1].hand = [card('CLUBS', 'A'), card('SPADES', '6'), card('HEARTS', '7'), card('SPADES', '8')];
  b.updatePlayerTurns();
  b.playCards('p1', [card('CLUBS', 'K')]);
  const state = b.getTableState();
  assert(state.leadCardIds?.join() === 'CLUBS_K', 'Javob berilishi kerak bo\'lgan karta yuborildi');
  const hint = getPlayableHint(state, b.players[1].hand, 'p2', true);
  const ids = hint.mode === 'highlight' ? [...hint.ids].sort().join(',') : '';
  assert(ids === 'CLUBS_A,HEARTS_7', `Bura: ura oladigan kartalar yoritildi (${ids})`);
  const r = b.playCards('p2', [card('SPADES', '6')]);
  if (r.trickCompleted) b.resolveTrick();
  const after = b.getTableState();
  assert(after.lastTrick?.winnerId === 'p1' && after.lastTrick.cards.length === 2, 'Oxirgi vzyatka saqlandi');
  assert(after.lastTrick!.cards.some(tc => tc.isFaceDown && tc.card.id.startsWith('hidden_')), 'Oxirgi vzyatkada ham yopiq karta yashirilgan');
}

// 4. Xona: ulanish holati va maslahat (faqat bot o'yinida)
{
  const room = new GameRoom('r', settings('DURAK', 'PEREKIDSIZ', 2), new ChatManager());
  const inbox: any[] = [];
  room.addPlayer('p1', 'Ali', false, m => inbox.push(m));
  room.fillRemainingWithBots();
  const state = inbox[inbox.length - 1].tableState;
  assert(state.players.every((p: any) => p.isConnected === true), 'Ulangan odam va bot "ulangan" deb ko\'rsatildi');
  const engine = room.engine as DurakEngine;
  engine.activePlayerIndex = 0;
  engine.updatePlayerTurns();
  const hint = room.getHint('p1');
  assert(hint.success && hint.message.startsWith('💡'), `Bot o'yinida maslahat berildi: ${hint.message}`);
  room.dispose();

  const pvp = new GameRoom('r2', settings('DURAK', 'PEREKIDSIZ', 2), new ChatManager());
  const aliInbox: any[] = [];
  pvp.addPlayer('p1', 'Ali', false, m => aliInbox.push(m));
  pvp.addPlayer('p2', 'Vali', false, () => {});
  const active = pvp.engine.players[pvp.engine.activePlayerIndex].id;
  assert(!pvp.getHint(active).success, "Odamlar o'rtasidagi o'yinda maslahat berilmaydi");
  pvp.removePlayer('p2');
  const vali = aliInbox[aliInbox.length - 1].tableState.players.find((p: any) => p.id === 'p2');
  assert(vali.isConnected === false, "Uzilgan o'yinchi boshqalarga \"uzildi\" deb ko'rsatildi");
  pvp.dispose();
}

console.log('\n🎉 STOL QULAYLIKLARI TESTLARI O\'TDI!');
