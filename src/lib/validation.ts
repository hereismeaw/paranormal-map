import { z } from 'zod';
import { categoryIds } from './categories';
const forbidden = /[\p{Cc}\p{Cf}]/u;
export const nickname = z
  .string()
  .trim()
  .transform((s) => s.normalize('NFKC'))
  .pipe(
    z
      .string()
      .max(30)
      .refine((s) => !forbidden.test(s), 'ชื่อมีอักขระที่มองไม่เห็น')
      .refine(
        (s) =>
          !/(admin|administrator|moderator|system|official|ผู้ดูแล|แอดมิน|เจ้าหน้าที่)/iu.test(s),
        'ชื่อสงวนสำหรับระบบ',
      ),
  );
const text = (min: number, max: number) =>
  z
    .string()
    .trim()
    .min(min)
    .max(max)
    .refine((s) => !/[\p{Cf}\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/u.test(s));
export const reportInput = z.object({
  title: text(6, 140),
  description: text(30, 8000),
  category: z.enum(categoryIds as [string, ...string[]]),
  nickname: nickname.default(''),
  latitude: z.number().finite().min(-90).max(90),
  longitude: z.number().finite().min(-180).max(180),
  province: text(0, 100).default(''),
  district: text(0, 100).default(''),
  sensitive: z.boolean().default(true),
  locationId: z.uuid().optional(),
  occurredAt: z.iso
    .date()
    .refine((v) => v <= new Date().toISOString().slice(0, 10), 'วันที่ต้องไม่อยู่ในอนาคต')
    .optional(),
  incidentTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
    .optional(),
  witnesses: z.number().int().min(1).max(10000).optional(),
  observations: text(0, 2000).default(''),
  website: z.string().max(500).default(''),
  turnstileToken: z.string().min(1).max(2048),
  idempotencyKey: z.uuid(),
});
export const abuseInput = z.object({
  reportId: z.uuid(),
  reason: z.enum([
    'spam',
    'fake',
    'harassment',
    'privacy',
    'dangerous',
    'duplicate',
    'copyright',
    'other',
  ]),
  details: text(5, 1200),
  turnstileToken: z.string().min(1).max(2048),
  website: z.string().max(500).default(''),
});
export const moderationInput = z.object({
  action: z.enum(['hide', 'delete', 'restore']),
  reason: text(5, 1000),
});
export const settingsInput = z.object({
  reportsPerHour: z.number().int().min(1).max(100),
  reportsPerDay: z.number().int().min(1).max(500),
  guestPerHour: z.number().int().min(1).max(100),
  duplicateRadius: z.number().min(5).max(500),
  spamThreshold: z.number().int().min(20).max(100),
});
export type Submission = z.infer<typeof reportInput>;
export function analyzeText(
  input: Pick<Submission, 'title' | 'description' | 'nickname' | 'observations' | 'website'>,
) {
  const content = `${input.title}\n${input.description}\n${input.observations}`;
  const flags: string[] = [];
  let score = 0;
  if (input.website) {
    flags.push('honeypot');
    score += 100;
  }
  if (/<\/?[a-z][^>]*>|javascript\s*:|data\s*:\s*text\/html/iu.test(content)) {
    flags.push('unsafe_markup');
    score += 100;
  }
  const urls = content.match(/https?:\/\/\S+|www\.\S+/giu) || [];
  if (urls.length > 2 || urls.some((u) => /(?:bit\.ly|tinyurl\.|t\.me\/|xn--|@)/iu.test(u))) {
    flags.push('suspicious_links');
    score += 80;
  }
  if (/(.)\1{14,}/u.test(content)) {
    flags.push('repeated_characters');
    score += 70;
  }
  if (/(?:เว็บพนัน|สมัครสล็อต|รับเครดิตฟรี|buy now|casino bonus)/iu.test(content)) {
    flags.push('advertising');
    score += 90;
  }
  // Only concrete personal identifiers; fantastical experiences are never a signal.
  if (/\b\d{13}\b|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/iu.test(content)) {
    flags.push('personal_identifier');
    score += 100;
  }
  return { score, flags };
}
export function publicCoordinates(lat: number, lng: number, sensitive: boolean) {
  return sensitive
    ? { latitude: Math.round(lat * 100) / 100, longitude: Math.round(lng * 100) / 100 }
    : { latitude: lat, longitude: lng };
}
