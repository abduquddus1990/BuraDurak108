import { spawn } from 'child_process';
import { loadEnv } from './utils/env';

loadEnv();

let isRestarting = false;

async function updateBotUrl(url: string) {
  try {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const adminToken = process.env.ADMIN_TOKEN;
    if (!token || !adminToken) {
      console.warn("⚠️ [Tunnel] TELEGRAM_BOT_TOKEN yoki ADMIN_TOKEN .env da ko'rsatilmagan, bot yangilanmadi.");
      return;
    }
    const port = process.env.PORT || 3001;
    const res = await fetch(`http://localhost:${port}/api/bot/configure`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Admin-Token': adminToken },
      body: JSON.stringify({ token, miniAppUrl: url }),
    });
    if (!res.ok) {
      console.warn(`⚠️ [Tunnel] Server botni yangilashni rad etdi (HTTP ${res.status})`);
      return;
    }
    console.log(`\n🎉 [Tunnel] Bot muvaffaqiyatli yangilandi: ${url}`);
  } catch (err: any) {
    console.warn(`⚠️ [Tunnel] Botni yangilashda xato:`, err.message);
  }
}

function startTunnel() {
  console.log('🚀 [Tunnel] localhost.run xavfsiz HTTPS tunneli ulanmoqda...');

  const ssh = spawn(
    'ssh',
    [
      '-o', 'StrictHostKeyChecking=no',
      '-o', 'ServerAliveInterval=15',
      '-o', 'ServerAliveCountMax=10',
      '-R', `80:localhost:${process.env.PORT || 3001}`,
      'nokey@localhost.run',
    ],
    { stdio: ['ignore', 'pipe', 'pipe'] }
  );

  let detectedUrl: string | null = null;

  ssh.stdout.on('data', async (chunk: Buffer) => {
    const text = chunk.toString();
    // HTTPS manzilini topish: masalan https://xxxx.lhr.life
    const match = text.match(/https:\/\/[a-zA-Z0-9.-]+\.lhr\.life/);
    if (match && match[0] && match[0] !== detectedUrl) {
      detectedUrl = match[0];
      console.log(`\n🌐 [Tunnel] JONLI HTTPS HAVOLA: ${detectedUrl}`);
      await updateBotUrl(detectedUrl);
    }
  });

  ssh.stderr.on('data', (chunk: Buffer) => {
    // Ba'zan ma'lumotlar stderr da keladi
    const text = chunk.toString();
    const match = text.match(/https:\/\/[a-zA-Z0-9.-]+\.lhr\.life/);
    if (match && match[0] && match[0] !== detectedUrl) {
      detectedUrl = match[0];
      console.log(`\n🌐 [Tunnel] JONLI HTTPS HAVOLA: ${detectedUrl}`);
      updateBotUrl(detectedUrl);
    }
  });

  ssh.on('close', (code) => {
    console.log(`⚠️ [Tunnel] Tunnel uzildi (kod: ${code}). 3 soniyadan so'ng qayta ulanadi...`);
    detectedUrl = null;
    if (!isRestarting) {
      isRestarting = true;
      setTimeout(() => {
        isRestarting = false;
        startTunnel();
      }, 3000);
    }
  });

  ssh.on('error', (err) => {
    console.error(`❌ [Tunnel] Xato:`, err.message);
  });
}

startTunnel();
