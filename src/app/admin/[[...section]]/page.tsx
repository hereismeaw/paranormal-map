import { headers } from 'next/headers';
import { redirect, notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/auth';
import { AdminScreen, AdminLogin } from '@/components/admin';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'ผู้ดูแลระบบ', robots: { index: false, follow: false } };
export default async function Page({ params }: { params: Promise<{ section?: string[] }> }) {
  const section = (await params).section?.[0] || 'overview';
  if (section === 'login') return <AdminLogin />;
  if (
    !['overview', 'locations', 'reports', 'spam', 'analytics', 'settings', 'audit'].includes(
      section,
    )
  )
    notFound();
  try {
    await requireAdmin(
      new Request(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000', {
        headers: await headers(),
      }),
    );
  } catch {
    redirect('/admin/login');
  }
  return <AdminScreen section={section} />;
}
