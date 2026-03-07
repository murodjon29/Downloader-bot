// import { InlineKeyboard, InputFile } from 'grammy';
// import type { Context } from 'grammy';
// import type { PendingSelection, VideoHeight, VideoMetadata } from '../types/index.js';
// import { fetchMetadata } from '../services/metadata.js';
// import { downloadMedia, cleanupFile } from '../services/downloader.js';
// import { logger } from '../utils/logger.js';

// // Har bir foydalanuvchi uchun "pending" ma'lumotni saqlash: userId → oxirgi so‘rov va ma'lumot
// const pendingSelections = new Map<number, PendingSelection>();
// const PENDING_TTL = 5 * 60 * 1000; // 5 daqiqa

// export function storePending(userId: number, data: Omit<PendingSelection, 'expiresAt'>): void {
//   pendingSelections.set(userId, { ...data, expiresAt: Date.now() + PENDING_TTL });
// }

// // Agar foydalanuvchi tanlovi muddati tugagan bo'lsa, null qaytaradi
// function getPending(userId: number): PendingSelection | null {
//   const entry = pendingSelections.get(userId);
//   if (!entry) return null;

//   if (Date.now() > entry.expiresAt) {
//     pendingSelections.delete(userId);
//     return null;
//   }
//   return entry;
// }

// // Ma'lumotni tozalash
// function clearPending(userId: number): void {
//   pendingSelections.delete(userId);
// }

// // Video balandligi va hajmni ko'rsatish uchun yordamchi funksiya
// function heightLabel(height: VideoHeight, sizeMB?: number): string {
//   const label = height === 2160 ? '4K' : `${height}p`;
//   return sizeMB ? `${label} · ~${sizeMB} MB` : label;
// }

// // Foydalanuvchiga video yoki audio tanlash imkonini beruvchi tugmalar
// export function buildTypeKeyboard(): InlineKeyboard {
//   return new InlineKeyboard()
//     .text('🎬 Video', 'type:video')
//     .text('🎵 Audio MP3', 'type:audio');
// }

// // Video sifatini tanlash tugmalari
// export function buildQualityKeyboard(meta: VideoMetadata): InlineKeyboard {
//   const kb = new InlineKeyboard();
//   for (const height of meta.availableHeights) {
//     const size = meta.estimatedSizes[height];
//     kb.row().text(heightLabel(height, size), `sifat:${height}`);
//   }
//   kb.row().text('↩ Orqaga', 'type:back'); // "Back" tugmasi
//   return kb;
// }

// // Callback queryni ishlash
// export async function handleCallbackQuery(ctx: Context): Promise<void> {
//   if (!ctx.callbackQuery?.data || !ctx.from) return;
//   await ctx.answerCallbackQuery(); // tugma bosilganini bildiradi

//   const userId = ctx.from.id;
//   const data = ctx.callbackQuery.data;

//   // --- Back tugmasi ---
//   if (data === 'type:back') {
//     const pending = getPending(userId);
//     if (!pending) {
//       await ctx.editMessageText('⌛ Tanlash muddati tugagan. Iltimos, havolani qayta yuboring.');
//       return;
//     }
//     await ctx.editMessageText('⬇️ Tayyor yuklash uchun format tanlang', {
//       reply_markup: buildTypeKeyboard(),
//     });
//     return;
//   }

//   // --- Audio tanlovi ---
//   if (data === 'type:audio') {
//     const pending = getPending(userId);
//     if (!pending) {
//       await ctx.editMessageText('⌛ Tanlash muddati tugagan. Iltimos, havolani qayta yuboring.');
//       return;
//     }
//     await ctx.editMessageText('⏳ Audio yuklanmoqda...');
//     await performDownload(ctx, userId, pending, { type: 'audio', ext: 'mp3' });
//     return;
//   }

//   // --- Video tanlovi ---
//   if (data === 'type:video') {
//     const pending = getPending(userId);
//     if (!pending) {
//       await ctx.editMessageText('⌛ Tanlash muddati tugagan. Iltimos, havolani qayta yuboring.');
//       return;
//     }
//     await ctx.editMessageText('⏳ Video ma\'lumotlari olinmoqda...');

//     let meta: VideoMetadata;
//     try {
//       meta = await fetchMetadata(pending.url, pending.platform); // videoning mavjud sifatlarini olish
//     } catch (err) {
//       logger.error('Metadata fetch failed', err);
//       await ctx.editMessageText('❌ Video ma\'lumotlarini olishda xatolik yuz berdi. Iltimos, havolani tekshirib qayta yuboring.');
//       clearPending(userId);
//       return;
//     }

//     await ctx.editMessageText('🎬 Sifatni tanlang:', {
//       reply_markup: buildQualityKeyboard(meta), // foydalanuvchiga sifatlarni ko'rsatish
//     });
//     return;
//   }

