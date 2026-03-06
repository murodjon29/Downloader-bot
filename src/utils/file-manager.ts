import { mkdir, unlink, stat, readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { config } from '../config.js';
import { logger } from './logger.js';

// Yuklash papkasi mavjudligini tekshiradi, agar bo‘lmasa yaratadi
export async function ensureDownloadDir(): Promise<void> {
  await mkdir(config.downloadDir, { recursive: true });
}

// Belgilangan faylni o‘chiradi (agar mavjud bo‘lsa)
export async function cleanupFile(filePath: string): Promise<void> {
  try {
    await unlink(filePath);
  } catch {
    // Fayl allaqachon yo‘q bo‘lishi mumkin — bu xato hisoblanmaydi
  }
}

// Fayl hajmini megabaytlarda qaytaradi
export async function getFileSizeMB(filePath: string): Promise<number> {
  const { size } = await stat(filePath);
  return size / (1024 * 1024);
}

// Eskirgan yoki 1 soatdan eski fayllarni papkadan tozalaydi
export async function cleanupOldFiles(): Promise<void> {
  const ONE_HOUR = 60 * 60 * 1000; // 1 soat millisekundlarda
  try {
    const files = await readdir(config.downloadDir);
    const now = Date.now();
    for (const file of files) {
      const filePath = join(config.downloadDir, file);
      try {
        const { mtimeMs } = await stat(filePath); // Fayl oxirgi o‘zgartirilgan vaqtini oladi
        if (now - mtimeMs > ONE_HOUR) {
          await rm(filePath, { force: true }); // Eskirgan faylni majburan o‘chiradi
          logger.info('Cleaned up stale file', { file }); // Logga yozadi
        }
      } catch {
        // Faylni o‘qishda xatolik bo‘lsa, e’tiborsiz qoldiramiz
      }
    }
  } catch {
    // Papkani o‘qishda xatolik bo‘lsa, e’tiborsiz qoldiramiz
  }
}