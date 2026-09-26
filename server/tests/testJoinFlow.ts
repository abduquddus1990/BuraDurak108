import WebSocket from 'ws';

async function runJoinTest() {
  console.log('--- JOIN TEST BOSHLANDI ---');
  const ws1 = new WebSocket('ws://localhost:3001');
  const ws2 = new WebSocket('ws://localhost:3001');

  await Promise.all([
    new Promise((res) => ws1.on('open', res)),
    new Promise((res) => ws2.on('open', res)),
  ]);

  ws1.send(JSON.stringify({ type: 'REGISTER_USER', payload: { displayName: 'Ali' } }));
  ws2.send(JSON.stringify({ type: 'REGISTER_USER', payload: { displayName: 'Vali' } }));

  await new Promise(r => setTimeout(r, 400));

  const roomId = `room_fr_play_${Date.now() % 1000000}`;
  ws1.send(JSON.stringify({
    type: 'CREATE_MULTIPLAYER_ROOM',
    payload: { playerId: 'u1', playerName: 'Ali', gameType: 'BURA', rules: 'ODDIY', totalPlayers: 2, roomId }
  }));

  await new Promise(r => setTimeout(r, 400));

  let bothInTable = false;
  let u1TablePlayers = 0;
  let u2TablePlayers = 0;

  ws1.on('message', (d) => {
    const msg = JSON.parse(d.toString());
    if (msg.type === 'TABLE_UPDATE') {
      u1TablePlayers = msg.tableState.players.length;
      console.log('Ali stol yangilanishini oldi. O\'yinchilar soni:', u1TablePlayers);
    }
  });

  ws2.on('message', (d) => {
    const msg = JSON.parse(d.toString());
    if (msg.type === 'TABLE_UPDATE') {
      u2TablePlayers = msg.tableState.players.length;
      console.log('Vali stol yangilanishini oldi. O\'yinchilar soni:', u2TablePlayers);
    }
  });

  // Vali stolga qo'shiladi
  ws2.send(JSON.stringify({
    type: 'JOIN_ROOM',
    payload: { roomId, playerId: 'u2', playerName: 'Vali' }
  }));

  await new Promise(r => setTimeout(r, 1000));

  if (u1TablePlayers === 2 && u2TablePlayers === 2) {
    console.log('🎉 TEST MUVAFFAQIYATLI: Har ikki o\'yinchi bir stolda uchrashdi va o\'yin boshlandi!');
  } else {
    console.error('❌ Xatolik: u1TablePlayers:', u1TablePlayers, 'u2TablePlayers:', u2TablePlayers);
  }

  ws1.close();
  ws2.close();
  process.exit(u1TablePlayers === 2 && u2TablePlayers === 2 ? 0 : 1);
}

runJoinTest();
