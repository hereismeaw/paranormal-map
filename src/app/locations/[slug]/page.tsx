import { notFound } from 'next/navigation';
import { getReport } from '@/lib/reports';
import { ReportDetail } from '@/components/report-detail';
export const dynamic = 'force-dynamic';
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const r = await getReport((await params).slug);
  if (!r) return { title: 'ไม่พบเรื่องเล่า', robots: { index: false, follow: false } };
  return {
    title: r.title,
    description: r.description.slice(0, 150),
    alternates: { canonical: '/locations/' + r.id },
    openGraph: {
      title: r.title,
      description: r.description.slice(0, 150),
      type: 'article',
      publishedTime: r.published_at,
    },
  };
}
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const report = await getReport((await params).slug);
  if (!report) notFound();
  return <ReportDetail initial={JSON.parse(JSON.stringify(report))} />;
}
