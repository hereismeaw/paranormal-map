import { readFile, readdir } from 'node:fs/promises';
import { sql } from '../src/lib/db';
const client = sql();
try {
  await client.begin(async (tx) => {
    await tx`SELECT pg_advisory_xact_lock(74196012)`;
    await tx`CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`;
    for (const name of (await readdir('db/migrations')).filter((n) => n.endsWith('.sql')).sort()) {
      if ((await tx`SELECT 1 FROM schema_migrations WHERE name=${name}`).length) continue;
      await tx.unsafe(await readFile(`db/migrations/${name}`, 'utf8'));
      await tx`INSERT INTO schema_migrations(name) VALUES (${name})`;
      console.log(`Applied ${name}`);
    }
  });
} finally {
  await client.end();
}
