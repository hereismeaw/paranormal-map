'use client';
import Link from 'next/link';
import { Ghost, ArrowUpRight, Globe, Map, Radar } from 'lucide-react';
import { useUI } from './providers';
export function Nav() {
  const { locale, toggle } = useUI();
  const en = locale === 'en';
  return (
    <header className="nav">
      <Link className="brand" href="/" aria-label="Paranormal Activity home">
        <span className="brand-mark">
          <Ghost size={23} />
        </span>
        <span>
          PARANORMAL<span className="brand-sub">ACTIVITY · THAILAND</span>
        </span>
      </Link>
      <nav aria-label="Main">
        <Link href="/explore">
          <Map size={15} />
          {en ? 'Explore' : 'สำรวจแผนที่'}
        </Link>
        <Link href="/radar">
          <Radar size={15} />
          {en ? 'Ghost stories nearby' : 'เรื่องผีรอบๆ ตัวคุณ'}
        </Link>
        <button className="locale" onClick={toggle} aria-label="Switch language">
          <Globe size={15} />
          {en ? 'ไทย' : 'EN'}
        </button>
        <Link className="button small" href="/submit">
          {en ? 'Add a sighting' : 'เพิ่มพิกัดผี'}
          <ArrowUpRight size={15} />
        </Link>
      </nav>
    </header>
  );
}
