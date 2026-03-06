import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { config } from '../config.js';
import type { Platform, VideoHeight, VideoMetadata } from '../types/index.js';

const execFileAsync = promisify(execFile);

// Bot tomonidan qo‘llab-quvvatlanadigan video balandliklar
const SUPPORTED_HEIGHTS: VideoHeight[] = [720, 1080, 2160];

/** yt-dlp json formatidagi ma’lumotlar interfeysi */
interface YtDlpFormat {
  format_id: string;
  ext: string;
  height?: number;
  filesize?: number;
  filesize_approx?: number;
  vcodec?: string;
  acodec?: string;
  tbr?: number;
  vbr?: number;
  abr?: number;
}

interface YtDlpJson {
  title: string;
  duration: number;
  formats: YtDlpFormat[];
}

// Fayl hajmini taxminiy hisoblash (byte da)
function formatBytes(f: YtDlpFormat, duration: number): number | undefined {
  if (f.filesize) return f.filesize;
  if (f.filesize_approx) return f.filesize_approx;
  const br = f.tbr ?? f.vbr; // bit rate
  if (br && duration) return (br * 1000 / 8) * duration;
  return undefined;
}

/** Video formatini tanlash logikasi */
function pickVideoFormat(
  formats: YtDlpFormat[],
  height: VideoHeight,
): YtDlpFormat | undefined {
  // Faqat video oqimlari, audio bo‘lmaganlar
  const videoOnly = formats.filter(
    (f) => f.vcodec && f.vcodec !== 'none' && (!f.acodec || f.acodec === 'none'),
  );

  const isAvc = (f: YtDlpFormat) => f.vcodec?.startsWith('avc') ?? false;

  // 1. Exact height + H.264 (4K uchun o‘tkazib yuboriladi)
  if (height !== 2160) {
    const exact = videoOnly
      .filter((f) => f.height === height && isAvc(f))
      .sort((a, b) => (b.tbr ?? b.vbr ?? 0) - (a.tbr ?? a.vbr ?? 0))[0];
    if (exact) return exact;
  }

  // 2. Exact height + har qanday codec
  const exactAny = videoOnly
    .filter((f) => f.height === height)
    .sort((a, b) => (b.tbr ?? b.vbr ?? 0) - (a.tbr ?? a.vbr ?? 0))[0];
  if (exactAny) return exactAny;

  // 3. ≤ height + H.264 (4K uchun o‘tkazib yuboriladi)
  if (height !== 2160) {
    const below = videoOnly
      .filter((f) => f.height && f.height <= height && isAvc(f))
      .sort((a, b) => (b.height ?? 0) - (a.height ?? 0) || (b.tbr ?? b.vbr ?? 0) - (a.tbr ?? a.vbr ?? 0))[0];
    if (below) return below;
  }

  // 4. ≤ height + har qanday codec
  return videoOnly
    .filter((f) => f.height && f.height <= height)
    .sort((a, b) => (b.height ?? 0) - (a.height ?? 0) || (b.tbr ?? b.vbr ?? 0) - (a.tbr ?? a.vbr ?? 0))[0];
}

/** Audio formatini tanlash logikasi */
function pickAudioFormat(formats: YtDlpFormat[]): YtDlpFormat | undefined {
  return formats
    .filter((f) => f.acodec && f.acodec !== 'none' && (!f.vcodec || f.vcodec === 'none'))
    .sort((a, b) => {
      // Prefer m4a (yt-dlp bestaudio[ext=m4a])
      if ((a.ext === 'm4a') !== (b.ext === 'm4a')) return a.ext === 'm4a' ? -1 : 1;
      return (b.abr ?? b.tbr ?? 0) - (a.abr ?? a.tbr ?? 0);
    })[0];
}

/** Tanlangan formatlarning taxminiy hajmini MB da hisoblash */
function estimateSizeMB(
  formats: YtDlpFormat[],
  height: VideoHeight,
  duration: number,
): number | undefined {
  const video = pickVideoFormat(formats, height);
  const audio = pickAudioFormat(formats);

  const videoBytes = video ? formatBytes(video, duration) : undefined;
  const audioBytes = audio ? formatBytes(audio, duration) : undefined;

  if (!videoBytes && !audioBytes) return undefined;
  return Math.round(((videoBytes ?? 0) + (audioBytes ?? 0)) / (1024 * 1024));
}

/** URLdan video metadata olish */
export async function fetchMetadata(url: string, platform: Platform): Promise<VideoMetadata> {
  const args = ['--dump-json', '--no-playlist', url];
  if (platform === 'youtube') args.unshift('--no-warnings');

  // yt-dlp ishga tushadi va JSON chiqaradi
  const { stdout } = await execFileAsync(config.ytDlpPath, args, { timeout: 30_000 });
  const data: YtDlpJson = JSON.parse(stdout);

  const formats: YtDlpFormat[] = data.formats ?? [];
  const duration: number = data.duration ?? 0;

  // Faqat mavjud balandliklarni ko‘rsatish
  const availableHeights = SUPPORTED_HEIGHTS.filter((h) =>
    formats.some((f) => f.height && f.height >= h * 0.9),
  );

  // Agar 720p bo‘lmasa, ro‘yxat boshiga qo‘shish
  if (!availableHeights.includes(720)) availableHeights.unshift(720);

  const estimatedSizes: Partial<Record<VideoHeight, number>> = {};
  for (const h of availableHeights) {
    const size = estimateSizeMB(formats, h, duration);
    if (size !== undefined) estimatedSizes[h] = size;
  }

  return { title: data.title, platform, availableHeights, estimatedSizes };
}