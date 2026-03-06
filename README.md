# 🎵 Video & Audio Downloader Bot

YouTube va Instagram dan video yoki audio yuklab oluvchi Telegram bot.

---

## ⚙️ O'rnatish

### 1. Kerakli dasturlarni o'rnatish

- [Node.js 18+](https://nodejs.org)
- [yt-dlp](https://github.com/yt-dlp/yt-dlp/releases)
- [ffmpeg](https://ffmpeg.org/download.html)

### 2. `.env` faylini sozlash

```env
BOT_TOKEN="your_bot_token"
APP_ID="your_app_id"
APP_HASH="your_app_hash"
TELEGRAM_LOCAL_API_URL="http://localhost:8081"

DOWNLOAD_DIR=./downloads
YT_DLP_PATH=yt-dlp
FFMPEG_PATH=ffmpeg
LOG_FILE=./logs/bot.log
```

> **BOT_TOKEN** → [@BotFather](https://t.me/BotFather) dan olinadi
> **APP_ID / APP_HASH** → [my.telegram.org](https://my.telegram.org) dan olinadi

### 3. Ishga tushirish

``` powershell:
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
Invoke-RestMethod -Uri https://get.scoop.sh | Invoke-Expression

scoop install yt-dlp

```

```bash
npm install

# Local Telegram API serverni ishga tushirish
docker-compose up -d

# Botni ishga tushirish
npm run build
npm start
```

---

## 🚀 Foydalanish

### Havola yuborish

Quyidagi havolalarni to'g'ridan-to'g'ri botga yuboring:

```
https://youtube.com/watch?v=xxxxx
https://youtu.be/xxxxx
https://youtube.com/shorts/xxxxx
https://instagram.com/reel/xxxxx
https://instagram.com/p/xxxxx
```

### Qo'shiq qidirish

URL bo'lmagan har qanday matn yozsangiz bot YouTube dan qidiradi:

```
ASL WAYNE
Dono Shodieva
Eski shahar
```

### Yuklab olish jarayoni

```
1. Havola yoki qo'shiq nomi yuboring
2. 🎬 Video  yoki  🎵 Audio MP3 tanlang
3. Video tanlasangiz — sifat tanlang (360p / 480p / 720p / 1080p / 4K)
4. Fayl chatga yuboriladi ✅
```

---

## 📌 Eslatmalar

- Har bir foydalanuvchi **10 soniyada bir marta** havola yuborishi mumkin
- Qidiruv natijalari **5 ta** dan sahifalab ko'rsatiladi (jami 20 ta)
- Tanlash muddati **5 daqiqa** — shundan keyin havolani qayta yuborish kerak
- Faqat **ochiq** videolar yuklanadi, maxfiy yoki login talab qiluvchi videolar yuklanmaydi
