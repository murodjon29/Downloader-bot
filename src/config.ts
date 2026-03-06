import 'dotenv/config';

function require_env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function optional_env(name: string, fallback: string): string {
  return process.env[name] ?? fallback;
}

// export const config = Object.freeze({
//   botToken: require_env('BOT_TOKEN'),
//   appId: require_env('APP_ID'),
//   appHash: require_env('APP_HASH'),
//   telegramLocalApiUrl: optional_env('TELEGRAM_LOCAL_API_URL', 'http://localhost:8081'),
//   downloadDir: optional_env('DOWNLOAD_DIR', './downloads'),
//   ytDlpPath: optional_env('YT_DLP_PATH', 'yt-dlp'),
//   ffmpegPath: optional_env('FFMPEG_PATH', 'ffmpeg'),
// });

// ...existing code...
export const config = {
  botToken: process.env.BOT_TOKEN || '',
  appId: process.env.APP_ID || '',
  appHash: process.env.APP_HASH || '',
  telegramLocalApiUrl: process.env.TELEGRAM_LOCAL_API_URL || '',
  downloadDir: process.env.DOWNLOAD_DIR || './downloads',
  ytDlpPath: process.env.YT_DLP_PATH || 'yt-dlp',
  ffmpegPath: process.env.FFMPEG_PATH || 'ffmpeg',
  logDir: process.env.LOG_DIR || './logs',
  logFile: process.env.LOG_FILE || 'bot.log',
} as const;