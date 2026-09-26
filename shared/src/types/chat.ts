export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
  isQuickPhrase?: boolean;
}

export const CHOYXONA_QUICK_PHRASES = [
  'Choydan quy, jigar!',
  'Boring bilan yur!',
  'Shoshilma, o\'ylab o\'yna!',
  'Kozel bo\'lding-ku!',
  'Tuxumga qolding!',
  'Qo\'limda Moskva bor!',
  'Ura olmaysan baribir!',
  'Olg\'a, mahalla uchun!',
  'Karta yomg\'iri bo\'ldi!',
  'Rahmat o\'yin uchun!',
];

export const CHAT_CONFIG = {
  RATE_LIMIT_MS: 3000, // Xabarlar orasidagi majburiy tanaffus (spamdan himoya)
  MAX_MESSAGE_LENGTH: 100, // Xabar uzunligi chegarasi
};
