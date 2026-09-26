import WebSocket from 'ws';

async function runTest() {
  console.log('--- TEST BOSHLANDI ---');
  const ws1 = new WebSocket('ws://localhost:3001');
  const ws2 = new WebSocket('ws://localhost:3001');

  await Promise.all([
    new Promise((res) => ws1.on('open', res)),
    new Promise((res) => ws2.on('open', res)),
  ]);

  console.log('1. Har ikki foydalanuvchi WebSocket orqali ulandi.');

  // Foydalanuvchi 1: Alisher (@alisher_uz)
  ws1.send(
    JSON.stringify({
      type: 'REGISTER_USER',
      payload: { displayName: 'Alisher' },
    })
  );

  // Foydalanuvchi 2: Rustam (@rustam_uz)
  ws2.send(
    JSON.stringify({
      type: 'REGISTER_USER',
      payload: { displayName: 'Rustam' },
    })
  );

  await new Promise((r) => setTimeout(r, 600));

  let inviteReceived = false;
  let sentConfirmation = false;

  ws2.on('message', (data) => {
    const msg = JSON.parse(data.toString());
    if (msg.type === 'TABLE_INVITATION') {
      console.log('2-foydalanuvchi (Rustam) ekraniga taklifnoma keldi:', msg.payload);
      inviteReceived = true;
    }
  });

  ws1.on('message', (data) => {
    const msg = JSON.parse(data.toString());
    if (msg.type === 'INVITATION_SENT') {
      console.log('1-foydalanuvchi (Alisher)ga yetkazish tasdigi keldi:', msg);
      sentConfirmation = true;
    }
  });

  // Alisher xona ochadi
  const roomId = `room_fr_inv_${Date.now() % 1000000}`;
  ws1.send(
    JSON.stringify({
      type: 'CREATE_MULTIPLAYER_ROOM',
      payload: {
        playerId: 'user_alisher',
        playerName: 'Alisher',
        gameType: 'BURA',
        rules: 'ODDIY',
        totalPlayers: 2,
        roomId: roomId,
      },
    })
  );

  await new Promise((r) => setTimeout(r, 600));

  // Alisher Rustamni (@rustam_uz) stolga taklif qiladi
  console.log('2. Alisher Rustamga taklif yubormoqda...');
  ws1.send(
    JSON.stringify({
      type: 'INVITE_USER',
      payload: {
        targetUsername: 'Rustam',
        roomId: roomId,
        roomSettings: { gameType: 'BURA', rules: 'ODDIY', maxPlayers: 2 },
        inviterName: 'Alisher',
        inviterId: 'user_alisher',
      },
    })
  );

  await new Promise((r) => setTimeout(r, 1500));

  if (inviteReceived && sentConfirmation) {
    console.log('TEST MUVAFFAQIYATLI: Taklifnoma togridan-togri dostning ekraniga chiqdi!');
  } else {
    console.error(
      'TEST XATOLIK: Taklif yetib bormadi. inviteReceived:',
      inviteReceived,
      'sentConfirmation:',
      sentConfirmation
    );
  }

  ws1.close();
  ws2.close();
  process.exit(inviteReceived && sentConfirmation ? 0 : 1);
}

runTest();
