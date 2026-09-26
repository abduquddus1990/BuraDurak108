import crypto from 'crypto';

export interface VerifiedTelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
}

// initData shuncha vaqtdan eski bo'lsa qabul qilinmaydi (o'g'irlangan initData ni qayta ishlatishni cheklash)
const DEFAULT_MAX_AGE_SEC = 24 * 60 * 60;

/**
 * Telegram Mini App `initData` imzosini tekshiradi.
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 * Imzo to'g'ri bo'lsa foydalanuvchini, aks holda null qaytaradi.
 */
export function verifyTelegramInitData(
  initData: string,
  botToken: string,
  maxAgeSec: number = DEFAULT_MAX_AGE_SEC,
  nowSec: number = Math.floor(Date.now() / 1000)
): VerifiedTelegramUser | null {
  if (!initData || !botToken) return null;

  let params: URLSearchParams;
  try {
    params = new URLSearchParams(initData);
  } catch {
    return null;
  }

  const hash = params.get('hash');
  if (!hash || !/^[0-9a-f]{64}$/i.test(hash)) return null;
  params.delete('hash');

  const dataCheckString = Array.from(params.entries())
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const computed = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest();
  const received = Buffer.from(hash, 'hex');
  if (received.length !== computed.length || !crypto.timingSafeEqual(received, computed)) return null;

  const authDate = Number(params.get('auth_date'));
  if (!Number.isFinite(authDate) || nowSec - authDate > maxAgeSec) return null;

  try {
    const user = JSON.parse(params.get('user') || 'null');
    if (!user || typeof user.id !== 'number') return null;
    return user;
  } catch {
    return null;
  }
}

// Test va dev uchun: berilgan token bilan to'g'ri imzolangan initData yasash
export function signTelegramInitData(fields: Record<string, string>, botToken: string): string {
  const params = new URLSearchParams(fields);
  const dataCheckString = Array.from(params.entries())
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  params.set('hash', crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex'));
  return params.toString();
}
