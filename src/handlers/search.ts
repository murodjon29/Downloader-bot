// import type { Context } from 'grammy';
// import { InlineKeyboard } from 'grammy';
// import { execFile } from 'node:child_process';
// import { promisify } from 'node:util';
// import { config } from '../config.js';
// import { storePending } from './picker.js';
// import { logger } from '../utils/logger.js';

// const execFileAsync = promisify(execFile);

// interface SearchResult {
//   id: string;
//   title: string;
//   uploader: string;
//   duration: number; // soniyalarda
//   url: string;
// }

// // Soniyani "3:45" formatga o'tkazish
// function formatDuration(seconds: number): string {
//   const m = Math.floor(seconds / 60);
//   const s = seconds % 60;
//   return `${m}:${s.toString().padStart(2, '0')}`;
// }

// // yt-dlp orqali YouTube dan qidirish
// export async function searchYouTube(query: string, limit = 5): Promise<SearchResult[]> {
//   const args = [
//     `ytsearch${limit}:${query}`,
//     '--dump-json',
//     '--flat-playlist',
//     '--no-warnings',
//   ];

//   const { stdout } = await execFileAsync(config.ytDlpPath, args, { timeout: 30_000 });

//   // Har bir qator alohida JSON obyekt
//   return stdout
//     .trim()
//     .split('\n')
//     .filter(Boolean)
//     .map((line) => {
//       const d = JSON.parse(line);
//       return {
//         id: d.id as string,
//         title: d.title as string,
//         uploader: (d.uploader ?? d.channel ?? 'Noma\'lum') as string,
//         duration: (d.duration ?? 0) as number,
//         url: `https://www.youtube.com/watch?v=${d.id}`,
//       };
//     });
// }

// // Qidiruv natijalarini inline keyboard sifatida ko'rsatish
// export function buildSearchKeyboard(results: SearchResult[]): InlineKeyboard {
//   const kb = new InlineKeyboard();
//   results.forEach((r, i) => {
//     kb.row().text(
//       `${i + 1}. ${r.title.slice(0, 40)} · ${formatDuration(r.duration)}`,
//       `search_pick:${i}`,
//     );
//   });
//   kb.row().text('❌ Bekor qilish', 'search_cancel');
//   return kb;
// }

// // Foydalanuvchi qidiruvini saqlash (userId → natijalar)
// const pendingSearches = new Map<number, SearchResult[]>();

// export function storePendingSearch(userId: number, results: SearchResult[]): void {
//   pendingSearches.set(userId, results);
//   // 5 daqiqadan keyin avtomatik tozalash
//   setTimeout(() => pendingSearches.delete(userId), 5 * 60 * 1000);
// }

// export function getPendingSearch(userId: number): SearchResult[] | null {
//   return pendingSearches.get(userId) ?? null;
// }

// export function clearPendingSearch(userId: number): void {
//   pendingSearches.delete(userId);
// }

// // Qidiruv xabarini ishlash (user matn yuborganda)
// export async function handleSearchMessage(ctx: Context): Promise<void> {
//   const text = ctx.message?.text?.trim();
//   if (!text || !ctx.from) return;

//   const userId = ctx.from.id;

//   logger.info('Qidiruv so\'rovi', { userId, query: text });

//   const statusMsg = await ctx.reply('🔍 Qidirilmoqda...');

//   let results: SearchResult[];
//   try {
//     results = await searchYouTube(text);
//   } catch (err) {
//     logger.error('YouTube search failed', err);
//     await ctx.api.editMessageText(
//       ctx.chat!.id,
//       statusMsg.message_id,
//       '❌ Qidirishda xatolik yuz berdi. Iltimos, qayta urinib ko\'ring.',
//     );
//     return;
//   }

//   if (results.length === 0) {
//     await ctx.api.editMessageText(
//       ctx.chat!.id,
//       statusMsg.message_id,
//       '😕 Hech narsa topilmadi. Boshqa so\'z bilan qayta urinib ko\'ring.',
//     );
//     return;
//   }

//   storePendingSearch(userId, results);

//   // Natijalarni chiroyli ko'rsatish
//   const listText = results
//     .map((r, i) => `${i + 1}. *${r.title}*\n    👤 ${r.uploader} · ⏱ ${formatDuration(r.duration)}`)
//     .join('\n\n');

