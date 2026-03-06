import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { access } from 'node:fs/promises';
import { config } from '../config.js';
import { downloadYouTube } from './youtube.service.js';
import { downloadInstagram } from './instagram.service.js';
import { cleanupFile } from '../utils/file-manager.js';
import type { DownloadResult, FormatSelection, Platform } from '../types/index.js';

/**
 * Foydalanuvchi yuborgan URLni yuklash jarayoni
 * @param platform - youtube yoki instagram
 * @param url - yuklanadigan video havolasi
 * @param format - audio (mp3) yoki video (720/1080/4K)
 * @returns DownloadResult - yuklash muvaffaqiyatli yoki xato haqida ma'lumot
 */
export async function downloadMedia(
  platform: Platform,
  url: string,
  format: FormatSelection,
): Promise<DownloadResult> {
  // Har bir fayl uchun noyob nom yaratish
  const uuid = randomUUID();
  const outputPath =
    format.type === 'audio'
      ? join(config.downloadDir, uuid)          // Audio: fayl nomi faqat UUID, keyinchalik .mp3 qo‘shiladi
      : join(config.downloadDir, `${uuid}.mp4`); // Video: .mp4 qo‘shiladi

  let result: DownloadResult;

  // Platformaga qarab tegishli servis orqali yuklash
  if (platform === 'youtube') {
    result = await downloadYouTube(url, outputPath, format);
  } else {
    result = await downloadInstagram(url, outputPath, format);
  }

  // Agar yuklash muvaffaqiyatsiz bo‘lsa, xatolikni qaytarish
  if (!result.success) return result;

  // Yuklangan fayl diskda mavjudligini tekshirish
  // Audio xizmatlari aslida basePath + '.mp3' faylini yaratadi
  try {
    await access(result.filePath);
  } catch {
    return {
      success: false,
      filePath: result.filePath,
      error: 'Yuklangan fayl topilmadi. Iltimos, keyinroq qayta urinib ko‘ring.',
    };
  }

  return result;
}

// Foydalanishdan so‘ng faylni tozalash funksiyasini eksport qilish
export { cleanupFile };