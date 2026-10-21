'use client';
import Link from 'next/link';
import { ArrowUpRight, MapPin, Ghost, Radio } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Explorer } from './explorer';
import { api, thaiDate } from '@/lib/client';
import { categories, type Report } from '@/lib/categories';
import { useUI } from './providers';
export function Home() {
  const { locale } = useUI();
  const en = locale === 'en';
  const { data } = useQuery({
    queryKey: ['stats'],
    queryFn: () =>
      api<{
        published: number;
        locations: number;
        today: number;
        provinces: { province: string; count: number }[];
      }>('stats'),
  });
  const { data: recent } = useQuery({
    queryKey: ['reports', 'recent'],
    queryFn: () => api<{ items: Report[] }>('reports?limit=4'),
  });
  return (
    <main>
      <Explorer />
      <section className="stats-strip">
        {[
          [data?.published, 'เรื่องเล่าบนแผนที่', 'FIELD REPORTS'],
          [data?.locations, 'สถานที่ลี้ลับ', 'MAPPED LOCATIONS'],
          [data?.today, 'รายงานวันนี้', 'NEW TODAY'],
        ].map(([n, label, sub]) => (
          <div key={String(sub)}>
            <span className="stat-number">{n ?? '—'}</span>
            <span>
              {label}
              <small>{sub}</small>
            </span>
          </div>
        ))}
        <div className="stat-last">
          <span className="live-dot" />
          <p>
            เปิดรับทุกเรื่องเล่า<small>มีเรื่องหลอน เล่าให้ฟังได้เสมอ</small>
          </p>
        </div>
      </section>
      <section className="section recent-section">
        <div className="section-heading">
          <div>
            <div className="eyebrow">01 / RECENT ENCOUNTERS</div>
            <h2>เสียงกระซิบล่าสุด</h2>
          </div>
          <span className="micro">บันทึกจากชุมชน · ยังไม่ได้รับการพิสูจน์</span>
        </div>
        <div className="recent-grid">
          {recent?.items.length ? (
            recent.items.map((r, i) => (
              <Link key={r.id} href={'/locations/' + r.id} className="archive-card">
                <div className={'archive-visual tint-' + i}>
                  <span className="archive-index">FIELD NOTE / {r.id.slice(0, 6)}</span>
                  <Ghost size={52} />
                  <span className="micro">
                    {r.fictional ? 'เรื่องสมมติ' : 'รายงานจากคนเจอ'}
                  </span>
                </div>
                <div className="archive-text">
                  <span className="micro">
                    {r.province || 'ไม่ระบุจังหวัด'} · {thaiDate(r.published_at)}
                  </span>
                  <h3>{r.title}</h3>
                  <p>{r.description.slice(0, 95)}…</p>
                  <span className="read-story">
                    อ่านบันทึก <ArrowUpRight size={15} />
                  </span>
                </div>
              </Link>
            ))
          ) : (
            <div className="archive-empty">
              <Radio size={30} />
              <h3>คลังเรื่องเล่ายังเงียบอยู่</h3>
              <p>รายงานแรกอาจเป็นเรื่องของคุณ เราไม่สร้างเรื่องจริงขึ้นมาเติมแผนที่</p>
              <Link href="/submit">แบ่งปันเรื่องของคุณ ↗</Link>
            </div>
          )}
        </div>
      </section>
      <section className="section categories-section">
        <div className="section-heading">
          <div>
            <div className="eyebrow">02 / CLASSIFY THE UNEXPLAINED</div>
            <h2>คุณพบเจออะไรมา?</h2>
          </div>
          <span className="micro">15 CATEGORIES OF THE UNKNOWN</span>
        </div>
        <div className="category-grid">
          {categories.map((c) => (
            <Link href={'/explore?category=' + c[0]} key={c[0]}>
              <span style={{ color: c[4] }}>{c[3]}</span>
              <div>
                {c[en ? 2 : 1]}
                <small>{c[2]}</small>
              </div>
              <ArrowUpRight size={15} />
            </Link>
          ))}
        </div>
      </section>
      <section className="section province-section">
        <div>
          <div className="eyebrow">03 / STORIES ACROSS THE COUNTRY</div>
          <h2>
            แต่ละจังหวัด
            <br />
            มีความเงียบไม่เหมือนกัน
          </h2>
          <p className="muted">จำนวนรายงานที่เผยแพร่จากฐานข้อมูลชุมชน</p>
        </div>
        <div className="province-list">
          {data?.provinces.length ? (
            data.provinces.map((p) => (
              <Link key={p.province} href={'/explore?q=' + encodeURIComponent(p.province)}>
                <MapPin size={16} />
                <span>{p.province || 'ไม่ระบุจังหวัด'}</span>
                <b>{p.count}</b>
                <ArrowUpRight size={15} />
              </Link>
            ))
          ) : (
            <p className="muted">ยังไม่มีรายงานรายจังหวัด เริ่มต้นจากสถานที่ที่คุณรู้จัก</p>
          )}
        </div>
      </section>
      <section className="community-cta">
        <div className="eyebrow">YOUR STORY BELONGS HERE</div>
        <h2>
          เคยเจออะไร
          <br />
          ที่ยัง<em>อธิบายไม่ได้?</em>
        </h2>
        <p>เราอาจยังไม่มีคำตอบ แต่มีพื้นที่ให้คุณเล่า</p>
        <Link href="/submit" className="button">
          เพิ่มเรื่องเล่าลงบนแผนที่
          <ArrowUpRight size={18} />
        </Link>
        <small>ไม่ต้องสมัคร ไม่ต้องใช้ชื่อจริง แค่เล่าสิ่งที่พบมา</small>
      </section>
    </main>
  );
}
