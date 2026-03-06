import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { config } from '../config.js';
import type { DownloadResult, FormatSelection } from '../types/index.js';

// execFile ni Promise ko‘rinishiga o‘tkazamiz (async/await ishlatish uchun)
const execFileAsync = promisify(execFile);

/**
 * Instagram havolasidan video yoki audio yuklab olish
 * @param url - Instagram video/reel/post havolasi
 * @param outputPath - saqlanadigan fayl bazaviy yo‘li
 * @param format - audio yoki video sifati
 */
export async function downloadInstagram(
  url: string,
  outputPath: string,
  format: FormatSelection,
): Promise<DownloadResult> {

  // AUDIO YUKLASH QISMI
  if (format.type === 'audio') {

    // yt-dlp argumentlari:
    // - bestaudio → eng yaxshi audio format
    // --extract-audio → videodan audio ajratish
    // --audio-format mp3 → mp3 ga o‘tkazish
    // --audio-quality 0 → maksimal sifat
    const args: string[] = [
      '-f', 'bestaudio[ext=m4a]/bestaudio',
      '--extract-audio',
      '--audio-format', 'mp3',
      '--audio-quality', '0',
      '--output', outputPath,
      url,
    ];

    // Audio uchun haqiqiy fayl nomi .mp3 bo‘ladi
    const actualPath = `${outputPath}.mp3`;

    try {
      // yt-dlp ishga tushiriladi (5 minut timeout)
      await execFileAsync(config.ytDlpPath, args, { timeout: 300_000 });

      return {
        success: true,
        filePath: actualPath,
      };

    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);

      return {
        success: false,
        filePath: actualPath,
        error: message,
      };
    }
  }

  // VIDEO YUKLASH QISMI
  // Tanlangan maksimal balandlik (masalan 720, 1080, 2160)
  const h = format.height;

  // bestvideo + bestaudio → alohida oqimlarni birlashtirish
  // best[height<=h] → agar alohida video/audio bo‘lmasa fallback
  const args: string[] = [
    '-f', `bestvideo[height<=${h}]+bestaudio/best[height<=${h}]/best`,
    '--merge-output-format', 'mp4',
    '--postprocessor-args', 'ffmpeg:-movflags +faststart', // Telegram streaming uchun
    '--output', outputPath,
    url,
  ];

  try {
    await execFileAsync(config.ytDlpPath, args, { timeout: 300_000 });

    return {
      success: true,
      filePath: outputPath,
    };

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    return {
      success: false,
      filePath: outputPath,
      error: message,
    };
  }
}