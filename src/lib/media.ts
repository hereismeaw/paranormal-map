import { randomUUID, createHash } from 'node:crypto';
import { createConnection } from 'node:net';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  CreateBucketCommand,
} from '@aws-sdk/client-s3';
import { fileTypeFromBuffer } from 'file-type';
import sharp from 'sharp';
import { sql } from './db';
import { ApiError } from './http';
import { digest, guest, clientIP, limits, verifyTurnstile } from './security';
class UnsafeMedia extends Error {}
export const allowedMedia = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'audio/mpeg',
  'audio/wav',
  'audio/x-wav',
  'audio/ogg',
  'video/mp4',
  'video/webm',
]);
export function storage() {
  return new S3Client({
    endpoint: process.env.S3_ENDPOINT,
    region: process.env.S3_REGION || 'auto',
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID!,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
    },
  });
}
export function bucket() {
  if (!process.env.S3_BUCKET) throw new Error('S3_BUCKET required');
  return process.env.S3_BUCKET;
}
export async function ensureBucket() {
  try {
    await storage().send(new CreateBucketCommand({ Bucket: bucket() }));
  } catch (e) {
    if (
      !(e instanceof Error) ||
      !['BucketAlreadyOwnedByYou', 'BucketAlreadyExists'].includes(e.name)
    )
      throw e;
  }
}
export async function readUpload(request: Request, max: number) {
  if (Number(request.headers.get('content-length')) > max)
    throw new ApiError(413, 'ไฟล์ใหญ่เกินกำหนด');
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError(400, 'ไม่มีไฟล์');
  let size = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > max) {
      await reader.cancel();
      throw new ApiError(413, 'ไฟล์ใหญ่เกินกำหนด');
    }
    chunks.push(value);
  }
  if (!size) throw new ApiError(400, 'ไฟล์ว่าง');
  return Buffer.concat(chunks);
}
export async function uploadMedia(request: Request, reportId: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(reportId))
    throw new ApiError(400, 'รหัสรายงานไม่ถูกต้อง');
  const visitor = guest(request);
  if (visitor.fresh) throw new ApiError(403, 'ไม่พบเซสชันผู้ส่ง');
  const ref = digest(visitor.id);
  const [report] =
    await sql()`SELECT id FROM paranormal_reports WHERE id=${reportId} AND guest_reference=${ref} AND status='published' AND created_at>now()-interval '1 hour'`;
  if (!report) throw new ApiError(403, 'แนบไฟล์ได้เฉพาะรายงานที่คุณเพิ่งส่ง');
  await limits([
    {
      key: `upload:ip:${digest(clientIP(request))}`,
      max: Number(process.env.UPLOADS_PER_HOUR || 12),
      seconds: 3600,
    },
    { key: `upload:guest:${ref}`, max: 12, seconds: 3600 },
  ]);
  await verifyTurnstile(request.headers.get('x-turnstile-token') || '', request, 'upload');
  const bytes = await readUpload(request, Number(process.env.MAX_UPLOAD_BYTES || 20971520));
  const detected = await fileTypeFromBuffer(bytes);
  if (!detected || !allowedMedia.has(detected.mime))
    throw new ApiError(415, 'รองรับ JPEG, PNG, WebP, MP3, WAV, OGG, MP4 และ WebM เท่านั้น');
  const hash = createHash('sha256').update(bytes).digest('hex');
  const id = randomUUID();
  const key = `quarantine/${id}`;
  await storage().send(
    new PutObjectCommand({
      Bucket: bucket(),
      Key: key,
      Body: bytes,
      ContentType: 'application/octet-stream',
    }),
  );
  try {
    await sql().begin(async (tx) => {
      await tx`SELECT id FROM paranormal_reports WHERE id=${reportId} FOR UPDATE`;
      const [n] =
        await tx`SELECT count(*)::integer AS n FROM report_media WHERE report_id=${reportId}`;
      if (n.n >= 6) throw new ApiError(400, 'แนบไฟล์ได้ไม่เกิน 6 ไฟล์ต่อรายงาน');
      await tx`INSERT INTO report_media(id,report_id,storage_key,media_type,sha256,size_bytes) VALUES (${id},${reportId},${key},${detected.mime},${hash},${bytes.length})`;
    });
  } catch (e) {
    await storage().send(new DeleteObjectCommand({ Bucket: bucket(), Key: key }));
    throw e;
  }
  return { id, status: 'queued' };
}
export async function publicMedia(id: string, admin = false) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))
    throw new ApiError(404, 'ไม่พบไฟล์');
  const [row] =
    await sql()`SELECT m.storage_key,m.media_type FROM report_media m JOIN paranormal_reports r ON r.id=m.report_id WHERE m.id=${id} AND m.scan_status='ready' ${admin ? sql()`` : sql()`AND r.status='published'`}`;
  if (!row) throw new ApiError(404, 'ไม่พบไฟล์');
  const result = await storage().send(
    new GetObjectCommand({ Bucket: bucket(), Key: row.storage_key }),
  );
  const bytes = await result.Body!.transformToByteArray();
  return new Response(new Uint8Array(bytes), {
    headers: {
      'Content-Type': row.media_type,
      'Content-Disposition': 'inline',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
export async function scanMalware(bytes: Buffer) {
  if (!process.env.CLAMAV_HOST) throw new Error('Malware scanner unavailable');
  await new Promise<void>((resolve, reject) => {
    const socket = createConnection({
      host: process.env.CLAMAV_HOST!,
      port: Number(process.env.CLAMAV_PORT || 3310),
    });
    let response = '';
    socket.setTimeout(30000, () => socket.destroy(new Error('Scanner timeout')));
    socket.on('error', reject);
    socket.on('data', (chunk) => (response += chunk.toString()));
    socket.on('end', () => {
      if (response.trim().replace(/\0/g, '') === 'stream: OK') resolve();
      else if (response.includes(' FOUND')) reject(new UnsafeMedia('Malware detected'));
      else reject(new Error('Scanner did not complete successfully'));
    });
    socket.on('connect', () => {
      socket.write(Buffer.from('zINSTREAM\0'));
      for (let i = 0; i < bytes.length; i += 65536) {
        const chunk = bytes.subarray(i, i + 65536);
        const length = Buffer.alloc(4);
        length.writeUInt32BE(chunk.length);
        socket.write(length);
        socket.write(chunk);
      }
      socket.write(Buffer.alloc(4));
    });
  });
}
export async function sanitizeImage(bytes: Buffer) {
  return sharp(bytes, { limitInputPixels: 24000000, animated: false })
    .rotate()
    .resize({ width: 2400, height: 2400, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 85 })
    .toBuffer();
}
export async function processOneMedia() {
  // A transaction lock prevents two workers from processing the same object.
  return sql().begin(async (tx) => {
    const [row] =
      await tx`SELECT * FROM report_media WHERE scan_status='queued' ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1`;
    if (!row) return false;
    try {
      const object = await storage().send(
        new GetObjectCommand({ Bucket: bucket(), Key: row.storage_key }),
      );
      const original = Buffer.from(await object.Body!.transformToByteArray());
      let processed: Buffer;
      let mime = row.media_type;
      if (mime.startsWith('image/')) {
        try {
          processed = await sanitizeImage(original);
        } catch {
          throw new UnsafeMedia('Image cannot be safely decoded');
        }
        mime = 'image/webp';
      } else {
        await scanMalware(original);
        processed = original;
      }
      const cleanKey = `processed/${row.id}`;
      await storage().send(
        new PutObjectCommand({
          Bucket: bucket(),
          Key: cleanKey,
          Body: processed,
          ContentType: mime,
        }),
      );
      await tx`UPDATE report_media SET storage_key=${cleanKey},media_type=${mime},scan_status='ready',processed_at=now() WHERE id=${row.id}`;
      await storage().send(new DeleteObjectCommand({ Bucket: bucket(), Key: row.storage_key }));
    } catch (error) {
      // Storage/network/scanner outages must retry, never discard user evidence.
      if (!(error instanceof UnsafeMedia)) throw error;
      await tx`UPDATE report_media SET scan_status='rejected',failure_reason='security_processing_failed',processed_at=now() WHERE id=${row.id}`;
      await storage().send(new DeleteObjectCommand({ Bucket: bucket(), Key: row.storage_key }));
    }
    return true;
  });
}
