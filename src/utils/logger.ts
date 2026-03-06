// import { appendFile } from 'node:fs/promises';
// import { join } from 'node:path';
// import { config } from '../config.js'; // config faylida logDir yoki logFile yo‘lini saqlaymiz

// type Level = 'info' | 'warn' | 'error';

// // Asosiy log funksiyasi
// async function log(level: Level, message: string, data?: unknown): Promise<void> {
//   const entry = {
//     ts: new Date().toISOString(), // Hozirgi vaqt ISO formatda
//     level,                        // Log darajasi
//     message,                      // Log xabari
//     ...(data !== undefined ? { data } : {}), // Qo‘shimcha ma’lumot bo‘lsa qo‘shiladi
//   };

//   const jsonEntry = JSON.stringify(entry);

//   // Konsolga chiqarish
//   const fn = level === 'error' ? console.error
//             : level === 'warn' ? console.warn
//             : console.log;
//   fn(jsonEntry);

//   // Faylga yozish
//   if (config.logFile) {
//     try {
//       await appendFile(join(config.logDir, config.logFile), jsonEntry + '\n', 'utf8');
//     } catch (err) {
//       // Agar faylga yozishda xatolik bo‘lsa, faqat konsolga yozish
//       console.error('Logger file write failed:', err);
//     }
//   }
// }

// // Logger obyekti, har bir daraja uchun qulay wrapper
// export const logger = {
//   info: (message: string, data?: unknown) => log('info', message, data),
//   warn: (message: string, data?: unknown) => log('warn', message, data),
//   error: (message: string, data?: unknown) => log('error', message, data),
// };

import { writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { config } from '../config.js';

type LogLevel = 'info' | 'warn' | 'error';

async function log(level: LogLevel, message: string, data?: unknown): Promise<void> {
  const entry = JSON.stringify({ ts: new Date().toISOString(), level, message, data });
  console.log(entry);

  try {
    // ✅ Papkani avval yaratish (mavjud bo'lsa xato chiqarmaydi)
    await mkdir(dirname(config.logFile), { recursive: true });
    await writeFile(config.logFile, entry + '\n', { flag: 'a' });
  } catch (err) {
    console.error('Logger file write failed:', err);
  }
}

export const logger = {
  info: (message: string, data?: unknown) => log('info', message, data),
  warn: (message: string, data?: unknown) => log('warn', message, data),
  error: (message: string, data?: unknown) => log('error', message, data),
};