# 🍵 Choyxona Games — Telegram Mini App (Bura, 108 va Durak)

O‘zbekiston choyxona madaniyatiga xos bo‘lgan eng ommabop karta o‘yinlari platformasi: **Bura (31)**, **108 O‘yini** va **Durak**.

Loyiha qonuniy, pul tikilmaydigan sof musobaqa va do‘stona o‘yin (Competitive & Social Gaming) modelida qurilgan.

---

## 🎮 Kiritilgan O‘yinlar va Qoidalar

### 1. Bura / Burkozel (31 Ochko)
* **6 kartalik Qaytarma (Perebivka krugi):** 2 yoki 3 kishi uchun mo‘ljallangan. 2- yoki 3-odam kartani urganda, boshida yurgan o‘yinchi imkoni bo‘lsa uni yana qayta uradi va bu aylanma stoldagi eng katta kartani hech kim ura olmaguncha davom etadi.
* **Moskva (4 ta Tuz):** Navbatsiz ochiladi va **butun o‘yin (12 ochkolik partiya)** darhol Moskva egasining mutlaq g‘alabasi bilan tugaydi!
* **Bura (5-6 ta Kozir):** Navbatsiz ochiladi, partiya/raund g‘alabasi.
* **Molodka (5 ta bir xil nokozir mast):** Yurish navbati kelganda ochiladi va barcha 5 ta karta bilan birdaniga yuriladi.
* **41+ lik Qoida:** Qo‘ldagi kartalar yig‘indisi $\ge 41$ ochko (masalan, 3 ta 10 + 1 ta Tuz = 41) bo‘lsa, stolga ochiladi va raqiblar uni urishga urinadi. Ura olishmasa, ochgan o‘yinchi 41+ ochkoni o‘z hisobiga oladi.
* **Molotkali & Oddiy variantlar:** Klassik 3 kartalik 31 ochko qoidalari.

### 2. 108 O‘yini (4 tadan karta tarqatiladi)
* **1-variant (Korol Qarg‘a ♠):**
  * ♠ Qirol (Pikoviy Korol) — keyingi o‘yinchiga **4 ta karta oldiradi** va navbatini o‘tkazadi!
  * Valet (J) — istalgan karta ustiga tushadi va **yangi mastni (gulni) buyurtma qiladi**.
  * 6-lik — keyingi o‘yinchi 1 ta oladi; 7-lik — 2 ta oladi; 8-lik — yana o‘zi yuradi; Tuz — navbatni o‘tkazadi (propusk).
* **2-variant (Korol Olma ♥):**
  * ♥ Qirol (Olma Korol) — keyingi o‘yinchiga **5 ta karta oldiradi** va navbatini o‘tkazadi!
  * Dama (Q) — **yangi mastni buyurtma qiladi**.
  * Qolgan qirollar va valetlar oddiy, hech qanday kuchsiz.
  * 6 va 7 liklar ishlaydi.
* **108 ning eng oliy qoidasi (Qutqaruv / Kamikadze):**
  * Jarima ochkolari 108 dan oshsa o‘yindan chiqadi.
  * Agar raundda o‘yinchining jarimasi **aynan 108 ochko** bo‘lsa — uning ochkolari yonadi va **0 ga tushadi**!

### 3. Durak
* **Perekidli (Perevodnoy):** Himoyachi bir xil nominaldagi kartani qo‘yib hujumni keyingi o‘yinchiga o‘tkazadi.
* **Perekidsiz (Podkidnoy):** Klassik oddiy tashlanadigan durak.

---

## ⚡ Qulayliklar va Xususiyatlar

