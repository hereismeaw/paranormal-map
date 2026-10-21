import { describe, it, expect } from 'vitest';
import { nickname, analyzeText, publicCoordinates, reportInput } from '../src/lib/validation';
import { sanitizeImage, allowedMedia } from '../src/lib/media';
import sharp from 'sharp';
const story = {
  title: 'เงาปริศนาที่ปลายถนน',
  description:
    'เมื่อคืนเห็นเงาสีขาวเดินผ่านริมทางแล้วหายไปหลังต้นไม้ ทั้งที่ไม่มีทางเดินต่อไป จึงอยากบันทึกประสบการณ์นี้ไว้',
  nickname: 'Meaw',
  observations: '',
  website: '',
};
describe('anonymous submission validation', () => {
  it('accepts Thai, English, normalized Unicode and an empty optional nickname', () => {
    expect(nickname.parse('Meaw นักล่าผี 99')).toBe('Meaw นักล่าผี 99');
    expect(nickname.parse('')).toBe('');
    expect(nickname.parse('Ｍｅａｗ')).toBe('Meaw');
  });
  it('rejects impersonation, invisible controls and oversized nicknames', () => {
    for (const n of [
      'ＡＤＭＩＮ',
      'moderator',
      'ผู้ดูแลระบบ',
      'M\u200beaw',
      'a'.repeat(31),
      'bad\u0000',
    ])
      expect(nickname.safeParse(n).success).toBe(false);
  });
  it('does not score implausible paranormal descriptions as spam', () =>
    expect(analyzeText(story)).toEqual({ score: 0, flags: [] }));
  it('detects honeypots, executable markup, advertising and concrete identifiers', () => {
    for (const change of [
      { website: 'spam' },
      { description: '<script>alert(1)</script>' },
      { description: 'สมัครสล็อต รับเครดิตฟรี' },
      { description: 'ข้อมูลเลขบัตร 1234567890123' },
    ])
      expect(analyzeText({ ...story, ...change }).score).toBeGreaterThanOrEqual(70);
  });
  it('rejects invalid coordinates and future incident dates', () => {
    const data = {
      ...story,
      category: 'ghost',
      latitude: 13.7,
      longitude: 100.5,
      turnstileToken: 'token',
      idempotencyKey: crypto.randomUUID(),
    };
    expect(reportInput.safeParse(data).success).toBe(true);
    for (const change of [
      { latitude: 91 },
      { longitude: 181 },
      { latitude: NaN },
      { occurredAt: '2999-01-01' },
      { description: 'สั้น' },
    ])
      expect(reportInput.safeParse({ ...data, ...change }).success).toBe(false);
  });
  it('discards exact sensitive coordinates before storage', () => {
    expect(publicCoordinates(13.712345, 100.512345, true)).toEqual({
      latitude: 13.71,
      longitude: 100.51,
    });
    expect(publicCoordinates(13.712345, 100.512345, false).latitude).toBe(13.712345);
  });
});
describe('image processing', () => {
  it('re-encodes images and removes metadata', async () => {
    const original = await sharp({
      create: { width: 30, height: 30, channels: 3, background: '#9dffb0' },
    })
      .jpeg()
      .withMetadata({ exif: { IFD0: { Artist: 'private identity' } } })
      .toBuffer();
    const clean = await sanitizeImage(original);
    const meta = await sharp(clean).metadata();
    expect(meta.format).toBe('webp');
    expect(meta.exif).toBeUndefined();
  });
  it('refuses non-images and active media types', async () => {
    await expect(sanitizeImage(Buffer.from('<script>malware</script>'))).rejects.toThrow();
    expect(allowedMedia.has('image/svg+xml')).toBe(false);
    expect(allowedMedia.has('text/html')).toBe(false);
  });
});
