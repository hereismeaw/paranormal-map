import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import { bucket, storage } from '../src/lib/media';
import { sql } from '../src/lib/db';
const days = Math.max(7, Number(process.env.RETENTION_DAYS || 90));
try {
  await sql().begin(async (tx) => {
    const reports =
      await tx`SELECT id FROM paranormal_reports WHERE status='deleted' AND deleted_at<now()-make_interval(days=>${days}) FOR UPDATE`;
    for (const report of reports) {
      for (const file of await tx`SELECT storage_key FROM report_media WHERE report_id=${report.id}`)
        await storage().send(new DeleteObjectCommand({ Bucket: bucket(), Key: file.storage_key }));
      await tx`DELETE FROM paranormal_reports WHERE id=${report.id}`;
    }
    await tx`DELETE FROM paranormal_locations l WHERE NOT EXISTS (SELECT 1 FROM paranormal_reports r WHERE r.location_id=l.id)`;
    await tx`DELETE FROM spam_events WHERE created_at<now()-make_interval(days=>${days})`;
    await tx`DELETE FROM submission_keys WHERE created_at<now()-interval '7 days'`;
    // Audit entries deliberately have no report FK and retain only reason, action, actor and identifiers.
    console.log(`Purged ${reports.length} expired soft-deleted reports; minimal audit preserved.`);
  });
} finally {
  await sql().end();
}
