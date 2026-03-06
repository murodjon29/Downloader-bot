import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { config } from '../config.js';
import type { DownloadResult, FormatSelection } from '../types/index.js';

const execFileAsync = promisify(execFile);

function videoFormatString(h: number): string {
  return [
    `bestvideo[height=${h}][vcodec^=avc][ext=mp4]+bestaudio[ext=m4a]`,
    `bestvideo[height=${h}][vcodec^=avc]+bestaudio[ext=m4a]`,
    `bestvideo[height<=${h}][vcodec^=avc]+bestaudio[ext=m4a]`,
    `bestvideo[height<=${h}]+bestaudio[ext=m4a]`,
    `bestvideo[height<=${h}]+bestaudio`,
    `best[height<=${h}]`,
  ].join('/');
}

export async function downloadYouTube(
  url: string,
  outputPath: string,
  format: FormatSelection,
): Promise<DownloadResult> {

  if (format.type === 'audio') {
    const args = [
      '-f', 'bestaudio[ext=m4a]/bestaudio',
      '--extract-audio',
      '--audio-format', 'mp3',
      '--audio-quality', '0',
      '--no-playlist',
      '--concurrent-fragments', '4',
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
    const args = [
      '-f', videoFormatString(format.height),
      '--merge-output-format', 'mp4',
      '--no-playlist',
      '--concurrent-fragments', '4',
      '--postprocessor-args', 'ffmpeg:-movflags +faststart -c copy',
      '--output', outputPath,
      url,
    ];

    try {
      await execFileAsync(config.ytDlpPath, args, { timeout: 300_000 });
      return { success: true, filePath: outputPath };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, filePath: outputPath, error: message };
    }
  }
}