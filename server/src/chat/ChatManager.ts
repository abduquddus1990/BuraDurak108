import { ChatMessage, CHAT_CONFIG, CHOYXONA_QUICK_PHRASES } from '../../../shared/src/types/chat';

export class ChatManager {
  private messagesByRoom: Map<string, ChatMessage[]> = new Map();
  private lastMessageTime: Map<string, number> = new Map(); // senderId -> timestamp

  public canSendMessage(senderId: string): { allowed: boolean; waitMs?: number } {
    const lastTime = this.lastMessageTime.get(senderId);
    if (!lastTime) return { allowed: true };

    const now = Date.now();
    const elapsed = now - lastTime;
    if (elapsed < CHAT_CONFIG.RATE_LIMIT_MS) {
      return { allowed: false, waitMs: CHAT_CONFIG.RATE_LIMIT_MS - elapsed };
    }

    return { allowed: true };
  }

  public sendMessage(
    roomId: string,
    senderId: string,
    senderName: string,
    text: string,
    isQuickPhrase: boolean = false
  ): { success: boolean; message?: ChatMessage; error?: string } {
    const check = this.canSendMessage(senderId);
    if (!check.allowed) {
      const waitSec = Math.ceil((check.waitMs || 0) / 1000);
      return {
        success: false,
        error: `Spamdan himoya! Iltimos, yana ${waitSec} soniya kuting.`,
      };
    }

    const cleanText = String(text ?? '').trim().slice(0, CHAT_CONFIG.MAX_MESSAGE_LENGTH);
    if (!cleanText) {
      return { success: false, error: "Bo'sh xabar yuborib bo'lmaydi." };
    }

    const msg: ChatMessage = {
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      senderId,
      senderName,
      text: cleanText,
      timestamp: Date.now(),
      isQuickPhrase,
    };

    if (!this.messagesByRoom.has(roomId)) {
      this.messagesByRoom.set(roomId, []);
    }
    const roomMessages = this.messagesByRoom.get(roomId)!;
    roomMessages.push(msg);

    // Xotirada oxirgi 50 ta xabarni saqlash
    if (roomMessages.length > 50) {
      roomMessages.shift();
    }

    this.lastMessageTime.set(senderId, Date.now());
    return { success: true, message: msg };
  }

  public clearRoom(roomId: string): void {
    this.messagesByRoom.delete(roomId);
  }

  public getRoomMessages(roomId: string): ChatMessage[] {
    return this.messagesByRoom.get(roomId) || [];
  }
}