//   await ctx.api.editMessageText(
//     ctx.chat!.id,
//     statusMsg.message_id,
//     `🎵 *Qidiruv natijalari:*\n\n${listText}`,
//     {
//       parse_mode: 'Markdown',
//       reply_markup: buildSearchKeyboard(results),
//     },
//   );
// }

// // Foydalanuvchi qidiruv natijasidan birini tanlaganda
// export async function handleSearchCallback(ctx: Context): Promise<void> {
//   if (!ctx.callbackQuery?.data || !ctx.from) return;
//   await ctx.answerCallbackQuery();

//   const userId = ctx.from.id;
//   const data = ctx.callbackQuery.data;

//   // Bekor qilish
//   if (data === 'search_cancel') {
//     clearPendingSearch(userId);
//     await ctx.editMessageText('🚫 Qidiruv bekor qilindi.');
//     return;
//   }

//   // Natija tanlash
//   if (data.startsWith('search_pick:')) {
//     const index = parseInt(data.split(':')[1], 10);
//     const results = getPendingSearch(userId);

//     if (!results || !results[index]) {
//       await ctx.editMessageText('⌛ Qidiruv muddati tugagan. Iltimos, qayta qidiring.');
//       return;
//     }

//     const chosen = results[index];
//     clearPendingSearch(userId);

//     // Tanlangan videoni picker flow ga uzatish
//     storePending(userId, {
//       url: chosen.url,
//       platform: 'youtube',
//       statusMessageId: ctx.callbackQuery.message?.message_id ?? 0,
//     });

//     await ctx.editMessageText(
//       `✅ *${chosen.title}*\n\n⬇️ Format tanlang:`,
//       {
//         parse_mode: 'Markdown',
//         reply_markup: (await import('./picker.js')).buildTypeKeyboard(),
//       },
//     );
//   }
// }

import type { Context } from 'grammy';
import { InlineKeyboard } from 'grammy';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { config } from '../config.js';
import { storePending } from './picker.js';
import { logger } from '../utils/logger.js';

const execFileAsync = promisify(execFile);

interface SearchResult {
  id: string;
  title: string;
  uploader: string;
  duration: number;
  url: string;
}

interface PendingSearch {
  results: SearchResult[];
  query: string;
  page: number; // joriy sahifa (0 dan boshlanadi)
}

const PAGE_SIZE = 5;   // Har sahifada 5 ta natija
const TOTAL_FETCH = 20; // Jami 20 ta natija yuklanadi

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export async function searchYouTube(query: string, limit = TOTAL_FETCH): Promise<SearchResult[]> {
  const args = [
    `ytsearch${limit}:${query}`,
    '--dump-json',
    '--flat-playlist',
    '--no-warnings',
  ];

  const { stdout } = await execFileAsync(config.ytDlpPath, args, { timeout: 45_000 });

  return stdout
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const d = JSON.parse(line);
      return {
        id: d.id as string,
        title: d.title as string,
        uploader: (d.uploader ?? d.channel ?? 'Noma\'lum') as string,
        duration: (d.duration ?? 0) as number,
        url: `https://www.youtube.com/watch?v=${d.id}`,
      };
    })
    .filter((r) => r.duration > 0); // 0:00 davomiylikdagilarni olib tashlash
}

// Sahifaga mos tugmalar
export function buildSearchKeyboard(
  results: SearchResult[],
  page: number,
): InlineKeyboard {
  const kb = new InlineKeyboard();

  const start = page * PAGE_SIZE;
  const pageResults = results.slice(start, start + PAGE_SIZE);

  // Joriy sahifadagi natijalar
  pageResults.forEach((r, i) => {
    const globalIndex = start + i;
    const title = r.title.length > 35 ? r.title.slice(0, 33) + '…' : r.title;
    kb.row().text(`🎵 ${title} · ${formatDuration(r.duration)}`, `search_pick:${globalIndex}`);
  });

  // Navigatsiya tugmalari
  const hasPrev = page > 0;
  const hasNext = start + PAGE_SIZE < results.length;

  if (hasPrev || hasNext) {
    const navRow: Array<{ text: string; callback_data: string }> = [];
    if (hasPrev) navRow.push({ text: '⬅️ Oldingi', callback_data: `search_page:${page - 1}` });
    if (hasNext) navRow.push({ text: 'Keyingi ➡️', callback_data: `search_page:${page + 1}` });
    kb.row(...navRow.map((b) => InlineKeyboard.text(b.text, b.callback_data)));
  }

  // Nechta natija topilganini ko'rsatish
  const total = results.length;
  const showing = `${start + 1}–${Math.min(start + PAGE_SIZE, total)} / ${total}`;
  kb.row().text(`📊 ${showing}`, 'search_noop'); // bosilmaydi, faqat ma'lumot
  kb.row().text('❌ Bekor qilish', 'search_cancel');

  return kb;
}

