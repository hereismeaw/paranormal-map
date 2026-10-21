import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema';
const globalDb = globalThis as unknown as {
  sql?: ReturnType<typeof postgres>;
  authSql?: ReturnType<typeof postgres>;
};
export function sql() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
  return (globalDb.sql ??= postgres(process.env.DATABASE_URL, {
    max: 12,
    idle_timeout: 20,
    connect_timeout: 10,
  }));
}
// Drizzle installs transparent JSON/date serializers on its postgres client.
// Keep its pool separate so PostGIS queries retain postgres-js native serializers.
export function db() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
  return drizzle((globalDb.authSql ??= postgres(process.env.DATABASE_URL, { max: 5 })), { schema });
}
export async function closeDatabase() {
  await Promise.all([globalDb.sql?.end(), globalDb.authSql?.end()]);
}
