import { isInThailand } from './thailand';
import { randomUUID } from 'node:crypto';
import { sql } from './db';
import { ApiError } from './http';
import { analyzeText, publicCoordinates, reportInput } from './validation';
import { clientIP, digest, guest, limits, settings, spamEvent, verifyTurnstile } from './security';
import type { Report } from './categories';
import { z } from 'zod';
export async function submitReport(request: Request, raw: unknown) {
  const input = reportInput.parse(raw);
  if (!isInThailand(input.latitude, input.longitude))
    throw new ApiError(400, 'ตอนนี้รับเรื่องเล่าเฉพาะพิกัดในประเทศไทย');
  const visitor = guest(request);
  if (visitor.fresh) throw new ApiError(400, 'กรุณาเปิดแบบฟอร์มใหม่เพื่อเริ่มเซสชัน');
  const reference = digest(visitor.id);
  const { turnstileToken, idempotencyKey, ...payload } = input;
  const bodyHash = digest(JSON.stringify(payload));
  const config = await settings();
  const risk = analyzeText(input);
  if (risk.score >= config.spamThreshold) {
    await limits([{ key: `reject:${digest(clientIP(request))}`, max: 15, seconds: 3600 }]);
    await spamEvent(reference, risk.score, risk.flags);
    throw new ApiError(422, 'ไม่สามารถเผยแพร่ได้ กรุณาตรวจสอบข้อความ ลิงก์ และข้อมูลส่วนบุคคล');
  }
  return sql().begin(async (tx) => {
    await tx`SELECT pg_advisory_xact_lock(hashtextextended(${reference + idempotencyKey},0))`;
    const [existing] =
      await tx`SELECT s.body_hash,r.id,r.location_id,r.status FROM submission_keys s JOIN paranormal_reports r ON r.id=s.report_id WHERE s.guest_reference=${reference} AND s.key=${idempotencyKey}`;
    if (existing) {
      if (existing.body_hash !== bodyHash)
        throw new ApiError(409, 'คำขอนี้ถูกใช้กับข้อมูลอื่นแล้ว กรุณาเริ่มใหม่');
      return {
        id: existing.id,
        locationId: existing.location_id,
        status: existing.status,
        url: `/locations/${existing.id}`,
        replay: true,
      };
    }
    await limits([
      {
        key: `report:ip:h:${digest(clientIP(request))}`,
        max: config.reportsPerHour,
        seconds: 3600,
      },
      {
        key: `report:ip:d:${digest(clientIP(request))}`,
        max: config.reportsPerDay,
        seconds: 86400,
      },
      { key: `report:guest:${reference}`, max: config.guestPerHour, seconds: 3600 },
    ]);
    await verifyTurnstile(turnstileToken, request, 'report');
    const fingerprint = digest(
      (input.title + ' ' + input.description)
        .normalize('NFKC')
        .toLocaleLowerCase()
        .replace(/\s+/g, ' '),
    );
    await tx`SELECT pg_advisory_xact_lock(hashtextextended(${fingerprint},1))`;
    const point = publicCoordinates(input.latitude, input.longitude, input.sensitive);
    const duplicates =
      await tx`SELECT r.id FROM paranormal_reports r JOIN paranormal_locations l ON l.id=r.location_id WHERE (r.fingerprint=${fingerprint} OR (similarity(r.description,${input.description})>0.92 AND similarity(r.title,${input.title})>0.8)) AND r.created_at>now()-interval '1 day' AND ST_DWithin(l.geom,ST_SetSRID(ST_MakePoint(${point.longitude},${point.latitude}),4326)::geography,${config.duplicateRadius}) LIMIT 1`;
    if (duplicates.length)
      throw new ApiError(409, 'พบรายงานที่มีข้อความและพิกัดซ้ำ กรุณาเพิ่มประสบการณ์ที่แตกต่างกัน');
    let locationId = input.locationId;
    if (locationId) {
      const locations =
        await tx`SELECT l.id FROM paranormal_locations l WHERE l.id=${locationId} AND EXISTS (SELECT 1 FROM paranormal_reports r WHERE r.location_id=l.id AND r.status='published') AND ST_DWithin(l.geom,ST_SetSRID(ST_MakePoint(${input.longitude},${input.latitude}),4326)::geography,2000)`;
      if (!locations.length) throw new ApiError(400, 'พิกัดเดิมไม่พร้อมใช้งานหรืออยู่ไกลเกินไป');
    } else {
      locationId = randomUUID();
      await tx`INSERT INTO paranormal_locations(id,slug,province,district,latitude,longitude,sensitive) VALUES (${locationId},${locationId},${input.province},${input.district},${point.latitude},${point.longitude},${input.sensitive})`;
    }
    const id = randomUUID();
    await tx`INSERT INTO paranormal_reports(id,location_id,guest_nickname,guest_reference,title,description,category,fingerprint,spam_score,spam_flags,occurred_at,incident_time,witnesses,observations,status) VALUES (${id},${locationId},${input.nickname || null},${reference},${input.title},${input.description},${input.category},${fingerprint},${risk.score},${tx.json(risk.flags)},${input.occurredAt || null},${input.incidentTime || null},${input.witnesses || null},${input.observations},'published')`;
    await tx`INSERT INTO submission_keys(guest_reference,key,body_hash,report_id) VALUES (${reference},${idempotencyKey},${bodyHash},${id})`;
    return { id, locationId, status: 'published', url: `/locations/${id}`, replay: false };
  });
}
export async function listReports(params: URLSearchParams, admin = false) {
  const client = sql();
  const page = Math.max(1, Math.min(10000, Math.floor(Number(params.get('page')) || 1)));
  const limit = Math.min(500, Math.max(1, Math.floor(Number(params.get('limit')) || 100)));
  const q = (params.get('q') || '').slice(0, 200);
  const category = params.get('category') || '';
  const province = (params.get('province') || '').slice(0, 100);
  const nickname = (params.get('nickname') || '').slice(0, 30);
  const status = params.get('status') || '';
  const since = params.get('since');
  if (since && !z.iso.date().safeParse(since).success)
    throw new ApiError(400, 'วันที่ค้นหาไม่ถูกต้อง');
  const hasDate = Boolean(since);
  const lng = Number(params.get('lng'));
  const lat = Number(params.get('lat'));
  const near =
    params.has('lat') &&
    params.has('lng') &&
    Number.isFinite(lng) &&
    Number.isFinite(lat) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180;
  const radius = Math.min(50000, Math.max(100, Number(params.get('radius')) || 10000));
  const bbox = params.get('bbox')?.split(',').map(Number);
  const validBox =
    bbox?.length === 4 &&
    bbox.every(Number.isFinite) &&
    bbox[0] >= -180 &&
    bbox[2] <= 180 &&
    bbox[1] >= -90 &&
    bbox[3] <= 90 &&
    bbox[0] <= bbox[2] &&
    bbox[1] <= bbox[3];
  const rows = await client`
    SELECT r.id,r.location_id,r.title,r.description,r.category,r.guest_nickname,r.status,r.fictional,r.published_at,r.occurred_at,r.incident_time,r.witnesses,r.observations,
      l.slug,l.latitude,l.longitude,l.province,l.district,l.sensitive,
      ${admin ? client`r.spam_score,r.spam_flags,` : client``}
      ${near ? client`ST_Distance(l.geom,ST_SetSRID(ST_MakePoint(${lng},${lat}),4326)::geography)` : client`NULL`} AS distance,
      count(*) OVER()::integer AS total
    FROM paranormal_reports r JOIN paranormal_locations l ON r.location_id=l.id
    WHERE ${admin ? client`true` : client`r.status='published'`}
    ${admin && status ? client`AND r.status::text=${status}` : client``}
    ${category ? client`AND r.category=${category}` : client``}
    ${province ? client`AND l.province ILIKE ${'%' + province + '%'}` : client``}
    ${nickname ? client`AND coalesce(r.guest_nickname,'') ILIKE ${'%' + nickname + '%'}` : client``}
    ${q ? client`AND (r.title||' '||r.description||' '||coalesce(r.guest_nickname,'')||' '||l.province||' '||l.district) ILIKE ${'%' + q.replace(/[\\%_]/g, '\\$&') + '%'}` : client``}
    ${hasDate ? client`AND r.published_at>=${since}::date` : client``}
    ${near ? client`AND ST_DWithin(l.geom,ST_SetSRID(ST_MakePoint(${lng},${lat}),4326)::geography,${radius})` : client``}
    ${validBox ? client`AND l.geom::geometry && ST_MakeEnvelope(${bbox![0]},${bbox![1]},${bbox![2]},${bbox![3]},4326)` : client``}
    ORDER BY ${near ? client`distance ASC,` : client``} r.published_at DESC,r.id
    LIMIT ${limit} OFFSET ${(page - 1) * limit}`;
  return { items: rows as unknown as Report[], total: rows[0]?.total || 0, page, limit };
}
export async function getReport(id: string, admin = false) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return null;
  const [row] =
    await sql()`SELECT r.id,r.location_id,r.title,r.description,r.category,r.guest_nickname,r.status,r.fictional,r.published_at,r.occurred_at,r.incident_time,r.witnesses,r.observations,l.slug,l.latitude,l.longitude,l.province,l.district,l.sensitive FROM paranormal_reports r JOIN paranormal_locations l ON r.location_id=l.id WHERE r.id=${id} ${admin ? sql()`` : sql()`AND r.status='published'`}`;
  if (!row) return null;
  const media =
    await sql()`SELECT id,media_type,scan_status FROM report_media WHERE report_id=${id} ${admin ? sql()`` : sql()`AND scan_status='ready'`}`;
  return { ...row, media } as unknown as Report & {
    media: { id: string; media_type: string; scan_status: string }[];
  };
}
export async function stats(admin = false) {
  const [counts] =
    await sql()`SELECT count(*) FILTER (WHERE status='published')::integer AS published,count(DISTINCT location_id) FILTER (WHERE status='published')::integer AS locations,count(*) FILTER (WHERE status='published' AND published_at>=CURRENT_DATE)::integer AS today,count(*) FILTER (WHERE status='published' AND published_at>=now()-interval '7 days')::integer AS week ${admin ? sql()`,count(*) FILTER (WHERE status='deleted')::integer AS deleted,count(*) FILTER (WHERE status IN ('hidden','hidden_auto'))::integer AS hidden` : sql()``} FROM paranormal_reports`;
  const provinces =
    await sql()`SELECT l.province,count(*)::integer AS count FROM paranormal_reports r JOIN paranormal_locations l ON l.id=r.location_id WHERE r.status='published' GROUP BY l.province ORDER BY count DESC LIMIT 77`;
  if (!admin) return { ...counts, provinces };
  const [abuse] =
    await sql()`SELECT count(*)::integer AS abuse FROM abuse_reports WHERE status='open'`;
  const [spam] = await sql()`SELECT count(*)::integer AS spam FROM spam_events`;
  return { ...counts, ...abuse, ...spam, provinces };
}
export async function moderate(
  id: string,
  action: string,
  reason: string,
  administratorId: string,
) {
  return sql().begin(async (tx) => {
    const [row] = await tx`SELECT id,status FROM paranormal_reports WHERE id=${id} FOR UPDATE`;
    if (!row) throw new ApiError(404, 'ไม่พบรายงาน');
    const status = action === 'restore' ? 'published' : action === 'hide' ? 'hidden' : 'deleted';
    await tx`UPDATE paranormal_reports SET status=${status}, hidden_at=${action === 'hide' ? new Date() : null}, deleted_at=${action === 'delete' ? new Date() : null},deleted_by=${action === 'delete' ? administratorId : null},deletion_reason=${action === 'delete' ? reason : null},updated_at=now() WHERE id=${id}`;
    await tx`INSERT INTO admin_audit_logs(id,administrator_id,report_id,action,reason) VALUES (${randomUUID()},${administratorId},${id},${action},${reason})`;
    return { id, status };
  });
}