//   // --- Video sifatini tanlash ---
//   if (data.startsWith('sifat:')) {
//     const pending = getPending(userId);
//     if (!pending) {
//       await ctx.editMessageText('⌛ Tanlash muddati tugagan. Iltimos, havolani qayta yuboring.');
//       return;
//     }

//     const height = parseInt(data.split(':')[1], 10) as VideoHeight;
//     if (![720, 1080, 2160].includes(height)) return;

//     await ctx.editMessageText(`⏳ ${height === 2160 ? '4K' : `${height}p`} video yuklanmoqda...`);
//     await performDownload(ctx, userId, pending, { type: 'video', height });
//     return;
//   }
// }

// // Yuklash jarayonini bajarish
// async function performDownload(
//   ctx: Context,
//   userId: number,
//   pending: PendingSelection,
//   format: { type: 'audio'; ext: 'mp3' } | { type: 'video'; height: VideoHeight },
// ): Promise<void> {
//   const resolvedFormat =
//     format.type === 'audio'
//       ? ({ type: 'audio', ext: 'mp3' } as const)
//       : ({ type: 'video', height: format.height } as const);

//   const result = await downloadMedia(pending.platform, pending.url, resolvedFormat);

//   try {
//     if (!result.success) {
//       const msg = classifyError(result.error ?? '');
//       await ctx.editMessageText(`❌ ${msg}`);
//       return;
//     }

//     if (format.type === 'audio') {
//       await ctx.replyWithAudio(new InputFile(result.filePath));
//     } else {
//       await ctx.replyWithVideo(new InputFile(result.filePath), { supports_streaming: true });
//     }

//     await ctx.editMessageText('✅ Yuklandi!');
//   } catch (err) {
//     logger.error('Send failed', err);
//     await ctx.editMessageText('❌ Yuklangan faylni yuborishda xatolik yuz berdi. Iltimos, keyinroq qayta urinib ko\'ring.');
//   } finally {
//     await cleanupFile(result.filePath);
//     clearPending(userId);
//   }
// }

// // Xatoliklarni foydalanuvchiga o‘zbek tilida tushuntirish
// function classifyError(error: string): string {
//   const e = error.toLowerCase();
//   if (e.includes('timeout') || e.includes('timed out')) {
//     return 'Yuklash juda uzoq davom etdi va vaqt tugadi. Iltimos, keyinroq qayta urinib ko\'ring.';
//   }
//   if (e.includes('private') || e.includes('login') || e.includes('auth')) {
//     return 'Bu video maxfiy yoki maxsus ruxsat talab qiladi va yuklab bo\'lmaydi.';
//   }
//   if (e.includes('not found') || e.includes('unavailable') || e.includes('removed')) {
//     return 'Bu URLda yuklanadigan video topilmadi.';
//   }
//   if (e.includes('no supported format')) {
//     return 'Tanlangan formatda video mavjud emas.';
//   }
//   return 'Yuklashda xatolik yuz berdi. Iltimos, qayta urinib ko\'ring.';
// }
import { InlineKeyboard, InputFile } from 'grammy';
import type { Context } from 'grammy';
import type { PendingSelection, VideoHeight, VideoMetadata } from '../types/index.js';
import { fetchMetadata } from '../services/metadata.js';
import { downloadMedia, cleanupFile } from '../services/downloader.js';
import { logger } from '../utils/logger.js';
import { handleSearchCallback } from './search.js';

const pendingSelections = new Map<number, PendingSelection>();
const PENDING_TTL = 5 * 60 * 1000;

export function storePending(userId: number, data: Omit<PendingSelection, 'expiresAt'>): void {
  pendingSelections.set(userId, { ...data, expiresAt: Date.now() + PENDING_TTL });
}

function getPending(userId: number): PendingSelection | null {
  const entry = pendingSelections.get(userId);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    pendingSelections.delete(userId);
    return null;
  }
  return entry;
}

function clearPending(userId: number): void {
  pendingSelections.delete(userId);
}

function heightLabel(height: VideoHeight, sizeMB?: number): string {
  const label = height === 2160 ? '4K' : `${height}p`;
  return sizeMB ? `${label} · ~${sizeMB} MB` : label;
}

export function buildTypeKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text('🎬 Video', 'type:video')
    .text('🎵 Audio', 'type:audio');
}
export function buildQualityKeyboard(meta: VideoMetadata): InlineKeyboard {
  const kb = new InlineKeyboard();
  for (const height of meta.availableHeights) {
    const size = meta.estimatedSizes[height];
    kb.row().text(heightLabel(height, size), `sifat:${height}`);
  }
  kb.row().text('↩ Orqaga', 'type:back');
  return kb;
}

