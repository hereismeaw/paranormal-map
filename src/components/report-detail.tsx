'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  ArrowUpRight,
  Copy,
  Flag,
  Share2,
  MapPin,
  Calendar,
  Ghost,
  User,
} from 'lucide-react';
import { toast } from 'sonner';
import { api, thaiDate, share } from '@/lib/client';
import { categoryLabel, type Report } from '@/lib/categories';
import { ParanormalMap } from './map';
import { Turnstile } from './turnstile';
export function ReportDetail({
  initial,
}: {
  initial: Report & { media: { id: string; media_type: string }[] };
}) {
  const { data: report, isError } = useQuery({
    queryKey: ['detail', initial.id],
    queryFn: () => api<typeof initial>('reports/' + initial.id),
    initialData: initial,
    refetchInterval: 10000,
    retry: false,
  });
  const { data: related } = useQuery({
    queryKey: ['related', initial.location_id],
    queryFn: () =>
      api<{ items: Report[] }>(
        'reports?' +
          new URLSearchParams({
            lat: String(initial.latitude),
            lng: String(initial.longitude),
            radius: '1000',
            limit: '30',
          }),
      ),
    refetchInterval: 10000,
  });
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('spam');
  const [details, setDetails] = useState('');
  const [token, setToken] = useState('');
  const [reset, setReset] = useState(0);
  const [busy, setBusy] = useState(false);
  const [website, setWebsite] = useState('');
  useEffect(() => {
    api('guest').catch(() => {});
  }, []);
  async function abuse() {
    setBusy(true);
    try {
      await api('abuse-reports', {
        method: 'POST',
        body: JSON.stringify({
          reportId: initial.id,
          reason,
          details,
          turnstileToken: token,
          website,
        }),
      });
      toast.success('รับรายงานแล้ว ขอบคุณที่ช่วยดูแลชุมชน');
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'ส่งไม่สำเร็จ');
    } finally {
      setBusy(false);
      setToken('');
      setReset((r) => r + 1);
    }
  }
  if (isError)
    return (
      <main className="not-found">
        <Ghost size={48} />
        <h1>เรื่องเล่านี้ไม่พร้อมเผยแพร่แล้ว</h1>
        <p>รายงานอาจถูกซ่อนหรือลบโดยผู้ดูแล</p>
        <Link href="/explore" className="button">
          กลับไปสำรวจแผนที่
        </Link>
      </main>
    );
  return (
    <main className="detail-page">
      <Link href="/explore" className="back-link">
        <ArrowLeft size={15} />
        กลับสู่แผนที่
      </Link>
      <div className="detail-grid">
        <article>
          <div className="eyebrow">FIELD REPORT / {report.id.slice(0, 8)}</div>
          <div className="detail-category">
            {categoryLabel(report.category)}
            {report.fictional && <span className="badge">เรื่องสมมติสำหรับสาธิต</span>}
          </div>
          <h1>{report.title}</h1>
          <div className="detail-meta">
            <span>
              <User size={15} />
              {report.guest_nickname || 'ผู้พบเห็นนิรนาม'}
            </span>
            <span>
              <Calendar size={15} />
              {thaiDate(report.published_at)}
            </span>
            <span>
              <MapPin size={15} />
              {[report.district, report.province].filter(Boolean).join(', ') || 'ไม่ระบุจังหวัด'}
            </span>
          </div>
          <hr />
          <div className="story-text">{report.description}</div>
          {report.observations && (
            <div className="observation">
              <h3>ข้อสังเกตเพิ่มเติม</h3>
              <p>{report.observations}</p>
            </div>
          )}
          {report.occurred_at && (
            <p className="muted">
              เกิดเหตุ {thaiDate(report.occurred_at)} {report.incident_time?.slice(0, 5)}{' '}
              {report.witnesses ? ` · ผู้พบเห็น ${report.witnesses} คน` : ''}
            </p>
          )}
          {report.media.length > 0 && (
            <section className="evidence-gallery">
              <h2>หลักฐานจากผู้เล่า</h2>
              {report.media.map((m) =>
                m.media_type.startsWith('image/') ? (
                  <a key={m.id} href={'/api/media/' + m.id} target="_blank" rel="noreferrer">
                    {/* Validated, re-encoded evidence is served through the status-checked proxy. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={'/api/media/' + m.id} alt="ภาพหลักฐานที่ผ่านการตรวจไฟล์แล้ว" />
                  </a>
                ) : m.media_type.startsWith('audio/') ? (
                  <audio key={m.id} src={'/api/media/' + m.id} controls />
                ) : (
                  <video key={m.id} src={'/api/media/' + m.id} controls />
                ),
              )}
            </section>
          )}
          <p className="content-note">
            เรื่องเล่าจากประสบการณ์ส่วนบุคคล ไม่ใช่หลักฐานยืนยันสิ่งเหนือธรรมชาติ
            ชื่อผู้เล่าเป็นชื่อที่ตั้งเอง ไม่ใช่ตัวตนที่ได้รับการยืนยัน
          </p>
          <div className="actions">
            <button
              className="button secondary"
              onClick={() => share(window.location.href, report.title).catch(() => {})}
            >
              <Share2 size={16} />
              แชร์เรื่องราว
            </button>
            <button className="text-button" onClick={() => setOpen(!open)}>
              <Flag size={15} />
              รายงานเนื้อหานี้
            </button>
          </div>
          {open && (
            <form
              className="abuse-form"
              onSubmit={(e) => {
                e.preventDefault();
                abuse();
              }}
            >
              <h3>รายงานเนื้อหาไม่เหมาะสม</h3>
              <label>
                เหตุผล
                <select value={reason} onChange={(e) => setReason(e.target.value)}>
                  {[
                    ['spam', 'สแปม'],
                    ['fake', 'พิกัดปลอมหรือชวนเข้าใจผิด'],
                    ['harassment', 'คุกคามหรือแอบอ้าง'],
                    ['privacy', 'เปิดเผยข้อมูลส่วนบุคคล'],
                    ['dangerous', 'ผิดกฎหมายหรืออันตราย'],
                    ['duplicate', 'รายงานซ้ำ'],
                    ['copyright', 'ละเมิดลิขสิทธิ์'],
                    ['other', 'อื่น ๆ'],
                  ].map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                รายละเอียด
                <textarea
                  required
                  minLength={5}
                  maxLength={1200}
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                />
              </label>
              <div className="honeypot" aria-hidden="true">
                <input
                  aria-label="Website"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  tabIndex={-1}
                />
              </div>
              <Turnstile action="abuse" onToken={setToken} reset={reset} />
              <button className="button" disabled={!token || busy}>
                ส่งรายงาน
              </button>
            </form>
          )}
        </article>
        <aside className="detail-aside">
          <div className="detail-map">
            <ParanormalMap
              reports={[report]}
              selected={{ latitude: report.latitude, longitude: report.longitude }}
              center={[report.longitude, report.latitude]}
            />
          </div>
          <div className="coordinate-card">
            <div className="eyebrow">LOCATION / WGS84</div>
            <p>
              {report.latitude.toFixed(report.sensitive ? 2 : 6)}° N /{' '}
              {report.longitude.toFixed(report.sensitive ? 2 : 6)}° E
            </p>
            <p className="muted">
              {report.sensitive
                ? 'พิกัดโดยประมาณเพื่อปกป้องความเป็นส่วนตัว'
                : 'พิกัดที่ผู้เล่าระบุ'}
            </p>
            <button
              className="text-button"
              onClick={() =>
                navigator.clipboard
                  .writeText(`${report.latitude}, ${report.longitude}`)
                  .then(() => toast.success('คัดลอกพิกัดแล้ว'))
                  .catch(() => toast.error('คัดลอกไม่ได้'))
              }
            >
              <Copy size={14} />
              คัดลอกพิกัด
            </button>
          </div>
          <Link
            className="button"
            href={`/submit?locationId=${report.location_id}&reportId=${report.id}`}
          >
            เพิ่มประสบการณ์ในพิกัดนี้
            <ArrowUpRight size={16} />
          </Link>
          <p className="micro">เคารพสถานที่ ไม่บุกรุกพื้นที่ส่วนบุคคล</p>
        </aside>
      </div>
      <section className="related">
        <div className="eyebrow">MORE VOICES / NEARBY</div>
        <h2>เรื่องเล่าใกล้กัน</h2>
        {related?.items
          .filter((r) => r.id !== report.id)
          .map((r) => (
            <Link key={r.id} href={'/locations/' + r.id} className="related-link">
              {r.title}
              <span>{r.guest_nickname || 'ผู้พบเห็นนิรนาม'}</span>
              <ArrowUpRight size={15} />
            </Link>
          ))}
        {!related?.items.some((r) => r.id !== report.id) && (
          <p className="muted">ยังไม่มีเรื่องเล่าอื่นในบริเวณนี้</p>
        )}
      </section>
    </main>
  );
}
