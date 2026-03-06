import type { Context } from 'grammy';

const WELCOME_TEXT = `
👋 *Video Yuklab Olish Botiga Xush Kelibsiz!*

Menga YouTube yoki Instagram havolasini yuboring, men uni siz uchun yuklab beraman.

*Qo'llab-quvvatlanadigan havolalar:*
• youtube.com/watch — oddiy videolar
• youtu.be — qisqa havolalar
• youtube.com/shorts — YouTube Shorts
• instagram.com/reel — Instagram Reels
• instagram.com/p — Instagram postlari

*Qanday ishlaydi:*
1. Havolani yuboring
2. 🎬 Video yoki 🎵 Audio tanlang
3. Agar video tanlasangiz — sifatni tanlang
4. Faylni chatda to'g'ridan-to'g'ri oling

*Eslatmalar:*
• Videolar to'liq ijro etiladigan fayl sifatida yuboriladi
• Audio MP3 formatida yuboriladi
• Xabar ichidagi birinchi havola ishlanadi
`.trim();

export async function handleStart(ctx: Context): Promise<void> {
  // Foydalanuvchi /start yozganda boshlang‘ich xabar yuboriladi
  await ctx.reply(WELCOME_TEXT, { parse_mode: 'Markdown' });
}