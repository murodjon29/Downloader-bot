import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { config } from '../config.js';
import type { Platform, VideoHeight, VideoMetadata } from '../types/index.js';

const execFileAsync = promisify(execFile);

const SUPPORTED_HEIGHTS: VideoHeight[] = [360, 480, 720, 1080, 2160];

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

function formatBytes(f: YtDlpFormat, duration: number): number | undefined {
  if (f.filesize) return f.filesize;
  if (f.filesize_approx) return f.filesize_approx;
  const br = f.tbr ?? f.vbr;
  if (br && duration) return (br * 1000 / 8) * duration;
  return undefined;
}

function pickVideoFormat(formats: YtDlpFormat[], height: VideoHeight): YtDlpFormat | undefined {
  const videoOnly = formats.filter(
    (f) => f.vcodec && f.vcodec !== 'none' && (!f.acodec || f.acodec === 'none'),
  );

  const isAvc = (f: YtDlpFormat) => f.vcodec?.startsWith('avc') ?? false;

  // 4K uchun alohida logika — AVC codec ko'pincha yo'q, shuning uchun har qanday codec
  if (height === 2160) {
    // 1. Aynan 2160p — har qanday codec, eng yuqori bitrate
    const exact4k = videoOnly
      .filter((f) => f.height === 2160)
      .sort((a, b) => (b.tbr ?? b.vbr ?? 0) - (a.tbr ?? a.vbr ?? 0))[0];
    if (exact4k) return exact4k;

    // 2. 1440p — fallback
    const hd = videoOnly
      .filter((f) => f.height && f.height >= 1440)
      .sort((a, b) => (b.height ?? 0) - (a.height ?? 0) || (b.tbr ?? b.vbr ?? 0) - (a.tbr ?? a.vbr ?? 0))[0];
    if (hd) return hd;

    // 3. Eng yuqori mavjud sifat
    return videoOnly
      .sort((a, b) => (b.height ?? 0) - (a.height ?? 0))[0];
  }

  // Boshqa sifatlar uchun avvalgi logika
  // 1. Exact height + H.264
  const exact = videoOnly
    .filter((f) => f.height === height && isAvc(f))
    .sort((a, b) => (b.tbr ?? b.vbr ?? 0) - (a.tbr ?? a.vbr ?? 0))[0];
  if (exact) return exact;

  // 2. Exact height + har qanday codec
  const exactAny = videoOnly
    .filter((f) => f.height === height)
    .sort((a, b) => (b.tbr ?? b.vbr ?? 0) - (a.tbr ?? a.vbr ?? 0))[0];
  if (exactAny) return exactAny;

  // 3. <= height + H.264
  const below = videoOnly
    .filter((f) => f.height && f.height <= height && isAvc(f))
    .sort((a, b) => (b.height ?? 0) - (a.height ?? 0) || (b.tbr ?? b.vbr ?? 0) - (a.tbr ?? a.vbr ?? 0))[0];
  if (below) return below;

  // 4. <= height + har qanday codec
  return videoOnly
    .filter((f) => f.height && f.height <= height)
    .sort((a, b) => (b.height ?? 0) - (a.height ?? 0) || (b.tbr ?? b.vbr ?? 0) - (a.tbr ?? a.vbr ?? 0))[0];
}

function pickAudioFormat(formats: YtDlpFormat[]): YtDlpFormat | undefined {
  return formats
    .filter((f) => f.acodec && f.acodec !== 'none' && (!f.vcodec || f.vcodec === 'none'))
    .sort((a, b) => {
      if ((a.ext === 'm4a') !== (b.ext === 'm4a')) return a.ext === 'm4a' ? -1 : 1;
      return (b.abr ?? b.tbr ?? 0) - (a.abr ?? a.tbr ?? 0);
    })[0];
}

function estimateSizeMB(
  formats: YtDlpFormat[],
  height: VideoHeight,
  duration: number,
): number | undefined {
  const video = pickVideoFormat(formats, height);
  const audio = pickAudioFormat(formats);

  // Debug: agar video topilmasa undefined qaytarmasin
  const videoBytes = video ? formatBytes(video, duration) : undefined;
  const audioBytes = audio ? formatBytes(audio, duration) : undefined;

  if (!videoBytes && !audioBytes) return undefined;

  const total = (videoBytes ?? 0) + (audioBytes ?? 0);
  const mb = Math.round(total / (1024 * 1024));

  // ✅ 0 MB ko'rsatmaydi — undefined qaytaradi
  return mb > 0 ? mb : undefined;
}

export async function fetchMetadata(url: string, platform: Platform): Promise<VideoMetadata> {
  const args = [
    '--dump-json',
    '--no-playlist',
    '--skip-download',
    '--no-warnings',
    url,
  ];

  const { stdout } = await execFileAsync(config.ytDlpPath, args, { timeout: 20_000 });
  const data: YtDlpJson = JSON.parse(stdout);

  const formats: YtDlpFormat[] = data.formats ?? [];
  const duration: number = data.duration ?? 0;

  // Mavjud balandliklarni aniqlash
  const availableHeights = SUPPORTED_HEIGHTS.filter((h) => {
    if (h === 2160) {
      // 4K uchun: aynan 2160p yoki 1440p+ mavjudligini tekshirish
      return formats.some(
        (f) =>
          f.vcodec && f.vcodec !== 'none' &&
          f.height && f.height >= 1440,
      );
    }
    // Boshqalar uchun: ±10% tolerance
    return formats.some(
      (f) =>
        f.vcodec && f.vcodec !== 'none' &&
        f.height && f.height >= h * 0.9,
    );
  });

  if (availableHeights.length === 0) availableHeights.push(360);

  const estimatedSizes: Partial<Record<VideoHeight, number>> = {};
  for (const h of availableHeights) {
    const size = estimateSizeMB(formats, h, duration);
    if (size !== undefined) estimatedSizes[h] = size;
  }

  return { title: data.title, platform, availableHeights, estimatedSizes };
}