import type { Metadata } from 'next';
import { Providers } from '@/components/providers';
import { Nav } from '@/components/nav';
import 'maplibre-gl/dist/maplibre-gl.css';
import './globals.css';
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  title: {
    default: 'PARANORMAL ACTIVITY — ทุกสถานที่ มีเรื่องเล่า',
    template: '%s · Paranormal Activity',
  },
  description:
    'ร่วมสำรวจแผนที่เรื่องลี้ลับทั่วไทย แบ่งปันประสบการณ์โดยไม่ต้องสมัคร เผยแพร่ทันทีหลังผ่านการตรวจอัตโนมัติ',
  openGraph: {
    title: 'Paranormal Activity',
    description: 'Every Place Has a Story. แผนที่เรื่องลี้ลับจากชุมชน',
    locale: 'th_TH',
    alternateLocale: 'en_US',
    type: 'website',
  },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" data-scroll-behavior="smooth">
      <body>
        <Providers>
          <Nav />
          {children}
        </Providers>
      </body>
    </html>
  );
}
