import postgres from 'postgres';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { hashPassword } from 'better-auth/crypto';
import Redis from 'ioredis';
export default async function setup() {
  const url = process.env.E2E_DATABASE_URL!;
  if (!url.includes('/paranormal_e2e')) throw new Error('Refusing non-E2E database');
  const connection = postgres(process.env.DATABASE_URL!);
  try {
    await connection.unsafe('CREATE DATABASE paranormal_e2e');
  } catch (e) {
    if (!(e instanceof Error) || !('code' in e) || e.code !== '42P04') throw e;
  } finally {
    await connection.end();
  }
  const result = spawnSync(process.execPath, ['--import', 'tsx', 'scripts/migrate.ts'], {
    env: { ...process.env, DATABASE_URL: url },
    stdio: 'inherit',
  });
  if (result.status !== 0) throw new Error('E2E migration failed');
  const sql = postgres(url);
  try {
    await sql`TRUNCATE paranormal_locations,paranormal_reports,submission_keys,report_media,abuse_reports,spam_events,admin_audit_logs,app_settings CASCADE`;
    await sql`DELETE FROM "user" WHERE email='browser-admin@example.com'`;
    const id = randomUUID();
    const hash = await hashPassword('browser-test-password-is-not-production');
    await sql`INSERT INTO "user"(id,name,email,"emailVerified",role) VALUES (${id},'Browser Test','browser-admin@example.com',true,'admin')`;
    await sql`INSERT INTO account(id,"accountId","providerId","userId",password) VALUES (${randomUUID()},${id},'credential',${id},${hash})`;
  } finally {
    await sql.end();
  }
  const redisUrl = new URL(process.env.REDIS_URL!);
  redisUrl.pathname = '/14';
  const redis = new Redis(redisUrl.toString());
  const keys = await redis.keys('pa:*');
  if (keys.length) await redis.del(...keys);
  await redis.quit();
}
