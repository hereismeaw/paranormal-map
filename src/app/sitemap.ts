import type { MetadataRoute } from 'next';
import { sql } from '@/lib/db';
export const dynamic = 'force-dynamic';
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const rows =
    await sql()`SELECT id,updated_at FROM paranormal_reports WHERE status='published' ORDER BY published_at DESC LIMIT 45000`;
  return [
    { url: base + '/' },
    { url: base + '/explore' },
    ...rows.map((r) => ({ url: base + '/locations/' + r.id, lastModified: r.updated_at })),
  ];
}
