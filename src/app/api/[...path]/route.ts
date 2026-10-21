import { randomUUID } from 'node:crypto';
import { handle, json, body, sameOrigin, ApiError } from '@/lib/http';
import {
  guest,
  guestCookie,
  clientIP,
  digest,
  limits,
  settings,
  verifyTurnstile,
  redis,
} from '@/lib/security';
import { sql } from '@/lib/db';
import { submitReport, listReports, getReport, stats, moderate } from '@/lib/reports';
import { auth, requireAdmin } from '@/lib/auth';
import { abuseInput, moderationInput, settingsInput } from '@/lib/validation';
import { publicMedia, uploadMedia } from '@/lib/media';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
async function route(request: Request) {
  return handle(async () => {
    const url = new URL(request.url);
    const parts = url.pathname.slice(5).split('/');
    const method = request.method;
    const path = parts.join('/');
    if (method !== 'GET') sameOrigin(request);
    if (parts[0] === 'auth') {
      if (!['auth/sign-in/email', 'auth/sign-out', 'auth/get-session'].includes(path))
        throw new ApiError(404, 'ไม่พบหน้า');
      if (method === 'POST')
        await limits([{ key: `auth:${digest(clientIP(request))}`, max: 10, seconds: 900 }]);
      return auth().handler(request);
    }
    if (path === 'guest' && method === 'GET') {
      const g = guest(request);
      return json({ ready: true }, 200, { 'Set-Cookie': guestCookie(g.id) });
    }
    if (path === 'health' && method === 'GET') {
      await sql()`SELECT 1`;
      await redis().ping();
      return json({ status: 'ok' });
    }
    if (path === 'stats' && method === 'GET') return json(await stats());
    if (['locations', 'reports', 'search', 'locations/nearby'].includes(path) && method === 'GET')
      return json(await listReports(url.searchParams));
    if (['locations', 'reports'].includes(path) && method === 'POST')
      return json(await submitReport(request, await body(request)), 201);
    if (['locations', 'reports'].includes(parts[0]) && parts.length === 2 && method === 'GET') {
      const r = await getReport(parts[1]);
      if (!r) throw new ApiError(404, 'ไม่พบรายงาน');
      return json(r);
    }
    if (parts[0] === 'media' && method === 'GET' && parts.length === 2)
      return publicMedia(parts[1]);
    if (path === 'media' && method === 'POST')
      return json(await uploadMedia(request, url.searchParams.get('reportId') || ''), 202);
    if (path === 'abuse-reports' && method === 'POST') {
      const input = abuseInput.parse(await body(request));
      const g = guest(request);
      if (g.fresh) throw new ApiError(400, 'กรุณาเปิดหน้านี้ใหม่');
      const ref = digest(g.id);
      await limits([
        { key: `abuse:ip:${digest(clientIP(request))}`, max: 20, seconds: 3600 },
        { key: `abuse:guest:${ref}`, max: 10, seconds: 3600 },
      ]);
      if (input.website) throw new ApiError(422, 'คำขอไม่ผ่านการตรวจสอบ');
      await verifyTurnstile(input.turnstileToken, request, 'abuse');
      if (!(await getReport(input.reportId))) throw new ApiError(404, 'ไม่พบรายงาน');
      const rows =
        await sql()`INSERT INTO abuse_reports(id,report_id,guest_reference,reason,details) VALUES (${randomUUID()},${input.reportId},${ref},${input.reason},${input.details}) ON CONFLICT(report_id,guest_reference) DO NOTHING RETURNING id`;
      // Visitor allegations alone never trigger hiding. Only a concrete identifier in the original text does.
      if (input.reason === 'privacy') {
        await sql().begin(async (tx) => {
          const [r] =
            await tx`SELECT description FROM paranormal_reports WHERE id=${input.reportId} AND status='published' FOR UPDATE`;
          if (r && /\b\d{13}\b/.test(r.description)) {
            await tx`UPDATE paranormal_reports SET status='hidden_auto',hidden_at=now(),updated_at=now() WHERE id=${input.reportId}`;
            await tx`INSERT INTO admin_audit_logs(id,report_id,action,reason) VALUES (${randomUUID()},${input.reportId},'privacy_auto_hide','Detected 13-digit personal identifier in published source')`;
          }
        });
      }
      return json({ received: true, duplicate: !rows.length }, 201);
    }
    if (parts[0] === 'admin') {
      const admin = await requireAdmin(request);
      if (parts[1] === 'media' && parts.length === 3 && method === 'GET')
        return publicMedia(parts[2], true);
      if (path === 'admin/reports' && method === 'GET')
        return json(await listReports(url.searchParams, true));
      if (path === 'admin/stats' && method === 'GET') return json(await stats(true));
      if (path === 'admin/settings' && method === 'GET') return json(await settings());
      if (path === 'admin/settings' && method === 'POST') {
        const input = settingsInput.parse(await body(request));
        await sql().begin(async (tx) => {
          await tx`INSERT INTO app_settings(key,value) VALUES ('anti_spam',${tx.json(input)}) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=now()`;
          await tx`INSERT INTO admin_audit_logs(id,administrator_id,action,reason) VALUES (${randomUUID()},${admin},'settings','Updated anti-spam configuration')`;
        });
        return json(input);
      }
      if (path === 'admin/spam-events' && method === 'GET')
        return json(
          await sql()`SELECT id,event_type,risk_score,signals,created_at FROM spam_events ORDER BY created_at DESC LIMIT 200`,
        );
      if (path === 'admin/audit' && method === 'GET')
        return json(await sql()`SELECT * FROM admin_audit_logs ORDER BY created_at DESC LIMIT 200`);
      if (path === 'admin/abuse-reports' && method === 'GET')
        return json(
          await sql()`SELECT a.*,r.title FROM abuse_reports a LEFT JOIN paranormal_reports r ON a.report_id=r.id ORDER BY a.created_at DESC LIMIT 200`,
        );
      if (parts[1] === 'abuse-reports' && parts.length === 3 && method === 'PATCH') {
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(parts[2]))
          throw new ApiError(400, 'รหัสไม่ถูกต้อง');
        await sql().begin(async (tx) => {
          const [row] =
            await tx`UPDATE abuse_reports SET status='resolved' WHERE id=${parts[2]} RETURNING report_id`;
          if (!row) throw new ApiError(404, 'ไม่พบการแจ้ง');
          await tx`INSERT INTO admin_audit_logs(id,administrator_id,report_id,action,reason) VALUES (${randomUUID()},${admin},${row.report_id},'resolve_abuse','Reviewed visitor abuse report')`;
        });
        return json({ resolved: true });
      }
      if (
        parts[1] === 'reports' &&
        parts[2] &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(parts[2])
      ) {
        if (method === 'GET' && parts.length === 3) {
          const report = await getReport(parts[2], true);
          if (!report) throw new ApiError(404, 'ไม่พบรายงาน');
          return json(report);
        }
        const data = moderationInput.parse({
          ...((await body(request)) as object),
          ...(method === 'DELETE'
            ? { action: 'delete' }
            : parts[3] === 'restore'
              ? { action: 'restore' }
              : {}),
        });
        if (!['PATCH', 'POST', 'DELETE'].includes(method))
          throw new ApiError(405, 'Method not allowed');
        return json(await moderate(parts[2], data.action, data.reason, admin));
      }
    }
    throw new ApiError(404, 'ไม่พบข้อมูล');
  });
}
export { route as GET, route as POST, route as PATCH, route as DELETE };
