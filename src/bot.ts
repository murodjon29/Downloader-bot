import { Bot } from 'grammy';
import { config } from './config.js';
import { handleStart } from './handlers/start.js';
import { handleUrlMessage } from './handlers/url.js';
import { handleCallbackQuery } from './handlers/picker.js';
import { ensureDownloadDir, cleanupOldFiles } from './utils/file-manager.js';
import { logger } from './utils/logger.js';

// Botni yaratish, agar mahalliy Telegram API ishlatilsa, apiRoot bilan sozlanadi
const bot = new Bot(config.botToken, {
  client: {
    apiRoot: config.telegramLocalApiUrl,
  },
});

// --- Global error handler ---
// Bot ishlayotganda yuz beradigan barcha unhandled xatolarni ushlab, loglaymiz
bot.catch((err) => {
  logger.error('Unhandled bot error', { error: err.message, ctx: err.ctx?.update });
  // Foydalanuvchiga xato haqida xabar yuboramiz
  err.ctx?.reply('❌ Nomaʼlum xatolik yuz berdi. Iltimos, qayta urinib ko\'ring.').catch(() => null);
});

// --- Komandalar ---
// /start va /help komandalarini boshqaruvchi handler
bot.command(['start', 'help'], handleStart);

// --- Inline keyboard callbacks ---
// Inline tugmalar bosilganda callbackni ishlovchi handler
bot.on('callback_query:data', handleCallbackQuery);

// --- URL xabarlari ---
// Foydalanuvchi yuborgan URLni aniqlash va keyingi jarayonni boshlash
bot.on('message:text', handleUrlMessage);

// --- Startup funksiyasi ---
// Bot ishga tushishi uchun barcha kerakli sozlashlar
async function main(): Promise<void> {
  // Yuklash papkasini yaratish (agar yo‘q bo‘lsa)
  await ensureDownloadDir();

  // Eski fayllarni tozalash (masalan, 1 soatdan oshgan fayllar)
  await cleanupOldFiles();

  // Shutdown signalini tutish: SIGINT yoki SIGTERM
  const shutdown = () => {
    logger.info('Shutting down...');
    bot.stop(); // Botni to‘xtatish
    process.exit(0); // Jarayonni yakunlash
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);

  // Botni ishga tushurish
  await bot.start();
  logger.info('Bot is running');
}

// --- Asosiy ishga tushirish ---
// Agar bot ishga tushmasa, xatolikni loglaymiz va jarayonni tugatamiz
main().catch((err) => {
  logger.error('Failed to start bot', err);
  process.exit(1);
});