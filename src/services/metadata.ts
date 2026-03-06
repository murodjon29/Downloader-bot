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

  if (height !== 2160) {
    const exact = videoOnly
      .filter((f) => f.height === height && isAvc(f))
      .sort((a, b) => (b.tbr ?? b.vbr ?? 0) - (a.tbr ?? a.vbr ?? 0))[0];
    if (exact) return exact;
  }

  const exactAny = videoOnly
    .filter((f) => f.height === height)
    .sort((a, b) => (b.tbr ?? b.vbr ?? 0) - (a.tbr ?? a.vbr ?? 0))[0];
  if (exactAny) return exactAny;

  if (height !== 2160) {
    const below = videoOnly
      .filter((f) => f.height && f.height <= height && isAvc(f))
      .sort((a, b) => (b.height ?? 0) - (a.height ?? 0) || (b.tbr ?? b.vbr ?? 0) - (a.tbr ?? a.vbr ?? 0))[0];
    if (below) return below;
  }

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
  const videoBytes = video ? formatBytes(video, duration) : undefined;
  const audioBytes = audio ? formatBytes(audio, duration) : undefined;
  if (!videoBytes && !audioBytes) return undefined;
  return Math.round(((videoBytes ?? 0) + (audioBytes ?? 0)) / (1024 * 1024));
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

  const availableHeights = SUPPORTED_HEIGHTS.filter((h) =>
    formats.some((f) => f.height && f.height >= h * 0.9),
  );

  if (availableHeights.length === 0) availableHeights.push(360);

  const estimatedSizes: Partial<Record<VideoHeight, number>> = {};
  for (const h of availableHeights) {
    const size = estimateSizeMB(formats, h, duration);
    if (size !== undefined) estimatedSizes[h] = size;
  }

  return { title: data.title, platform, availableHeights, estimatedSizes };
}