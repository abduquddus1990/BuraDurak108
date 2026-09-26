// Integratsiya testi (server ishga tushgan bo'lishi kerak: npm start)
import WebSocket from 'ws';

const URL = 'ws://localhost:3001';
const wait = (ms: number) => new Promise(r => setTimeout(r, ms));

function client() {
  const ws = new WebSocket(URL);
  const inbox: any[] = [];
  ws.on('message', d => inbox.push(JSON.parse(d.toString())));
  const send = (type: string, payload: any) => ws.send(JSON.stringify({ type, payload }));
  const last = (type: string) => [...inbox].reverse().find(m => m.type === type);
  const opened = new Promise(r => ws.on('open', r));
  return { ws, inbox, send, last, opened };
}

function assert(cond: boolean, name: string) {
  if (!cond) { console.error(`❌ ${name}`); process.exit(1); }
  console.log(`✅ ${name}`);
}

(async () => {
  const a = client(), b = client(), c = client();
  await Promise.all([a.opened, b.opened, c.opened]);

  // 0. Sessiyasiz harakatlar rad etiladi, ID ni server beradi
  a.send('CREATE_BOT_ROOM', { gameType: 'BURA', rules: 'ODDIY', totalPlayers: 2 });
  await wait(200);
  assert(!!a.last('ERROR'), "Ro'yxatdan o'tmasdan xona ochib bo'lmaydi");
  a.send('REGISTER_USER', { displayName: 'A' });
  b.send('REGISTER_USER', { displayName: 'B' });
  c.send('REGISTER_USER', { displayName: 'C', guestId: 'u_forgedforged', guestToken: 'x'.repeat(40) });
  await wait(300);
  const fa = a.last('SESSION').profile.id, fb = b.last('SESSION').profile.id;
  const bGuestToken = b.last('SESSION').guestToken;
  assert(/^u_/.test(fa) && fa !== fb, 'Server har bir mehmonga alohida ID berdi');
  assert(c.last('SESSION').profile.id !== 'u_forgedforged', "Soxta mehmon tokeni bilan birovning ID sini olib bo'lmaydi");

  // 1. Noto'g'ri sozlamalar rad etiladi
  a.send('CREATE_BOT_ROOM', { gameType: 'BURA', rules: 'SIX_CARDS', totalPlayers: 4 });
  await wait(300);
  assert(a.last('ERROR')?.message?.includes("Noto'g'ri"), "6 talik Bura 4 kishiga ochilmaydi");

  // 2. Boshqa odamning stol ID si bilan xona ochib, uni egallab bo'lmaydi
  const roomId = `room_fr_it${Date.now() % 100000}`;
  a.send('CREATE_MULTIPLAYER_ROOM', { gameType: 'DURAK', rules: 'PEREKIDSIZ', totalPlayers: 2, roomId });
  await wait(300);
  assert(a.last('ROOM_CREATED')?.roomId === roomId, 'Mezbon stol ochdi');
  c.send('CREATE_MULTIPLAYER_ROOM', { gameType: 'BURA', rules: 'ODDIY', totalPlayers: 2, roomId });
  await wait(300);
  assert(c.last('ROOM_CREATED')?.roomId !== roomId, "Band ID bilan so'ralganda yangi ID berildi");

  // 3. Ikkinchi o'yinchi qo'shilib o'yin boshlanadi, keyin uziladi -> server uning o'rniga yuradi
  b.send('JOIN_ROOM', { roomId });
  await wait(500);
  const st = a.last('TABLE_UPDATE')?.tableState;
  assert(st?.status === 'PLAYING' && st.players.length === 2, "O'yin boshlandi");
  b.ws.close();
  await wait(300);
  const before = a.inbox.filter(m => m.type === 'TABLE_UPDATE').length;
  // A navbatda bo'lsa yuradi, keyin B (uzilgan) o'rniga server yurishi kerak
  for (let i = 0; i < 6; i++) {
    const s = a.last('TABLE_UPDATE');
    const active = s.tableState.players[s.tableState.activePlayerIndex];
    if (s.tableState.status !== 'PLAYING') break;
    if (active.id === fa) {
      const isDef = s.tableState.currentDefenderId === fa;
      if (isDef) a.send('GAME_ACTION', { action: 'TAKE' });
      else if (s.tableState.tableCards.length === 0) a.send('GAME_ACTION', { action: 'ATTACK', card: s.hand[0] });
      else a.send('GAME_ACTION', { action: 'PASS' });
    }
    await wait(1900);
  }
  const after = a.inbox.filter(m => m.type === 'TABLE_UPDATE').length;
  assert(after - before >= 3, `Uzilgan o'yinchi o'rniga avtomatik yurildi (${after - before} ta yangilanish)`);

  // 4. Uzilgan o'yinchi qayta ulanib o'z joyiga qaytadi va qo'lini oladi
  const b2 = client();
  await b2.opened;
  // Imzoli mehmon tokeni bilan o'sha ID qayta tiklanadi
  b2.send('REGISTER_USER', { guestId: fb, guestToken: bGuestToken });
  await wait(300);
  assert(b2.last('SESSION')?.profile.id === fb, "Mehmon tokeni bilan o'sha ID qaytarildi");
  b2.send('JOIN_ROOM', { roomId });
  await wait(500);
  assert(b2.last('ROOM_JOINED')?.roomId === roomId && Array.isArray(b2.last('TABLE_UPDATE')?.hand), "Qayta ulangan o'yinchi stolga qaytdi");

  // 5. Qo'lda yo'q (soxta) karta bilan harakat rad etiladi va sababi klientga yuboriladi.
  // (Mast/qiymatni soxtalashtirish unit-testda - testRegressions.ts #7 - aniq tekshirilgan)
  a.send('GAME_ACTION', { action: 'ATTACK', card: { id: 'NOT_MY_CARD', suit: 'HEARTS', rank: 'A' } });
  await wait(300);
  const err = a.last('ACTION_ERROR');
  assert(!!err, `Soxta karta bilan harakat rad etildi: ${err?.message}`);

  // 5.1 Tez o'yin: bir xil sozlamani tanlagan ikki o'yinchi bitta stolga tushadi
  const q1 = client(), q2 = client();
  await Promise.all([q1.opened, q2.opened]);
  q1.send('REGISTER_USER', { displayName: 'Q1' });
  q2.send('REGISTER_USER', { displayName: 'Q2' });
  await wait(300);
  q1.send('QUICK_MATCH_JOIN', { gameType: 'ONE_HUNDRED_EIGHT', rules: 'KOROL_QARGA', totalPlayers: 2 });
  await wait(300);
  assert(q1.last('QUICK_MATCH_STATUS')?.status?.waiting === 1, "Tez o'yin: navbatda 1 kishi");
  q2.send('QUICK_MATCH_JOIN', { gameType: 'ONE_HUNDRED_EIGHT', rules: 'KOROL_QARGA', totalPlayers: 2 });
  await wait(500);
  const r1 = q1.last('ROOM_JOINED')?.roomId, r2 = q2.last('ROOM_JOINED')?.roomId;
  assert(!!r1 && r1 === r2, "Tez o'yin: ikkalasi bitta stolga tushdi");
  assert(q1.last('TABLE_UPDATE')?.tableState?.status === 'PLAYING', "Tez o'yin: o'yin boshlandi");
  q1.ws.close();
  q2.ws.close();

  // 6. Reyting jadvali so'rovi ishlaydi
  a.send('GET_LEADERBOARD', {});
  await wait(300);
  assert(Array.isArray(a.last('LEADERBOARD')?.players), 'Reyting jadvali qaytarildi');

  for (const x of [a, b2, c]) x.ws.close();
  console.log('\n🎉 Server integratsiya testlari o\'tdi');
  process.exit(0);
})();
