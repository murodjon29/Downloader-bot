import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { access } from 'node:fs/promises';
import { config } from '../config.js';
import { downloadYouTube } from './youtube.service.js';
import { downloadInstagram } from './instagram.service.js';
import { cleanupFile } from '../utils/file-manager.js';
import type { DownloadResult, FormatSelection, Platform } from '../types/index.js';

export async function downloadMedia(
  platform: Platform,
  url: string,
  format: FormatSelection,
): Promise<DownloadResult> {
  const uuid = randomUUID();
  const outputPath =
    format.type === 'audio'
      ? join(config.downloadDir, uuid)
      : join(config.downloadDir, `${uuid}.mp4`);

  let result: DownloadResult;

  if (platform === 'youtube') {
    result = await downloadYouTube(url, outputPath, format);
  } else {
    result = await downloadInstagram(url, outputPath, format);
  }

  if (!result.success) return result;

  try {
    await access(result.filePath);
  } catch {
    return {
      success: false,
      filePath: result.filePath,
      error: 'Yuklangan fayl topilmadi. Iltimos, keyinroq qayta urinib ko\'ring.',
    };
  }

  return result;
}

export { cleanupFile };