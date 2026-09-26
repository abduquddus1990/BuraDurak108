export interface TelegramBotInfo {
  id: number;
  is_bot: boolean;
  first_name: string;
  username?: string;
}

// HTML parse_mode da foydalanuvchi matni xavfsiz bo'lishi uchun (aks holda "<" yoki "&" li ism xabarni buzadi)
const escapeHtml = (text: string): string =>
  String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export class TelegramBot {
  private token: string;
  private miniAppUrl: string;
  private isRunning: boolean = false;
  private offset: number = 0;
  private botInfo: TelegramBotInfo | null = null;
  private pollTimeout?: NodeJS.Timeout;
  private userChats: Map<string, number> = new Map(); // username (lowercase) -> chatId

  constructor(token?: string, miniAppUrl?: string) {
    this.token = token || process.env.TELEGRAM_BOT_TOKEN || '';
    this.miniAppUrl = miniAppUrl || process.env.MINI_APP_URL || 'http://localhost:3000';
  }

  public async start(): Promise<boolean> {
    if (!this.token || this.token.trim() === '') {
      console.log('💡 [Telegram Bot] TELEGRAM_BOT_TOKEN ko\'rsatilmagan.');
      console.log('👉 Botni ishga tushirish uchun "server/.env" fayliga TELEGRAM_BOT_TOKEN=<sizning_token> ni yozing.');
      return false;
    }

    try {
      const meRes = await this.callApi('getMe', {});
      if (!meRes.ok) {
        console.error('❌ [Telegram Bot] Noto\'g\'ri token yoki ulanish xatosi:', meRes.description);
        return false;
      }

      this.botInfo = meRes.result;
      this.isRunning = true;
      console.log(`🤖 [Telegram Bot] Muvaffaqiyatli ishga tushdi: @${this.botInfo?.username} (${this.botInfo?.first_name})`);

      // 1. Bot menyu tugmasini (Mini App WebApp) sozlash
      await this.setupMenuButton();

      // 2. Buyruqlar ro'yxatini ro'yxatdan o'tkazish
      await this.setupCommands();

      // 3. Xabarlarni qabul qilish siklini boshlash (Long Polling)
      this.pollUpdates();
      return true;
    } catch (err: any) {
      console.error('❌ [Telegram Bot] Ishga tushirishda xato:', err.message);
      return false;
    }
  }

  public stop(): void {
    this.isRunning = false;
    if (this.pollTimeout) clearTimeout(this.pollTimeout);
  }

  public getStatus(): { isRunning: boolean; botUsername?: string; miniAppUrl: string } {
    return {
      isRunning: this.isRunning,
      botUsername: this.botInfo?.username,
      miniAppUrl: this.miniAppUrl,
    };
  }

  // Mini App initData imzosini tekshirish uchun (token /api/bot/configure orqali almashishi mumkin)
  public getToken(): string {
    return this.token;
  }

  public updateToken(newToken: string, newMiniAppUrl?: string): Promise<boolean> {
    this.stop();
    this.token = newToken;
    if (newMiniAppUrl) this.miniAppUrl = newMiniAppUrl;
    return this.start();
  }

  private async setupMenuButton(): Promise<void> {
    try {
      // Agar Mini App HTTPS bo'lsa, Telegram pastki chap burchagiga doimiy "Choyxona ☕" tugmasini ulaydi
      if (this.miniAppUrl.startsWith('https://')) {
        await this.callApi('setChatMenuButton', {
          menu_button: {
            type: 'web_app',
            text: 'Choyxona ☕',
            web_app: { url: this.miniAppUrl },
          },
        });
        console.log(`✅ [Telegram Bot] Mini App Menyu tugmasi ulandi: ${this.miniAppUrl}`);
      }
    } catch (e: any) {
      console.warn('⚠️ [Telegram Bot] Menyu tugmasini sozlashda ogohlantirish:', e.message);
    }
  }

  private async setupCommands(): Promise<void> {
    try {
      await this.callApi('setMyCommands', {
        commands: [
          { command: 'start', description: '🎮 Choyxona o\'yinlarini ochish' },
          { command: 'games', description: '🃏 O\'yin turlari (Bura, Durak, 108)' },
          { command: 'rules', description: '📜 Qoidalar va kombinatsiyalar' },
          { command: 'help', description: '📞 Yordam va ma\'lumot' },
        ],
      });
    } catch (e: any) {
      console.warn('⚠️ [Telegram Bot] Buyruqlarni sozlashda ogohlantirish:', e.message);
    }
  }

  private async pollUpdates(): Promise<void> {
    if (!this.isRunning) return;

    try {
      const res = await this.callApi('getUpdates', {
        offset: this.offset,
        timeout: 20,
        allowed_updates: ['message', 'callback_query'],
      });

      if (res.ok && Array.isArray(res.result)) {
        for (const update of res.result) {
          this.offset = update.update_id + 1;
          try {
            if (update.message) {
              await this.handleMessage(update.message);
            } else if (update.callback_query) {
              await this.handleCallbackQuery(update.callback_query);
            }
          } catch (e: any) {
            console.warn('⚠️ [Telegram Bot] Xabarni qayta ishlashda xato:', e.message);
          }
        }
      }
    } catch (e: any) {
      // Tarmoq xatosi bo'lsa biroz kutib qayta urinadi
    }

    if (this.isRunning) {
      this.pollTimeout = setTimeout(() => this.pollUpdates(), 500);
    }
  }

  private async handleMessage(msg: any): Promise<void> {
    const chatId = msg.chat?.id;
    const text = (msg.text || '').trim();
    const fromName = escapeHtml(msg.from?.first_name || 'Qadrdon');

    if (!chatId) return;

    if (msg.from?.username) {
      this.userChats.set(msg.from.username.toLowerCase(), chatId);
    }

    if (text.startsWith('/start')) {
      const parts = text.split(' ');
      const startPayload = parts.length > 1 ? parts[1] : '';
      let targetRoomId: string | null = null;
      if (startPayload.startsWith('join_')) {
        const candidate = startPayload.replace('join_', '');
        if (/^[A-Za-z0-9_-]{1,64}$/.test(candidate)) targetRoomId = candidate;
      }

      if (targetRoomId) {
        const joinAppUrl = this.miniAppUrl.startsWith('https://')
          ? `${this.miniAppUrl}?joinRoom=${targetRoomId}`
          : `${this.miniAppUrl}/?joinRoom=${targetRoomId}`;

        await this.callApi('sendMessage', {
          chat_id: chatId,
          text: `🍵 Assalomu alaykum, <b>${fromName}</b>!\n\nDo'stingiz sizni <b>#${targetRoomId}</b> raqamli o'yin stoliga taklif qildi!\n\n👇 Stolga qo'shilish uchun quyidagi tugmani bosing:`,
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [
                this.miniAppUrl.startsWith('https://')
                  ? { text: "☕ Stolga Kirish", web_app: { url: joinAppUrl } }
                  : { text: "☕ Stolga Kirish", url: joinAppUrl }
              ]
            ]
          }
        });
        return;
      }

      const welcomeText = 
`Assalomu alaykum, <b>${fromName}</b>! 🍵

<b>«Choyxona Games»</b> milliy o'yinlar maydoniga xush kelibsiz!

Bu yerda siz:
☕ <b>Bura</b> (Oddiy, Molotkali, 41 lik, 6 talik Qaytarma)
🛡️ <b>Durak</b> (Perekidli, Perekidsiz)
🎯 <b>108 O'yini</b> (7 va 6 jarima zanjiri)

o'yinlarini do'stlaringiz yoki aqlli botlar bilan o'ynashingiz mumkin.

👇 O'yinni boshlash uchun quyidagi tugmani bosing:`;

      const replyMarkup: any = {
        inline_keyboard: [
          [
            this.miniAppUrl.startsWith('https://')
              ? { text: "☕ Choyxonaga Kirish (O'ynash)", web_app: { url: this.miniAppUrl } }
              : { text: "🌐 O'yinni Ochish (Brauzer)", url: this.miniAppUrl }
          ],
          [
            { text: "📜 O'yin Qoidalari", callback_data: "cmd_rules" },
            { text: "👥 Do'stlar va Xonalar", callback_data: "cmd_friends" }
          ]
        ]
      };

      await this.callApi('sendMessage', {
        chat_id: chatId,
        text: welcomeText,
        parse_mode: 'HTML',
        reply_markup: replyMarkup,
      });
      return;
    }

    if (text === '/games') {
      await this.sendGames(chatId);
      return;
    }

    if (text === '/rules') {
      await this.sendRules(chatId);
      return;
    }

    if (text === '/help') {
      const helpText =
`📞 <b>Aloqa va Yordam:</b>

O'yinda taklif va mulohazalaringiz bo'lsa, dasturchi bilan bog'laning:
👤 Telegram: @ai_loyihachi

Maroqli hordiq tilaymiz! 🍵`;

      await this.callApi('sendMessage', {
        chat_id: chatId,
        text: helpText,
        parse_mode: 'HTML',
      });
      return;
    }

    // Noma'lum xabarlarga xushmuomala javob
    await this.callApi('sendMessage', {
      chat_id: chatId,
      text: `Salom, ${fromName}! O'yinni boshlash uchun quyidagi tugmani bosing:`,
      reply_markup: {
        inline_keyboard: [
          [
            this.miniAppUrl.startsWith('https://')
              ? { text: "☕ Choyxonaga Kirish", web_app: { url: this.miniAppUrl } }
              : { text: "🌐 O'yinni Ochish", url: this.miniAppUrl }
          ]
        ]
      }
    });
  }

  // /start xabaridagi inline tugmalar (ilgari ularga javob berilmay, tugma "yuklanmoqda" holatida qotib qolardi)
  private async handleCallbackQuery(query: any): Promise<void> {
    await this.callApi('answerCallbackQuery', { callback_query_id: query.id });
    const chatId = query.message?.chat?.id;
    if (!chatId) return;
    if (query.data === 'cmd_rules') {
      await this.sendRules(chatId);
    } else if (query.data === 'cmd_friends') {
      await this.callApi('sendMessage', {
        chat_id: chatId,
        text: "👥 Do'stlar bilan o'ynash uchun ilovani oching, <b>\"Do'stlar bilan\"</b> tugmasi orqali stol yarating va havolani do'stingizga yuboring.",
        parse_mode: 'HTML',
      });
    }
  }

  private async sendGames(chatId: number): Promise<void> {
    {
      const gamesText =
`🃏 <b>CHOYXONA O'YINLARI:</b>

1. ☕ <b>Bura (Burkozel):</b>
• Har bir o'yinchiga 4 tadan (yoki 6 tadan) karta tarqatiladi.
• 10 kartasi Korol (K), Dama (Q) va Valet (J) lardan katta!
• Kombinatsiyalar: Moskva (4 Tuz), Bura (4 Kozir), Molodka (4 ta bir xil mast), 41+ ochko.
• O'yin -12 gacha (12 jarima ochkogacha) davom etadi.

2. 🛡️ <b>Durak:</b>
• 36 ta karta. Kozir belgilanadi.
• Himoyachi kartalarni uradi yoki oladi.
• 4 va 6 kishilikda faqat yonidagi qo'shnilar karta tashlay oladi.

3. 🎯 <b>108 O'yini:</b>
• 7 tashlanganda keyingi raqib 2 ta, keyingisi ham 7 tashlasa 4 ta, 8 ta... ko'taradi!
• 108 ochkodan oshgan o'yinchi chiqib ketadi!`;

      await this.callApi('sendMessage', {
        chat_id: chatId,
        text: gamesText,
        parse_mode: 'HTML',
      });
    }
  }

  private async sendRules(chatId: number): Promise<void> {
    {
      const rulesText =
`📜 <b>BURA VA CHOYXONA QOIDALARI:</b>

🔹 <b>Kartalar Kattaligi:</b>
Tuz (11 ochko) > 10 (10 ochko) > Korol (4 ochko) > Dama (3 ochko) > Valet (2 ochko) > 9, 8, 7, 6 (0 ochko).

🔹 <b>Maxsus Kombinatsiyalar:</b>
• 👑 <b>Moskva:</b> 4 ta Tuz — butun o'yin g'olibi!
• ⚡ <b>Bura:</b> 4 ta Kozir — raund g'olibi (61 ochko)!
• 🔨 <b>Molodka:</b> 4 ta bir xil nokozir mast — navbatsiz tashlanadi!
• 🎯 <b>41+ ochko:</b> Bir yurishda 41 dan ortiq ochkolik kartalar bilan yurish.
• 🥚 <b>Tuxum:</b> Ochkolar teng bo'lsa qo'l qayta tarqatiladi, keyingi jarimalar x2 (yana tuxum - x4).

🔹 <b>Birinchi yurish:</b>
1-qo'lda eng kichik kozirga ega o'yinchi yuradi. Keyingi qo'llarda yutgan o'yinchi boshlaydi.`;

      await this.callApi('sendMessage', {
        chat_id: chatId,
        text: rulesText,
        parse_mode: 'HTML',
      });
    }
  }

  public async sendGameInvite(
    targetUsername: string,
    inviterName: string,
    roomId: string,
    gameType: string
  ): Promise<boolean> {
    if (!this.isRunning || !this.token) return false;
    const clean = targetUsername.replace('@', '').trim().toLowerCase();
    const chatId = this.userChats.get(clean);
    if (!chatId) return false;

    const gameLabel = gameType === 'BURA' ? '☕ Bura' : gameType === 'ONE_HUNDRED_EIGHT' ? '🎯 108 O\'yini' : '🛡️ Durak';
    const appUrl = this.miniAppUrl.startsWith('https://')
      ? `${this.miniAppUrl}?joinRoom=${encodeURIComponent(roomId)}`
      : `${this.miniAppUrl}/?joinRoom=${encodeURIComponent(roomId)}`;

    const text = `Assalomu alaykum! 🍵\n\n<b>${escapeHtml(inviterName)}</b> sizni «Choyxona»da <b>${gameLabel}</b> o'yiniga taklif qildi!\nStol kodi: <code>#${escapeHtml(roomId)}</code>\n\n👇 O'yinga qo'shilish uchun bosing:`;

    try {
      const res = await this.callApi('sendMessage', {
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [
              this.miniAppUrl.startsWith('https://')
                ? { text: "☕ Stolga Kirish", web_app: { url: appUrl } }
                : { text: "☕ Stolga Kirish", url: appUrl }
            ]
          ]
        }
      });
      return !!res?.ok;
    } catch (e) {
      return false;
    }
  }

  private async callApi(method: string, data: any): Promise<any> {
    const url = `https://api.telegram.org/bot${this.token}/${method}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  }
}
