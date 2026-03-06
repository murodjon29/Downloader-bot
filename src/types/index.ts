export type Platform = 'youtube' | 'instagram'; // Platforma turi, hozir faqat YouTube va Instagram qo‘llanadi
export type MediaType = 'video' | 'audio';      // Media turi: video yoki audio
export type VideoHeight = 720 | 1080 | 2160;    // Video balandligi (faqat bu uchta variant qo‘llanadi)

export interface DownloadFormat {
  type: 'audio';   // Audio yuklash turi
  ext: 'mp3';      // Audio fayl formati
}

export interface VideoFormat {
  type: 'video';      // Video yuklash turi
  height: VideoHeight; // Tanlangan video balandligi
}

export type FormatSelection = DownloadFormat | VideoFormat; // Audio yoki video tanlov

export interface DownloadResult {
  success: boolean;  // Yuklash muvaffaqiyatli bo‘ldi/yo‘q
  filePath: string;  // Saqlangan fayl yo‘li
  error?: string;    // Xatolik bo‘lsa xabar
}

export interface VideoMetadata {
  title: string;                       // Video sarlavhasi
  platform: Platform;                  // Platforma: youtube/instagram
  availableHeights: VideoHeight[];     // Mavjud video balandliklari
  estimatedSizes: Partial<Record<VideoHeight, number>>; // Taxminiy hajmlar MBda
}

export interface PendingSelection {
  url: string;               // Foydalanuvchi yuborgan URL
  platform: Platform;        // Platforma turi
  statusMessageId: number;   // Bot yuborgan xabar IDsi (inline keyboard uchun)
  expiresAt: number;         // Tanlovning muddati tugash vaqti (timestamp)
}

export interface ParsedUrl {
  platform: Platform;  // Aniqlangan platforma
  url: string;         // Tozalangan/final URL
}