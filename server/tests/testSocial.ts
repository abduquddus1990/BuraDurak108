// Ijtimoiy qism: o'yin turi bo'yicha ELO, yutuqlar, kunlik vazifalar, tarix, mahallalar, do'kon va to'lovlar
import { UserStore } from '../src/store/UserStore';
import { getDailyView } from '../src/store/progression';
import { TelegramBot, PaymentEvent } from '../src/bot/TelegramBot';
import { dailyTaskIdsFor, weekKeyOf, isThemeUnlocked } from '../../shared/src/types/progress';
import { recordRoomResult } from '../src/store/gameResults';
import { GameRoom } from '../src/rooms/GameRoom';
import { ChatManager } from '../src/chat/ChatManager';
import { BuraEngine } from '../src/engine/BuraEngine';

function assert(condition: boolean, testName: string) {
  if (!condition) {
    console.error(`❌ TEST FAILED: ${testName}`);
    process.exit(1);
  }
  console.log(`✅ TEST PASSED: ${testName}`);
}

(async () => {
  console.log('--- 🧪 IJTIMOIY QISM TESTLARI ---\n');
  const DAY = 86400000;
  const t0 = Date.parse('2026-09-28T10:00:00Z'); // dushanba

  // 1. O'yin turi bo'yicha ELO, statistika, tarix
  {
    const store = new UserStore(null);
    store.upsert('a', { username: 'a', displayName: 'Ali' });
    store.upsert('b', { username: 'b', displayName: 'Vali' });
    const names = { a: 'Ali', b: 'Vali' };
    const eff = store.recordGameResult({ gameType: 'DURAK', rules: 'PEREKIDLI', humanPlayerIds: ['a', 'b'], winners: ['a'], losers: ['b'], rated: true, playerNames: names, now: t0 });
    const a = store.get('a')!;
    assert(a.ratings?.DURAK === 1016 && a.ratings?.BURA === undefined, 'ELO faqat shu o\'yin turida o\'zgardi');
    assert(eff.get('a')?.delta === 16 && eff.get('b')?.delta === -16, "Natijada ELO o'zgarishi qaytarildi");
    assert(a.statsByGame?.DURAK?.won === 1 && a.history?.[0].result === 'WIN' && a.history?.[0].opponents.join() === 'Vali', 'Statistika va tarix yozildi');
    assert(store.get('b')!.history?.[0].result === 'LOSS' && store.get('b')!.winStreak === 0, 'Yutqazganda seriya nolga tushdi');
    assert(store.leaderboard(30, 'DURAK')[0].id === 'a' && store.leaderboard(30, 'BURA').length === 0, "Reyting jadvali o'yin turi bo'yicha");

    for (let i = 0; i < 25; i++) {
      store.recordGameResult({ gameType: 'BURA', humanPlayerIds: ['a'], winners: [], losers: [], rated: false, playerNames: { a: 'Ali', bot1: 'Bot' }, now: t0 + i });
    }
    assert(store.get('a')!.history!.length === 20, 'Tarixda oxirgi 20 ta partiya saqlanadi');
  }

  // 2. Yutuqlar
  {
    const store = new UserStore(null);
    store.upsert('a', { username: 'a', displayName: 'Ali' });
    const win = (gameType: any, events: string[] = [], now = t0) =>
      store.recordGameResult({ gameType, humanPlayerIds: ['a'], winners: ['a'], losers: [], rated: false, playerNames: { a: 'Ali', bot: 'Bot' }, eventsByPlayer: { a: events }, now });
    const first = win('BURA', ['MOSKVA']);
    assert(first.get('a')!.newAchievements.sort().join() === 'FIRST_WIN,MOSKVA', 'Birinchi g\'alaba va Moskva nishonlari berildi');
    assert(win('BURA', ['MOSKVA']).get('a')!.newAchievements.length === 0, 'Nishon ikki marta berilmaydi');
    win('DURAK');
    win('BURA');
    const fifth = win('ONE_HUNDRED_EIGHT', ['QUEEN_SPADES_EXIT']);
    assert(fifth.get('a')!.newAchievements.sort().join() === 'ALL_GAMES,QUEEN_SPADES_EXIT,STREAK_5', `Uch o'yin, qarg'a damasi va 5 ta seriya (${fifth.get('a')!.newAchievements})`);
  }

  // 3. Kunlik vazifalar va ketma-ketlik
  {
    const store = new UserStore(null);
    store.upsert('a', { username: 'a', displayName: 'Ali' });
    const play = (now: number, won: boolean, gameType: any) =>
      store.recordGameResult({ gameType, humanPlayerIds: ['a', 'b'], winners: won ? ['a'] : [], losers: won ? ['b'] : ['a'], rated: false, playerNames: { a: 'Ali', b: 'Vali' }, now });
    store.upsert('b', { username: 'b', displayName: 'Vali' });

    const tasks = dailyTaskIdsFor(new Date(t0).toISOString().slice(0, 10));
    assert(tasks.length === 3 && tasks[0] === 'PLAY_3' && tasks[1] === 'WIN_1', 'Har kuni 3 ta vazifa');

    let streakDays = 0;
    for (let day = 0; day < 7; day++) {
      const now = t0 + day * DAY;
      const results = [play(now, true, 'BURA'), play(now + 1, true, 'DURAK'), play(now + 2, true, 'ONE_HUNDRED_EIGHT')];
      if (results.some(r => r.get('a')!.dailyJustCompleted)) streakDays++;
    }
    const view = getDailyView(store.get('a')!, t0 + 6 * DAY);
    assert(streakDays === 7 && view.completed && view.streak === 7, `7 kun ketma-ket bajarildi (streak ${view.streak})`);
    assert(!!store.get('a')!.achievements?.DAILY_7, '"Haftalik sadoqat" nishoni berildi');
    assert(getDailyView(store.get('a')!, t0 + 9 * DAY).streak === 0, "Kun o'tkazib yuborilsa ketma-ketlik uziladi");
  }

  // 4. Mahallalar va haftalik liga
  {
    const store = new UserStore(null);
    ['a', 'b', 'c'].forEach(id => store.upsert(id, { username: id, displayName: id.toUpperCase() }));
    const created = store.createClan('a', "Chig'atoy", 'CHIG', t0);
    assert(!!created.clan && store.get('a')!.clanId === created.clan!.id, 'Mahalla ochildi');
    assert(!!store.createClan('b', "Chig'atoy", 'XYZ').error, 'Band nom rad etildi');
    assert(!!store.createClan('a', 'Boshqa', 'BSH').error, "Mahalladagi odam yangisini ocholmaydi");
    store.joinClan('b', created.clan!.id);
    store.recordGameResult({ gameType: 'BURA', humanPlayerIds: ['a', 'c'], winners: ['a'], losers: ['c'], rated: true, playerNames: { a: 'A', c: 'C' }, now: t0 });
    store.recordGameResult({ gameType: 'BURA', humanPlayerIds: ['b'], winners: ['b'], losers: [], rated: false, playerNames: { b: 'B', bot: 'Bot' }, now: t0 });
    const list = store.listClans(t0);
    assert(list[0].weeklyPoints === 4 && list[0].membersCount === 2, "Haftalik ochko: odamga qarshi +3, botga qarshi +1");
    assert(store.listClans(t0 + 7 * DAY)[0].weeklyPoints === 0, 'Yangi haftada ochko noldan');
    assert(weekKeyOf(t0) === '2026-09-28' && weekKeyOf(t0 + 6 * DAY) === '2026-09-28', 'Hafta dushanbadan boshlanadi');
    store.leaveClan('a');
    assert(store.getClan(created.clan!.id)!.leaderId === 'b', "Oqsoqol chiqsa, oqsoqollik keyingi a'zoga o'tdi");
    store.leaveClan('b');
    assert(!store.getClan(created.clan!.id), "Oxirgi a'zo chiqsa mahalla o'chirildi");
  }

  // 5. Do'kon: idempotent to'lov, VIP muddati, premium dizayn ochilishi
  {
    const store = new UserStore(null);
    store.upsert('a', { username: 'a', displayName: 'Ali' });
    store.grantShopItem('a', 'cardback_shoh_oltin', 'charge1', t0);
    store.grantShopItem('a', 'cardback_shoh_oltin', 'charge1', t0);
    assert(store.get('a')!.ownedItems!.join() === 'cardback_shoh_oltin', 'Mahsulot berildi, bir to\'lov ikki marta qo\'llanmadi');
    store.grantShopItem('a', 'vip_30', 'charge2', t0);
    store.grantShopItem('a', 'vip_30', 'charge3', t0 + DAY);
    assert(store.get('a')!.vipUntil === t0 + 60 * DAY, 'VIP ikkinchi xaridda muddatga qo\'shildi (60 kun)');
    assert(isThemeUnlocked('shoh_oltin', ['cardback_shoh_oltin']) && !isThemeUnlocked('samarqand_oltin', []), 'Sotib olingan dizayn ochiq, boshqasi qulf');
    assert(isThemeUnlocked('samarqand_oltin', [], t0 + 10 * DAY, t0), 'VIP barcha premium dizaynlarni ochadi');
    assert(isThemeUnlocked('classic_wood', []), 'Bepul dizaynlar doim ochiq');
  }

  // 6. Telegram to'lov oqimi (API chaqiruvlari soxta)
  {
    const bot = new TelegramBot('123:TEST', 'https://example.com');
    const calls: { method: string; data: any }[] = [];
    (bot as any).callApi = async (method: string, data: any) => {
      calls.push({ method, data });
      return { ok: true, result: 'https://t.me/$invoice' };
    };
    (bot as any).isRunning = true;
    const link = await bot.createInvoiceLink({ id: 'vip_30', kind: 'VIP', title: 'VIP', description: 'd', priceStars: 100 }, 'u_1');
    assert(link === 'https://t.me/$invoice' && calls[0].data.currency === 'XTR' && calls[0].data.prices[0].amount === 100, 'Stars hisob-fakturasi yaratildi');

    await (bot as any).handlePreCheckout({ id: 'q1', currency: 'XTR', total_amount: 100, invoice_payload: JSON.stringify({ itemId: 'vip_30', userId: 'u_1' }) });
    assert(calls[1].method === 'answerPreCheckoutQuery' && calls[1].data.ok === true, "To'g'ri narx - to'lov tasdiqlandi");
    await (bot as any).handlePreCheckout({ id: 'q2', currency: 'XTR', total_amount: 1, invoice_payload: JSON.stringify({ itemId: 'vip_30', userId: 'u_1' }) });
    assert(calls[2].data.ok === false, "Noto'g'ri narx - to'lov rad etildi");

    let paid: PaymentEvent | undefined;
    bot.onPayment = (e) => (paid = e);
    (bot as any).handleSuccessfulPayment({ from: { id: 77 }, successful_payment: { telegram_payment_charge_id: 'ch_1', invoice_payload: JSON.stringify({ itemId: 'vip_30', userId: 'u_1' }) } });
    assert(paid?.userId === 'u_1' && paid.itemId === 'vip_30' && paid.chargeId === 'ch_1', "Muvaffaqiyatli to'lov serverga yetkazildi");
  }

  // 7. Butun zanjir: stolda Moskva ochildi -> o'yin tugadi -> ELO, tarix va "Moskva" nishoni yozildi
  {
    const store = new UserStore(null);
    store.upsert('p1', { username: 'ali', displayName: 'Ali' });
    store.upsert('p2', { username: 'vali', displayName: 'Vali' });
    const room = new GameRoom('moskva', { id: 'moskva', gameType: 'BURA', rules: 'ODDIY', maxPlayers: 2, turnTimeoutSeconds: 30, isPrivate: true, deckType: '36' }, new ChatManager());
    let effects: Map<string, any> = new Map();
    room.onGameOver = r => (effects = recordRoomResult(r, store));
    room.addPlayer('p1', 'Ali', false, () => {});
    room.addPlayer('p2', 'Vali', false, () => {});
    const engine = room.engine as BuraEngine;
    engine.status = 'PLAYING';
    engine.isResolvingTrick = false;
    engine.players[0].hand = ['HEARTS', 'SPADES', 'CLUBS', 'DIAMONDS'].map(suit => ({ suit: suit as any, rank: 'A' as const, id: `${suit}_A` }));
    const res = room.handlePlayerAction('p1', 'DECLARE_COMBINATION', { type: 'MOSKVA' });
    assert(res.success && (engine.status as string) === 'GAME_OVER', 'Moskva partiyani tugatdi');
    const ali = store.get('p1')!;
    assert(effects.get('p1')?.delta === 16 && ali.ratings?.BURA === 1016, "Odamlar o'rtasida - ELO +16");
    assert(!!ali.achievements?.MOSKVA && !!ali.achievements?.FIRST_WIN, "Moskva va birinchi g'alaba nishonlari yozildi");
    assert(store.get('p2')!.history?.[0].result === 'LOSS', 'Yutqazganning tarixiga yozildi');
    room.dispose();
  }

  console.log('\n🎉 IJTIMOIY QISM TESTLARI O\'TDI!');
  process.exit(0);
})();