* **🤖 Aqlli Botlar (AI):** Yolg‘iz o‘ynash va mashq qilish uchun hisob-kitob qiluvchi botlar.
* **💬 Choyxona Chati:** O‘yin vaqtida stol a'zolari bilan tezkor milliy iboralar (*"Choydan quy, jigar!"*, *"Boring bilan yur!"*, *"Kozel bo‘lding-ku!"*) va spamdan himoya qiluvchi taymer (Rate limiter).
* **👥 Do‘stlar Davrasi:** Telegram orqali bitta havola bilan do‘stni aynan o‘z stolingizga taklif qilish (`t.me/share/url`).
* **🛡️ Klanlar va Mahallalar:** Kelajakdagi respublika miqyosidagi mahalla musobaqalari uchun ELO reyting tizimi.

---

## 🔐 Kirish, Reyting va Navbat Vaqti

* **Kirish:** Telegram ichida foydalanuvchi avtomatik aniqlanadi — server Mini App `initData` imzosini bot tokeni bilan tekshiradi. Brauzerda esa server mehmon ID sini beradi va uni imzolaydi (boshqa odam uni o'zlashtira olmaydi).
* **Reyting (ELO):** faqat kamida 2 ta odam o'ynagan o'yinlarda o'zgaradi. Botlar bilan o'yinlar faqat statistikaga (o'yinlar/g'alabalar) yoziladi.
* **Navbat vaqti:** do'stlar bilan o'yinda har bir yurish uchun 30 soniya. Vaqt tugasa yoki o'yinchi uzilib qolsa, uning o'rniga server yuradi; qayta ulanganda o'yinchi o'z joyiga qaytadi.

## 🚀 Loyihani Ishga Tushirish

### 0. Sozlamalar (`server/.env`):
`server/.env.example` dan nusxa oling va to‘ldiring:
* `TELEGRAM_BOT_TOKEN` — @BotFather tokeni (**hech qachon kodga yozmang!**)
* `MINI_APP_URL` — Mini App HTTPS manzili
* `ADMIN_TOKEN` — `/api/bot/configure` uchun maxfiy kalit (bo‘sh bo‘lsa endpoint o‘chiq)
* `PORT` — server porti (standart: 3001)
* `DATA_DIR` — reyting va statistika saqlanadigan papka (standart: `server/data`)

### 1. Testlarni yurgazish (Dvijokni tekshirish):
```bash
cd server
npm test                 # unit va regressiya testlari
npm run test:sim         # botlar o'rtasida yuzlab o'yin simulyatsiyasi (qotib qolishni aniqlaydi)
npm run test:integration # WebSocket testlari (avval boshqa oynada: npm start)
```

### 2. Serverni ishga tushirish:
```bash
cd server
npm start
```
*Server manzili:* `http://localhost:3001` (WebSocket: `ws://localhost:3001`)

*HTTPS tunnel (localhost.run) orqali Telegramda sinash:* `npm run tunnel` — topilgan havola avtomatik ravishda botga yoziladi (`ADMIN_TOKEN` talab qilinadi).

### 3. Telegram Mini App (Frontend)ni ishga tushirish:
```bash
cd client
npm run dev
```
*Brauzerda ochish:* `http://localhost:3000`

---

## 📱 Telegram Mini App sifatida ulash (Yo‘riqnoma)

1. Telegramda **@BotFather** botiga kiring.
2. `/newbot` buyrug‘i bilan yangi bot oching (masalan, `@ChoyxonaGamesBot`).
3. `/newapp` buyrug‘ini bering va botingizni tanlang.
4. Ilova nomi va tavsifini yozing.
5. **Web App URL** so‘ralganda:
   - Sinov (lokal) uchun: `ngrok` yoki `localtunnel` orqali `http://localhost:3000` ni oching (masalan `https://xxx.ngrok-free.app`).
   - Prodakshn uchun: Frontendni **Cloudflare Pages** yoki **Vercel**ga bepul yuklab, o‘sha havolani kiriting (masalan `https://choyxona-bura.pages.dev`).
6. Tayyor! Endi botingizga kirib **/start** bosilsa, pastda **"Play"** yoki **"O‘ynash"** tugmasi orqali Mini App to‘liq ochiladi.
