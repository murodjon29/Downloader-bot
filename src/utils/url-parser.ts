import type { ParsedUrl, Platform } from '../types/index.js';

// YouTube URL regex: watch, shorts va youtu.be qisqa linklar uchun
const YOUTUBE_REGEX =
  /https?:\/\/(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})[^\s]*/;

// Instagram URL regex: reel, reels va post linklari uchun
const INSTAGRAM_REGEX =
  /https?:\/\/(?:www\.)?instagram\.com\/(?:reel|reels|p)\/([A-Za-z0-9_-]+)\/?[^\s]*/;

/**
 * URL dan tracking yoki ortiqcha parametrlarni olib tashlaydi
 * @param url - foydalanuvchi yuborgan URL
 * @param platform - platforma: youtube yoki instagram
 * @returns tozalangan URL
 */
function stripTrackingParams(url: string, platform: Platform): string {
  try {
    const parsed = new URL(url);

    if (platform === 'youtube') {
      // YouTube watch linklari uchun faqat "v" parametrlari qoldiriladi
      const v = parsed.searchParams.get('v');
      const clean = new URL(parsed.origin + parsed.pathname);
      if (v) clean.searchParams.set('v', v); // faqat video ID qoldiriladi
      return clean.toString();
    }

    // Instagram uchun barcha query paramlarni olib tashlash
    return parsed.origin + parsed.pathname;
  } catch {
    // Agar URL noto‘g‘ri bo‘lsa, original URL qaytariladi
    return url;
  }
}

/**
 * Matndagi URLni aniqlaydi va platformani qaytaradi
 * @param text - foydalanuvchi xabaridagi text
 * @returns ParsedUrl yoki null
 */
export function detectPlatform(text: string): ParsedUrl | null {
  const ytMatch = text.match(YOUTUBE_REGEX);
  if (ytMatch) {
    return {
      platform: 'youtube',
      url: stripTrackingParams(ytMatch[0], 'youtube'), // YouTube URLni tozalash
    };
  }

  const igMatch = text.match(INSTAGRAM_REGEX);
  if (igMatch) {
    return {
      platform: 'instagram',
      url: stripTrackingParams(igMatch[0], 'instagram'), // Instagram URLni tozalash
    };
  }

  // Agar hech qanday moslik bo‘lmasa
  return null;
}