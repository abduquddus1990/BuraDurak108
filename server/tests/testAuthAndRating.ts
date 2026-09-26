import fs from 'fs';
import os from 'os';
import path from 'path';
import { verifyTelegramInitData, signTelegramInitData } from '../src/auth/telegramAuth';
import { UserStore, computeEloDeltas } from '../src/store/UserStore';
import { GameRoom } from '../src/rooms/GameRoom';
import { ChatManager } from '../src/chat/ChatManager';
import { BuraEngine } from '../src/engine/BuraEngine';
import { DurakEngine } from '../src/engine/DurakEngine';
import { Card, Rank, Suit } from '../../shared/src/types/card';

function assert(condition: boolean, testName: string) {
  if (!condition) {
    console.error(`❌ TEST FAILED: ${testName}`);
    process.exit(1);
  }
  console.log(`✅ TEST PASSED: ${testName}`);
}

const card = (suit: Suit, rank: Rank): Card => ({ suit, rank, id: `${suit}_${rank}` });
const wait = (ms: number) => new Promise(r => setTimeout(r, ms));

(async () => {
  console.log('--- 🧪 AUTENTIFIKATSIYA, REYTING VA TAYMER TESTLARI ---\n');

  // 1. Telegram initData imzosi
  {
    const token = '123456:TEST_TOKEN';
    const now = Math.floor(Date.now() / 1000);
    const fields = { auth_date: String(now), query_id: 'AAE', user: JSON.stringify({ id: 42, first_name: 'Ali', username: 'ali' }) };
    const initData = signTelegramInitData(fields, token);

    assert(verifyTelegramInitData(initData, token)?.id === 42, "To'g'ri imzoli initData qabul qilindi");
    assert(verifyTelegramInitData(initData, '999:OTHER') === null, 'Boshqa bot tokeni bilan imzo rad etildi');

    const tampered = initData.replace(encodeURIComponent('"id":42'), encodeURIComponent('"id":43'));
    assert(tampered !== initData && verifyTelegramInitData(tampered, token) === null, "O'zgartirilgan foydalanuvchi ID si rad etildi");

    const old = signTelegramInitData({ ...fields, auth_date: String(now - 3 * 24 * 3600) }, token);
    assert(verifyTelegramInitData(old, token) === null, 'Eskirgan (3 kunlik) initData rad etildi');
    assert(verifyTelegramInitData('', token) === null && verifyTelegramInitData('hash=zz', token) === null, "Bo'sh/buzuq initData rad etildi");
  }

  // 2. ELO hisoblash
  {
    const d = computeEloDeltas(['a'], ['b'], () => 1000);
    assert(d.get('a') === 16 && d.get('b') === -16, 'Teng reytingda g\'olib +16, yutqazgan -16');
    const upset = computeEloDeltas(['weak'], ['strong'], id => (id === 'weak' ? 800 : 1200));
    assert((upset.get('weak') || 0) > 16, 'Kuchsiz o\'yinchi kuchliga yutsa ko\'proq ball oladi');
    const durak = computeEloDeltas(['a', 'b', 'c'], ['d'], () => 1000);
    assert(durak.get('d') === -16 && durak.get('a') === 5, "Ko'p kishilik o'yinda K raqiblar soniga bo'linadi");
  }

  // 3. UserStore: statistika, reyting, saqlash va qayta yuklash
  {
    const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'choyxona-')), 'users.json');
    const store = new UserStore(file);
    store.upsert('u_a', { username: 'a', displayName: 'Ali' });
    store.upsert('u_b', { username: 'b', displayName: 'Vali' });
    store.recordGameResult({ gameType: 'BURA', humanPlayerIds: ['u_a', 'u_b'], winners: ['u_a'], losers: ['u_b'], rated: true });
    store.recordGameResult({ gameType: 'BURA', humanPlayerIds: ['u_a'], winners: [], losers: ['u_a'], rated: false });
    assert(store.get('u_a')!.ratingElo === 1016 && store.get('u_b')!.ratingElo === 984, 'Odamlar o\'rtasidagi o\'yinda ELO o\'zgardi');
    assert(store.get('u_a')!.gamesPlayed === 2 && store.get('u_a')!.gamesWon === 1, 'Bot bilan o\'yin faqat statistikaga yozildi (ELO o\'zgarmadi)');
    store.flush();
    const reloaded = new UserStore(file);
    assert(reloaded.get('u_b')?.displayName === 'Vali' && reloaded.secret === store.secret, "Ma'lumotlar va maxfiy kalit diskdan qayta yuklandi");
    assert(reloaded.leaderboard()[0].id === 'u_a', 'Reyting jadvali ELO bo\'yicha saralangan');
    store.upsert('u_b', { username: 'b', displayName: 'Boshqa ism' });
    assert(store.get('u_b')!.displayName === 'Vali', "Qayta kirishda saqlangan ism ustidan yozilmaydi");
  }

  // 4. Yakuniy natijalar: Bura (12 jarima) va Durak
  {
    const bura = new BuraEngine('b', { id: 'b', gameType: 'BURA', rules: 'ODDIY', maxPlayers: 3, turnTimeoutSeconds: 15, isPrivate: true, deckType: '36' });
    ['p1', 'p2', 'p3'].forEach(id => bura.addPlayer({ id, username: id, isBot: false }));
    bura.initGame();
    bura.players[0].penaltyPoints = 2;
    bura.players[1].penaltyPoints = 12;
    bura.players[2].penaltyPoints = 6;
    const r = bura.getFinalResults();
    assert(r.winners.join() === 'p1' && r.losers.join() === 'p2', 'Bura: eng kam jarimali yutdi, 12 ga yetgan yutqazdi');

    const durak = new DurakEngine('d', { id: 'd', gameType: 'DURAK', rules: 'PEREKIDSIZ', maxPlayers: 3, turnTimeoutSeconds: 15, isPrivate: true, deckType: '36' });
    ['p1', 'p2', 'p3'].forEach(id => durak.addPlayer({ id, username: id, isBot: false }));
    durak.initGame();
    durak.deck = [];
    durak.players[0].hand = [];
    durak.players[1].hand = [card('CLUBS', '6')];
    durak.players[2].hand = [];
    durak.status = 'GAME_OVER';
    const dr = durak.getFinalResults();
    assert(dr.losers.join() === 'p2' && dr.winners.length === 2, 'Durak: faqat kartasi qolgan o\'yinchi yutqazdi');
  }

  // 5. Navbat taymeri: javob bermagan odam o'rniga avtomatik yuriladi; o'yin tugashi bir marta qayd etiladi
  {
    const room = new GameRoom('timer', { id: 'timer', gameType: 'DURAK', rules: 'PEREKIDSIZ', maxPlayers: 2, turnTimeoutSeconds: 1, isPrivate: true, deckType: '36' }, new ChatManager());
    let gameOverCalls = 0;
    room.onGameOver = () => gameOverCalls++;
    const messages: any[] = [];
    room.addPlayer('p1', 'Ali', false, m => messages.push(m));
    room.addPlayer('p2', 'Vali', false, () => {});
    const first = messages[messages.length - 1];
    assert(typeof first.tableState.turnRemainingMs === 'number' && first.tableState.turnRemainingMs > 0, 'Klientga qolgan vaqt yuborildi');

    const stateBefore = JSON.stringify(room.engine.getTableState());
    await wait(1400);
    assert(JSON.stringify(room.engine.getTableState()) !== stateBefore, "Vaqt tugagach server o'yinchi o'rniga yurdi");

    room.engine.status = 'GAME_OVER';
    room.broadcastState();
    room.broadcastState();
    assert(gameOverCalls === 1, "O'yin tugashi faqat bir marta qayd etildi");
    room.dispose();
  }

  console.log('\n🎉 AUTENTIFIKATSIYA, REYTING VA TAYMER TESTLARI O\'TDI!');
  process.exit(0);
})();
