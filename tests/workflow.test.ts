import { beforeAll, beforeEach, afterAll, describe, it, expect, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { GET, POST, DELETE } from '../src/app/api/[...path]/route';
import { sql, closeDatabase } from '../src/lib/db';
import { redis, guestCookie, limits, clientIP, verifyTurnstile } from '../src/lib/security';
import sharp from 'sharp';
import { ensureBucket, processOneMedia, storage, bucket } from '../src/lib/media';
import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import { hashPassword } from 'better-auth/crypto';
const run = process.env.TEST_DATABASE_URL;
describe.skipIf(!run)('real PostgreSQL/PostGIS + Valkey publication workflow', () => {
  const base = 'http://localhost:3000';
  let visitor: string;
  let adminCookie: string;
  let adminId: string;
  const realFetch = globalThis.fetch;
  let verificationCalls = 0;
  const withStorage = Boolean(process.env.S3_ENDPOINT);
  if (withStorage)
    process.env.S3_BUCKET = (process.env.S3_BUCKET || 'paranormal-evidence') + '-test';
  function req(path: string, data?: unknown, cookie = visitor, method = data ? 'POST' : 'GET') {
    return new Request(base + '/api/' + path, {
      method,
      headers: { origin: base, 'content-type': 'application/json', cookie },
      ...(data ? { body: JSON.stringify(data) } : {}),
    });
  }
  function story(extra: Record<string, unknown> = {}) {
    return {
      title: 'ประสบการณ์ที่ลานเงียบ ' + randomUUID().slice(0, 8),
      description:
        'ระหว่างเดินกลับบ้าน ฉันได้ยินเสียงดนตรีจากที่ไกล ๆ แต่เมื่อหันไปมองกลับไม่เห็นใครอยู่บริเวณนั้นเลย จึงจดจำเวลาและบันทึกไว้ ' +
        randomUUID(),
      nickname: 'Meaw',
      category: 'ghost',
      latitude: 13.71234,
      longitude: 100.51234,
      sensitive: true,
      turnstileToken: 'good-' + randomUUID(),
      idempotencyKey: randomUUID(),
      ...extra,
    };
  }
  beforeAll(async () => {
    if (!run?.includes('paranormal_test')) throw new Error('Refusing non-test database');
    process.env.DATABASE_URL = run;
    process.env.NEXT_PUBLIC_APP_URL = base;
    process.env.BETTER_AUTH_URL = base;
    adminId = randomUUID();
    const password = await hashPassword('test-administrator-very-long-password');
    await sql()`DELETE FROM "user" WHERE email='test-admin@example.com'`;
    await sql()`INSERT INTO "user"(id,name,email,"emailVerified",role) VALUES (${adminId},'Test Admin','test-admin@example.com',true,'admin')`;
    await sql()`INSERT INTO account(id,"accountId","providerId","userId",password) VALUES (${randomUUID()},${adminId},'credential',${adminId},${password})`;
  });
  beforeEach(async () => {
    await sql()`TRUNCATE paranormal_locations,paranormal_reports,submission_keys,report_media,abuse_reports,spam_events,admin_audit_logs,app_settings CASCADE`;
    const keys = await redis().keys('pa:*');
    if (keys.length) await redis().del(...keys);
    visitor = guestCookie(randomUUID()).split(';')[0];
    verificationCalls = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        if (String(input) === 'https://challenges.cloudflare.com/turnstile/v0/siteverify') {
          verificationCalls++;
          const token = new URLSearchParams(init?.body as URLSearchParams).get('response') || '';
          return Response.json({
            success: !token.startsWith('invalid'),
            hostname: 'localhost',
            action: token.startsWith('abuse-')
              ? 'abuse'
              : token.startsWith('upload-')
                ? 'upload'
                : 'report',
            challenge_ts: new Date().toISOString(),
          });
        }
        return realFetch(input, init);
      }),
    );
  });
  afterAll(async () => {
    vi.unstubAllGlobals();
    await closeDatabase();
    await redis().quit();
  });
  it('publishes an anonymous report, appears immediately in map/search/detail/stats, then admin deletes/restores it', async () => {
    const response = await POST(req('reports', story()));
    expect(response.status).toBe(201);
    const created = await response.json();
    expect(created.status).toBe('published');
    expect(verificationCalls).toBe(1);
    const map = await (await GET(req('locations'))).json();
    expect(map.items.map((r: { id: string }) => r.id)).toContain(created.id);
    expect(map.items[0].latitude).toBe(13.71);
    expect(map.items[0].guest_reference).toBeUndefined();
    expect((await GET(req('reports/' + created.id))).status).toBe(200);
    expect((await (await GET(req('stats'))).json()).published).toBe(1);
    expect(
      (
        await DELETE(
          req(
            'admin/reports/' + created.id,
            { reason: 'Removing integration test report' },
            visitor,
            'DELETE',
          ),
        )
      ).status,
    ).toBe(401);
    const login = await POST(
      req('auth/sign-in/email', {
        email: 'test-admin@example.com',
        password: 'test-administrator-very-long-password',
      }),
    );
    expect(login.status).toBe(200);
    adminCookie = login.headers
      .getSetCookie()
      .map((c) => c.split(';')[0])
      .join('; ');
    expect(adminCookie).toContain('session_token');
    const deletion = await DELETE(
      req(
        'admin/reports/' + created.id,
        { reason: 'Removing integration test report' },
        adminCookie,
        'DELETE',
      ),
    );
    expect(deletion.status).toBe(200);
    expect((await (await GET(req('locations'))).json()).items).toHaveLength(0);
    expect((await (await GET(req('search?q=ประสบการณ์'))).json()).items).toHaveLength(0);
    expect((await GET(req('reports/' + created.id))).status).toBe(404);
    expect((await (await GET(req('stats'))).json()).published).toBe(0);
    const restore = await POST(
      req(
        'admin/reports/' + created.id + '/restore',
        { reason: 'Restore test report after review' },
        adminCookie,
      ),
    );
    expect(restore.status).toBe(200);
    expect((await (await GET(req('locations'))).json()).items).toHaveLength(1);
    const [count] = await sql()`SELECT count(*)::integer AS n FROM admin_audit_logs`;
    expect(count.n).toBe(2);
  });
  it('serializes concurrent idempotent submissions and detects changed payloads', async () => {
    const payload = story();
    const responses = await Promise.all(
      Array.from({ length: 4 }, () => POST(req('reports', payload))),
    );
    expect(responses.map((r) => r.status)).toEqual([201, 201, 201, 201]);
    const values = await Promise.all(responses.map((r) => r.json()));
    expect(new Set(values.map((v) => v.id)).size).toBe(1);
    expect(verificationCalls).toBe(1);
    const [count] = await sql()`SELECT count(*)::integer AS n FROM paranormal_reports`;
    expect(count.n).toBe(1);
    expect(
      (await POST(req('reports', { ...payload, title: 'คำขอเปลี่ยนข้อความไปแล้ว' }))).status,
    ).toBe(409);
  });
  it('rejects a duplicate while allowing independent witness accounts at one location', async () => {
    const input = story();
    const first = await (await POST(req('reports', input))).json();
    expect(
      (
        await POST(
          req('reports', {
            ...input,
            idempotencyKey: randomUUID(),
            turnstileToken: 'good-' + randomUUID(),
          }),
        )
      ).status,
    ).toBe(409);
    const independent = story({
      locationId: first.locationId,
      title: 'เสียงสุนัขที่ดังมาจากสวนว่าง',
      description:
        'เราไปวิ่งออกกำลังกายในช่วงเย็นและได้ยินเสียงสุนัขเห่าจากบริเวณสนามหญ้า แต่พอเดินไปถึงกลับไม่พบสัตว์อยู่ตรงนั้น มีเพียงใบไม้ปลิวตามลม',
    });
    const second = await POST(req('reports', independent));
    expect(second.status).toBe(201);
    // Deleting one report never deletes the location or another witness.
    await sql()`UPDATE paranormal_reports SET status='deleted' WHERE id=${first.id}`;
    const map = await (await GET(req('locations'))).json();
    expect(map.items).toHaveLength(1);
    expect(map.items[0].location_id).toBe(first.locationId);
  });
  it('rejects invalid Turnstile, honeypot, unsafe text and out-of-range coordinates', async () => {
    for (const [extra, status] of [
      [{ turnstileToken: 'invalid' }, 400],
      [{ website: 'spam' }, 422],
      [{ description: '<script>alert(1)</script>' + '.'.repeat(50) }, 422],
      [{ latitude: 100 }, 400],
      [{ latitude: 40.7128, longitude: -74.006 }, 400],
    ] as const)
      expect((await POST(req('reports', story(extra)))).status).toBe(status);
    const [count] = await sql()`SELECT count(*)::integer AS n FROM paranormal_reports`;
    expect(count.n).toBe(0);
    const [spam] = await sql()`SELECT count(*)::integer AS n FROM spam_events`;
    expect(spam.n).toBe(2);
  });
  it('fills Thai province and district from the geocoder and refuses points outside the country', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.startsWith('https://nominatim.openstreetmap.org/reverse')) {
          return Response.json({
            address: {
              country_code: 'th',
              state: 'จังหวัดกรุงเทพมหานคร',
              city_district: 'เขตคลองเตย',
            },
          });
        }
        return realFetch(input);
      }),
    );
    expect((await GET(req('geocode'))).status).toBe(400);
    expect((await GET(req('geocode?lat=40.71&lng=-74'))).status).toBe(400);
    const found = await GET(req('geocode?lat=13.726&lng=100.570'));
    expect(found.status).toBe(200);
    expect(await found.json()).toEqual({ province: 'กรุงเทพมหานคร', district: 'คลองเตย' });
  });
  it('enforces atomic shared limits under concurrent requests and returns Retry-After', async () => {
    const outcomes = await Promise.allSettled(
      Array.from({ length: 20 }, () => limits([{ key: 'concurrent', max: 3, seconds: 3600 }])),
    );
    expect(outcomes.filter((o) => o.status === 'fulfilled')).toHaveLength(3);
    await sql()`INSERT INTO app_settings(key,value) VALUES ('anti_spam',${sql().json({ reportsPerHour: 1 })})`;
    expect((await POST(req('reports', story()))).status).toBe(201);
    const blocked = await POST(req('reports', story({ latitude: 15 })));
    expect(blocked.status).toBe(429);
    expect(Number(blocked.headers.get('retry-after'))).toBeGreaterThan(0);
  });
  it.skipIf(!withStorage)(
    'quarantines evidence, re-encodes images in real MinIO, and revokes media on deletion',
    async () => {
      await ensureBucket();
      const created = await (await POST(req('reports', story()))).json();
      const original = await sharp({
        create: { width: 24, height: 24, channels: 3, background: '#9dffb0' },
      })
        .jpeg()
        .withMetadata({ exif: { IFD0: { Artist: 'private' } } })
        .toBuffer();
      function upload(cookie = visitor, bytes = original) {
        return POST(
          new Request(base + '/api/media?reportId=' + created.id, {
            method: 'POST',
            headers: {
              origin: base,
              cookie,
              'content-type': 'image/jpeg',
              'x-turnstile-token': 'upload-' + randomUUID(),
            },
            body: new Uint8Array(bytes),
          }),
        );
      }
      expect((await upload(guestCookie(randomUUID()).split(';')[0])).status).toBe(403);
      expect((await upload(visitor, Buffer.from('fake image'))).status).toBe(415);
      const queued = await upload();
      expect(queued.status).toBe(202);
      const file = await queued.json();
      expect((await GET(req('media/' + file.id))).status).toBe(404);
      expect(await processOneMedia()).toBe(true);
      const ready = await GET(req('media/' + file.id));
      expect(ready.status).toBe(200);
      expect(ready.headers.get('content-type')).toBe('image/webp');
      const metadata = await sharp(Buffer.from(await ready.arrayBuffer())).metadata();
      expect(metadata.exif).toBeUndefined();
      const login = await POST(
        req('auth/sign-in/email', {
          email: 'test-admin@example.com',
          password: 'test-administrator-very-long-password',
        }),
      );
      const cookie = login.headers
        .getSetCookie()
        .map((c) => c.split(';')[0])
        .join('; ');
      await sql()`UPDATE paranormal_reports SET status='deleted' WHERE id=${created.id}`;
      expect((await GET(req('admin/reports/' + created.id, undefined, cookie))).status).toBe(200);
      expect((await GET(req('admin/media/' + file.id, undefined, cookie))).status).toBe(200);
      expect((await GET(req('admin/media/' + file.id))).status).toBe(401);
      expect((await GET(req('media/' + file.id))).status).toBe(404);
      await storage().send(
        new DeleteObjectCommand({ Bucket: bucket(), Key: 'processed/' + file.id }),
      );
    },
  );
  it('rejects expired, wrong-host, wrong-action and replayed verification tokens', async () => {
    vi.stubEnv('TURNSTILE_SECRET_KEY', 'a-real-secret-shape-for-test-verification');
    const result = {
      success: true,
      hostname: 'localhost',
      action: 'report',
      challenge_ts: new Date().toISOString(),
    };
    try {
      for (const bad of [
        { ...result, hostname: 'evil.example' },
        { ...result, action: 'upload' },
        { ...result, challenge_ts: new Date(Date.now() - 360000).toISOString() },
        { ...result, challenge_ts: 'invalid' },
      ]) {
        vi.stubGlobal(
          'fetch',
          vi.fn(async () => Response.json(bad)),
        );
        await expect(verifyTurnstile(randomUUID(), req('reports'), 'report')).rejects.toMatchObject(
          { status: 400 },
        );
      }
      vi.stubGlobal(
        'fetch',
        vi.fn(async () => Response.json(result)),
      );
      const token = randomUUID();
      await verifyTurnstile(token, req('reports'), 'report');
      await expect(verifyTurnstile(token, req('reports'), 'report')).rejects.toMatchObject({
        status: 400,
      });
    } finally {
      vi.unstubAllEnvs();
    }
  });
  it('does not trust arbitrary forwarded IPs or client-supplied roles; blocks cross-origin mutations and public sign-up', async () => {
    process.env.TRUST_PROXY = 'false';
    expect(
      clientIP(
        new Request(base, {
          headers: { 'x-forwarded-for': '1.2.3.4', 'cf-connecting-ip': '1.2.3.4' },
        }),
      ),
    ).toBe('direct-shared-network');
    const r = await POST(
      new Request(base + '/api/reports', {
        method: 'POST',
        headers: { origin: 'https://evil.example', 'content-type': 'application/json' },
        body: JSON.stringify(story()),
      }),
    );
    expect(r.status).toBe(403);
    expect(
      (
        await POST(
          req('auth/sign-up/email', {
            email: 'attacker@example.com',
            password: 'longpassword123',
            role: 'admin',
          }),
        )
      ).status,
    ).toBe(404);
    expect((await GET(req('admin/reports'))).status).toBe(401);
  });
  it('receives abuse reports without hiding ordinary content, deduplicates flags, and never exposes unprocessed media', async () => {
    const created = await (await POST(req('reports', story()))).json();
    const payload = {
      reportId: created.id,
      reason: 'privacy',
      details: 'อยากให้ผู้ดูแลตรวจสอบเนื้อหานี้',
      turnstileToken: 'abuse-' + randomUUID(),
    };
    expect((await POST(req('abuse-reports', payload))).status).toBe(201);
    const duplicate = await (
      await POST(req('abuse-reports', { ...payload, turnstileToken: 'abuse-' + randomUUID() }))
    ).json();
    expect(duplicate.duplicate).toBe(true);
    expect((await GET(req('reports/' + created.id))).status).toBe(200);
    const mediaId = randomUUID();
    await sql()`INSERT INTO report_media(id,report_id,storage_key,media_type,sha256,size_bytes) VALUES (${mediaId},${created.id},'quarantine/test','image/png','hash',5)`;
    expect((await GET(req('media/' + mediaId))).status).toBe(404);
    expect((await (await GET(req('reports/' + created.id))).json()).media).toHaveLength(0);
  });
});
