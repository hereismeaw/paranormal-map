import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import Redis from 'ioredis';
import { isIP } from 'node:net';
import { ApiError } from './http';
import { sql } from './db';
const singleton = globalThis as unknown as { redis?: Redis };
export function redis() {
  if (!process.env.REDIS_URL) throw new Error('REDIS_URL is required');
  return (singleton.redis ??= new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: 1,
    connectTimeout: 3000,
  }));
}
export function digest(value: string) {
  if (!process.env.BETTER_AUTH_SECRET) throw new Error('Secret not configured');
  return createHmac('sha256', process.env.BETTER_AUTH_SECRET).update(value).digest('hex');
}
export function guest(request: Request) {
  const raw = request.headers
    .get('cookie')
    ?.split(';')
    .find((c) => c.trim().startsWith('pa_guest='))
    ?.trim()
    .slice(9);
  if (raw) {
    const [id, sig] = raw.split('.');
    if (
      /^[0-9a-f-]{36}$/.test(id) &&
      sig &&
      /^[0-9a-f]{64}$/.test(sig) &&
      timingSafeEqual(Buffer.from(digest(id)), Buffer.from(sig))
    )
      return { id, fresh: false };
  }
  return { id: randomUUID(), fresh: true };
}
export function guestCookie(id: string) {
  return `pa_guest=${id}.${digest(id)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`;
}
export function clientIP(request: Request) {
  // Enable only when the origin is reachable exclusively through your trusted proxy.
  const header = process.env.TRUST_PROXY === 'true' ? process.env.TRUSTED_IP_HEADER : undefined;
  const value = header ? request.headers.get(header)?.trim() : undefined;
  return value && isIP(value) ? value : 'direct-shared-network';
}
const rateScript = `
for i,key in ipairs(KEYS) do
 local count = tonumber(redis.call('GET',key) or '0')
 if count >= tonumber(ARGV[(i-1)*2+1]) then return math.max(1,redis.call('TTL',key)) end
end
for i,key in ipairs(KEYS) do
 local count = redis.call('INCR',key)
 if count == 1 then redis.call('EXPIRE',key,ARGV[(i-1)*2+2]) end
end
return 0`;
export async function limits(rules: { key: string; max: number; seconds: number }[]) {
  const retry = Number(
    await redis().eval(
      rateScript,
      rules.length,
      ...rules.map((r) => 'pa:limit:' + r.key),
      ...rules.flatMap((r) => [r.max, r.seconds]),
    ),
  );
  if (retry > 0)
    throw new ApiError(429, 'คุณส่งรายงานถี่เกินไป กรุณาลองใหม่อีกครั้งภายหลัง', retry);
}
export const defaultSettings = {
  reportsPerHour: Number(process.env.REPORTS_PER_IP_HOUR || 3),
  reportsPerDay: Number(process.env.REPORTS_PER_IP_DAY || 10),
  guestPerHour: Number(process.env.REPORTS_PER_GUEST_HOUR || 5),
  duplicateRadius: Number(process.env.DUPLICATE_RADIUS_METERS || 50),
  spamThreshold: Number(process.env.SPAM_REJECT_SCORE || 70),
};
export async function settings() {
  const [row] = await sql()`SELECT value FROM app_settings WHERE key='anti_spam'`;
  return { ...defaultSettings, ...row?.value } as typeof defaultSettings;
}
export async function verifyTurnstile(token: string, request: Request, action: string) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) throw new ApiError(503, 'ยังไม่ได้ตั้งค่าระบบตรวจสอบความปลอดภัย');
  if (
    process.env.NODE_ENV === 'production' &&
    (secret.startsWith('1x') || secret.startsWith('2x') || secret.startsWith('3x'))
  )
    throw new ApiError(503, 'ต้องตั้งค่า Turnstile จริงก่อนเปิดใช้งาน');
  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body: new URLSearchParams({
      secret,
      response: token,
      ...(isIP(clientIP(request)) ? { remoteip: clientIP(request) } : {}),
    }),
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new ApiError(503, 'ระบบยืนยันไม่พร้อม กรุณาลองใหม่');
  const result = (await response.json()) as {
    success: boolean;
    hostname?: string;
    action?: string;
    challenge_ts?: string;
  };
  const host = process.env.TURNSTILE_HOSTNAME;
  const challengedAt = Date.parse(result.challenge_ts || '');
  if (
    !result.success ||
    (host && result.hostname !== host) ||
    (process.env.TURNSTILE_CHECK_ACTION !== 'false' && result.action !== action) ||
    !Number.isFinite(challengedAt) ||
    Date.now() - challengedAt > 300000 ||
    challengedAt > Date.now() + 30000
  )
    throw new ApiError(400, 'การยืนยันหมดอายุหรือไม่สำเร็จ กรุณายืนยันใหม่');
  // Siteverify rejects replays; this also protects against a misconfigured upstream.
  if (
    !(process.env.NODE_ENV !== 'production' && secret === '1x0000000000000000000000000000000AA') &&
    (await redis().set('pa:turnstile:' + digest(token), 'used', 'EX', 300, 'NX')) !== 'OK'
  )
    throw new ApiError(400, 'การยืนยันนี้ถูกใช้แล้ว กรุณายืนยันใหม่');
}
export async function spamEvent(reference: string, score: number, flags: string[]) {
  await sql()`INSERT INTO spam_events(id,request_reference,event_type,risk_score,signals) VALUES (${randomUUID()},${reference},'rejected_auto',${score},${sql().json(flags)})`;
}