// Pending search saqlash
const pendingSearches = new Map<number, PendingSearch>();

export function storePendingSearch(userId: number, data: PendingSearch): void {
  pendingSearches.set(userId, data);
  setTimeout(() => pendingSearches.delete(userId), 10 * 60 * 1000); // 10 daqiqa
}

export function getPendingSearch(userId: number): PendingSearch | null {
  return pendingSearches.get(userId) ?? null;
}

export function clearPendingSearch(userId: number): void {
  pendingSearches.delete(userId);
}

// Foydalanuvchi matn yuborganda qidirish
export async function handleSearchMessage(ctx: Context): Promise<void> {
  const text = ctx.message?.text?.trim();
  if (!text || !ctx.from) return;

  const userId = ctx.from.id;
  logger.info('Qidiruv so\'rovi', { userId, query: text });

  const statusMsg = await ctx.reply('🔍 Qidirilmoqda...');

  let results: SearchResult[];
  try {
    results = await searchYouTube(text);
  } catch (err) {
    logger.error('YouTube search failed', err);
    await ctx.api.editMessageText(
      ctx.chat!.id,
      statusMsg.message_id,
      '❌ Qidirishda xatolik yuz berdi. Iltimos, qayta urinib ko\'ring.',
    );
    return;
  }

  if (results.length === 0) {
    await ctx.api.editMessageText(
      ctx.chat!.id,
      statusMsg.message_id,
      '😕 Hech narsa topilmadi. Boshqa so\'z bilan qayta urinib ko\'ring.',
    );
    return;
  }

  storePendingSearch(userId, { results, query: text, page: 0 });

  await ctx.api.editMessageText(
    ctx.chat!.id,
    statusMsg.message_id,
    `🎵 *"${text}"* bo'yicha *${results.length} ta* natija topildi:`,
    {
      parse_mode: 'Markdown',
      reply_markup: buildSearchKeyboard(results, 0),
    },
  );
}

// Callback: sahifa almashtirish, natija tanlash, bekor qilish
export async function handleSearchCallback(ctx: Context): Promise<void> {
  if (!ctx.callbackQuery?.data || !ctx.from) return;
  await ctx.answerCallbackQuery();

  const userId = ctx.from.id;
  const data = ctx.callbackQuery.data;

  // Hech narsa qilmaydigan tugma (📊 ko'rsatkich)
  if (data === 'search_noop') return;

  // Bekor qilish
  if (data === 'search_cancel') {
    clearPendingSearch(userId);
    await ctx.editMessageText('🚫 Qidiruv bekor qilindi.');
    return;
  }

  // Sahifa almashtirish
  if (data.startsWith('search_page:')) {
    const page = parseInt(data.split(':')[1], 10);
    const pending = getPendingSearch(userId);

    if (!pending) {
      await ctx.editMessageText('⌛ Qidiruv muddati tugagan. Iltimos, qayta qidiring.');
      return;
    }

    pending.page = page;
    storePendingSearch(userId, pending);

    await ctx.editMessageText(
      `🎵 *"${pending.query}"* bo'yicha *${pending.results.length} ta* natija topildi:`,
      {
        parse_mode: 'Markdown',
        reply_markup: buildSearchKeyboard(pending.results, page),
      },
    );
    return;
  }

  // Natija tanlash
  if (data.startsWith('search_pick:')) {
    const index = parseInt(data.split(':')[1], 10);
    const pending = getPendingSearch(userId);

    if (!pending || !pending.results[index]) {
      await ctx.editMessageText('⌛ Qidiruv muddati tugagan. Iltimos, qayta qidiring.');
      return;
    }

    const chosen = pending.results[index];
    clearPendingSearch(userId);

    storePending(userId, {
      url: chosen.url,
      platform: 'youtube',
      statusMessageId: ctx.callbackQuery.message?.message_id ?? 0,
    });

    await ctx.editMessageText(
      `🎵 *${chosen.title}*\n👤 ${chosen.uploader} · ⏱ ${formatDuration(chosen.duration)}\n\n⬇️ Format tanlang:`,
      {
        parse_mode: 'Markdown',
        reply_markup: (await import('./picker.js')).buildTypeKeyboard(),
      },
    );
  }
}
