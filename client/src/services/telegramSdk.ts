// Telegram WebApp SDK bilan xavfsiz ishlash

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
}

// Telegram tashqarisida null qaytaradi - shunda har bir brauzer o'zining takrorlanmas mehmon ID sini oladi.
// (Ilgari barcha brauzer foydalanuvchilariga bir xil mock ID berilib, ular bir-birining o'rnini egallardi.)
export function getTelegramUser(): TelegramUser | null {
  const tg = (window as any).Telegram?.WebApp;
  if (tg && tg.initDataUnsafe?.user) {
    return tg.initDataUnsafe.user;
  }
  return null;
}

// Imzolangan xom initData - server uni bot tokeni bilan tekshirib, foydalanuvchini aniqlaydi
export function getTelegramInitData(): string {
  return (window as any).Telegram?.WebApp?.initData || '';
}

// Telegram Stars hisob-fakturasini ochish; natija: 'paid' | 'cancelled' | 'failed' | 'pending'
export function openInvoice(link: string, onStatus: (status: string) => void): boolean {
  const tg = (window as any).Telegram?.WebApp;
  if (!tg?.openInvoice) return false;
  tg.openInvoice(link, onStatus);
  return true;
}

export function initTelegramApp(): void {
  const tg = (window as any).Telegram?.WebApp;
  if (tg) {
    tg.ready();
    tg.expand();
    tg.headerColor = '#1e1610';
    tg.backgroundColor = '#1e1610';
  }
}

export function triggerHaptic(type: 'light' | 'medium' | 'heavy' | 'success' | 'error' = 'light'): void {
  const tg = (window as any).Telegram?.WebApp;
  if (!tg?.HapticFeedback) return;

  if (type === 'success' || type === 'error') {
    tg.HapticFeedback.notificationOccurred(type);
  } else {
    tg.HapticFeedback.impactOccurred(type);
  }
}

export function requestFullscreenAndLandscape(): void {
  const tg = (window as any).Telegram?.WebApp;
  try {
    if (tg?.requestFullscreen) {
      tg.requestFullscreen();
    }
  } catch (e) {}

  try {
    if (tg?.lockOrientation) {
      tg.lockOrientation();
    }
  } catch (e) {}

  try {
    const orientation = window.screen?.orientation as any;
    if (orientation?.lock) {
      orientation.lock('landscape').catch(() => {});
    }
  } catch (e) {}
}

export function exitLandscape(): void {
  const tg = (window as any).Telegram?.WebApp;
  try {
    if (tg?.unlockOrientation) {
      tg.unlockOrientation();
    }
  } catch (e) {}

  try {
    const orientation = window.screen?.orientation as any;
    if (orientation?.unlock) {
      orientation.unlock();
    }
  } catch (e) {}
}
