// Natija yoki yutuqni do'stlarga ulashish. Havola botga (bo'lmasa ilovaning o'ziga) olib boradi -
// shu orqali yangi o'yinchilar keladi.

let botUsername: string | undefined;

export function setShareBotUsername(username?: string): void {
  botUsername = username || undefined;
}

export function appLink(): string {
  return botUsername ? `https://t.me/${botUsername}` : window.location.origin;
}

export function shareText(text: string): void {
  const url = appLink();
  const tg = (window as any).Telegram?.WebApp;
  const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
  try {
    if (tg?.openTelegramLink) {
      tg.openTelegramLink(shareUrl);
      return;
    }
  } catch (e) {}
  if (navigator.share) {
    navigator.share({ text, url }).catch(() => {});
    return;
  }
  window.open(shareUrl, '_blank');
}

const GAME_NAMES: Record<string, string> = { BURA: 'Bura', DURAK: 'Durak', ONE_HUNDRED_EIGHT: '108' };

export function gameResultText(gameType: string, won: boolean, extra?: string): string {
  const game = GAME_NAMES[gameType] || gameType;
  const base = won
    ? `🏆 Choyxona'da ${game} partiyasini yutdim!`
    : `🍵 Choyxona'da ${game} o'ynadim - navbatdagi safar albatta yutaman!`;
  return `${base}${extra ? ` ${extra}` : ''} Kel, bir qo'l o'ynaymiz 🃏`;
}
