import type { Context } from 'grammy';
import { detectPlatform } from '../utils/url-parser.js';
import { buildTypeKeyboard, storePending } from './picker.js';
import { logger } from '../utils/logger.js';
import { handleSearchMessage } from './search.js';

// Foydalanuvchi uchun "cooldown": userId → oxirgi so‘rov vaqti
const cooldowns = new Map<number, number>();
const COOLDOWN_MS = 10_000; // 10 soniya

// export async function handleUrlMessage(ctx: Context): Promise<void> {
//   const text = ctx.message?.text;
//   if (!text || !ctx.from) return; // agar matn yoki foydalanuvchi yo‘q bo‘lsa, hech narsa qilmaymiz

//   // URLni aniqlash va platformani tekshirish
//   const parsed = detectPlatform(text);
//   if (!parsed) return; // Qo‘llab-quvvatlanmaydigan URL bo‘lsa, hech narsa qilmaymiz
export async function handleUrlMessage(ctx: Context): Promise<void> {
  const text = ctx.message?.text;
  if (!text || !ctx.from) return;

  const parsed = detectPlatform(text);
  if (!parsed) {
    // URL emas → qidiruv sifatida ishlov berish
    await handleSearchMessage(ctx);
    return;
  }

  const userId = ctx.from.id;
  const now = Date.now();
  const last = cooldowns.get(userId) ?? 0;

  // Cooldown tekshiruvi: agar foydalanuvchi 10 soniya ichida yana URL yuborsa
  if (now - last < COOLDOWN_MS) {
    const remaining = Math.ceil((COOLDOWN_MS - (now - last)) / 1000);
    await ctx.reply(`⏳ Iltimos, yana havola yuborishdan oldin ${remaining} soniya kuting.`);
    return;
  }

  // Oxirgi so‘rov vaqtini yangilash
  cooldowns.set(userId, now);

  // Logga yozish
  logger.info('Havola qabul qilindi', { userId, platform: parsed.platform, url: parsed.url });

  // Foydalanuvchiga format tanlash tugmalarini ko‘rsatish
  const statusMsg = await ctx.reply('⬇️ Yuklashga tayyor', {
    reply_markup: buildTypeKeyboard(),
  });

  // Pending ma’lumotini saqlash, keyinchalik foydalanuvchi tanlovini ishlatish uchun
  storePending(userId, {
    url: parsed.url,
    platform: parsed.platform,
    statusMessageId: statusMsg.message_id,
  });
}