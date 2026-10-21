import postgres from 'postgres';
import { spawnSync } from 'node:child_process';
// The test database and Redis namespace are separate from application data.
const source = process.env.DATABASE_URL;
if (!source) throw new Error('DATABASE_URL required');
const url = new URL(source);
const original = url.pathname.slice(1);
url.pathname = '/paranormal_test';
if (original === 'paranormal_test')
  throw new Error('Run from application connection URL, not test URL');
const admin = postgres(source, { max: 1 });
try {
  await admin.unsafe('CREATE DATABASE paranormal_test');
} catch (e) {
  if (!(e instanceof Error) || !('code' in e) || e.code !== '42P04') throw e;
} finally {
  await admin.end();
}
const redis = new URL(process.env.REDIS_URL || 'redis://127.0.0.1:6379');
redis.pathname = '/15';
const env: NodeJS.ProcessEnv = {
  ...process.env,
  DATABASE_URL: url.toString(),
  TEST_DATABASE_URL: url.toString(),
  REDIS_URL: redis.toString(),
  NODE_ENV: 'test',
  TURNSTILE_CHECK_ACTION: 'true',
  TURNSTILE_HOSTNAME: 'localhost',
};
for (const args of [
  ['--import', 'tsx', 'scripts/migrate.ts'],
  ['node_modules/vitest/vitest.mjs', 'run'],
]) {
  const result = spawnSync(process.execPath, args, { env, stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
