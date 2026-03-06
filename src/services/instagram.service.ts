import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { config } from '../config.js';
import type { DownloadResult, FormatSelection } from '../types/index.js';

const execFileAsync = promisify(execFile);

export async function downloadInstagram(
  url: string,
  outputPath: string,
  format: FormatSelection,
): Promise<DownloadResult> {

  if (format.type === 'audio') {
    const args: string[] = [
      '-f', 'bestaudio[ext=m4a]/bestaudio',
      '--extract-audio',
      '--audio-format', 'mp3',
      '--audio-quality', '0',
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
  }

  const h = format.height;
  const args: string[] = [
    '-f', `bestvideo[height<=${h}]+bestaudio/best[height<=${h}]/best`,
    '--merge-output-format', 'mp4',
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