export async function handleCallbackQuery(ctx: Context): Promise<void> {
  if (!ctx.callbackQuery?.data || !ctx.from) return;

  if (
    ctx.callbackQuery.data.startsWith('search_pick:') ||
    ctx.callbackQuery.data.startsWith('search_page:') ||
    ctx.callbackQuery.data === 'search_noop' ||
    ctx.callbackQuery.data === 'search_cancel'
  ) {
    await handleSearchCallback(ctx);
    return;
  }

  await ctx.answerCallbackQuery();

  const userId = ctx.from.id;
  const data = ctx.callbackQuery.data;

  if (data === 'type:back') {
    const pending = getPending(userId);
    if (!pending) {
      await ctx.editMessageText('⌛ Tanlash muddati tugagan. Iltimos, havolani qayta yuboring.');
      return;
    }
    await ctx.editMessageText('⬇️ Tayyor yuklash uchun format tanlang', {
      reply_markup: buildTypeKeyboard(),
    });
    return;
  }

  if (data === 'type:audio') {
    const pending = getPending(userId);
    if (!pending) {
      await ctx.editMessageText('⌛ Tanlash muddati tugagan. Iltimos, havolani qayta yuboring.');
      return;
    }
    await ctx.editMessageText('⏳ Audio yuklanmoqda...');
    await performDownload(ctx, userId, pending, { type: 'audio', ext: 'mp3' });
    return;
  }

  if (data === 'type:video') {
    const pending = getPending(userId);
    if (!pending) {
      await ctx.editMessageText('⌛ Tanlash muddati tugagan. Iltimos, havolani qayta yuboring.');
      return;
    }
    await ctx.editMessageText('⏳ Video ma\'lumotlari olinmoqda...');

    let meta: VideoMetadata;
    try {
      meta = await fetchMetadata(pending.url, pending.platform);
    } catch (err) {
      logger.error('Metadata fetch failed', err);
      await ctx.editMessageText('❌ Video ma\'lumotlarini olishda xatolik yuz berdi. Iltimos, havolani tekshirib qayta yuboring.');
      clearPending(userId);
      return;
    }

    await ctx.editMessageText('🎬 Sifatni tanlang:', {
      reply_markup: buildQualityKeyboard(meta),
    });
    return;
  }

  if (data.startsWith('sifat:')) {
    const pending = getPending(userId);
    if (!pending) {
      await ctx.editMessageText('⌛ Tanlash muddati tugagan. Iltimos, havolani qayta yuboring.');
      return;
    }

    const height = parseInt(data.split(':')[1], 10) as VideoHeight;
    if (![360, 480, 720, 1080, 2160].includes(height)) return;

    await ctx.editMessageText(`⏳ ${height === 2160 ? '4K' : `${height}p`} video yuklanmoqda...`);
    await performDownload(ctx, userId, pending, { type: 'video', height });
    return;
  }
}

async function performDownload(
  ctx: Context,
  userId: number,
  pending: PendingSelection,
  format: { type: 'audio'; ext: 'mp3' } | { type: 'video'; height: VideoHeight },
): Promise<void> {
  const resolvedFormat =
    format.type === 'audio'
      ? ({ type: 'audio', ext: 'mp3' } as const)
      : ({ type: 'video', height: format.height } as const);

  const result = await downloadMedia(pending.platform, pending.url, resolvedFormat);

  try {
    if (!result.success || !result.filePath) {
      const msg = classifyError(result.error ?? '');
      await ctx.editMessageText(`❌ ${msg}`);
      return;
    }

    if (format.type === 'audio') {
      await ctx.replyWithAudio(new InputFile(result.filePath));
    } else {
      await ctx.replyWithVideo(new InputFile(result.filePath), { supports_streaming: true });
    }

    await ctx.editMessageText('✅ Yuklandi!');
  } catch (err) {
    logger.error('Send failed', err);
    await ctx.editMessageText('❌ Yuklangan faylni yuborishda xatolik yuz berdi. Iltimos, keyinroq qayta urinib ko\'ring.');
  } finally {
    if (result.filePath) await cleanupFile(result.filePath);
    clearPending(userId);
  }
}

function classifyError(error: string): string {
  const e = error.toLowerCase();
  if (e.includes('timeout') || e.includes('timed out')) {
    return 'Yuklash juda uzoq davom etdi va vaqt tugadi. Iltimos, keyinroq qayta urinib ko\'ring.';
  }
  if (e.includes('private') || e.includes('login') || e.includes('auth')) {
    return 'Bu video maxfiy yoki maxsus ruxsat talab qiladi va yuklab bo\'lmaydi.';
  }
  if (e.includes('not found') || e.includes('unavailable') || e.includes('removed')) {
    return 'Bu URLda yuklanadigan video topilmadi.';
  }
  if (e.includes('no supported format')) {
    return 'Tanlangan formatda video mavjud emas.';
  }
  return 'Yuklashda xatolik yuz berdi. Iltimos, qayta urinib ko\'ring.';
}