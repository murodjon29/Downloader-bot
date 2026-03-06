import { execFile } from 'node:child_process';
import { rename } from 'node:fs/promises';
import { promisify } from 'node:util';
import { config } from '../config.js';
import type { DownloadResult, FormatSelection } from '../types/index.js';

const execFileAsync = promisify(execFile);

/**
 * Video formatini tanlash stringini yaratish
 * Bu yt-dlp ning format filteriga mos keladi:
 * 1. H.264 codec bilan aniq balandlik + m4a audio
 * 2. H.264 codec bilan aniq balandlik + har qanday audio
 * 3. ≤ balandlik + H.264 + m4a
 * 4. ≤ balandlik + m4a
 * 5. ≤ balandlik + har qanday audio/video
 * 6. fallback: best[height<=H]
 */
function videoFormatString(h: number): string {
  return [
    `bestvideo[height=${h}][vcodec^=avc]+bestaudio[ext=m4a]`,
    `bestvideo[height=${h}][vcodec^=avc]+bestaudio`,
    `bestvideo[height<=${h}][vcodec^=avc]+bestaudio[ext=m4a]`,
    `bestvideo[height<=${h}]+bestaudio[ext=m4a]`,
    `bestvideo[height<=${h}]+bestaudio`,
    `best[height<=${h}]`,
  ].join('/');
}

/**
 * Video faylini Telegramda streaming qilish uchun faststart qo‘llash
 * - movflags +faststart
 * - Faylni vaqtincha nom bilan yaratib, so‘ng asl faylga rename qiladi
 */
async function applyFaststart(filePath: string): Promise<void> {
  const tmpPath = `${filePath}.faststart.mp4`;
  await execFileAsync(config.ffmpegPath, [
    '-i', filePath,
    '-c', 'copy',
    '-movflags', '+faststart',
    '-y',
    tmpPath,
  ], { timeout: 120_000 });
  await rename(tmpPath, filePath);
}

/**
 * YouTube videolarini yoki audio fayllarini yuklab olish
 * @param url - YouTube havolasi
 * @param outputPath - saqlanadigan fayl yo‘li
 * @param format - audio yoki video va video balandligi
 */
export async function downloadYouTube(
  url: string,
  outputPath: string,
  format: FormatSelection,
): Promise<DownloadResult> {
  if (format.type === 'audio') {
    // Audio uchun yt-dlp argumentlari
    const args = [
      '-f', 'bestaudio[ext=m4a]/bestaudio', // eng yaxshi audio
      '--extract-audio',                     // videodan audio ajratish
      '--audio-format', 'mp3',               // mp3 formatga o‘tkazish
      '--audio-quality', '0',                // maksimal sifat
      '--no-playlist',                       // playlist bo‘lsa ham faqat bitta video
      '--output', outputPath,
      url,
    ];

    const actualPath = `${outputPath}.mp3`;

    try {
      await execFileAsync(config.ytDlpPath, args, { timeout: 300_000 });
      return { success: true, filePath: actualPath };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, filePath: actualPath, error: message };
    }
  } else {
    // Video uchun yt-dlp argumentlari
    const args = [
      '-f', videoFormatString(format.height),
      '--merge-output-format', 'mp4',
      '--no-playlist',
      '--output', outputPath,
      url,
    ];

    try {
      // Video yuklanadi
      await execFileAsync(config.ytDlpPath, args, { timeout: 300_000 });

      // Telegramda streaming uchun faststart qo‘llash
      await applyFaststart(outputPath);

      return { success: true, filePath: outputPath };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, filePath: outputPath, error: message };
    }
  }
}