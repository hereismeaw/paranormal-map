'use client';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import {
  Ghost,
  Search,
  ArrowUpRight,
  Layers,
  X,
  Plus,
  LocateFixed,
  SlidersHorizontal,
} from 'lucide-react';
import { ParanormalMap } from './map';
import { categories, categoryLabel, type Report } from '@/lib/categories';
import { api, thaiDate } from '@/lib/client';
import { useUI } from './providers';
import { toast } from 'sonner';
export function Explorer({
  radar = false,
  preview = false,
}: {
  radar?: boolean;
  preview?: boolean;
}) {
  const { locale } = useUI();
  const en = locale === 'en';
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  const [category, setCategory] = useState('');
  const [heat, setHeat] = useState(false);
  const [selected, setSelected] = useState<Report | null>(null);
  const [sidebar, setSidebar] = useState(true);
  const [since, setSince] = useState('');
  const [page, setPage] = useState(1);
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [radius, setRadius] = useState('10000');
  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(q);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [q]);
  useEffect(() => {
    queueMicrotask(() => {
      const p = new URLSearchParams(window.location.search);
      if (p.get('q')) setQ(p.get('q')!);
      if (p.get('category')) setCategory(p.get('category')!);
    });
  }, []);
  const params = new URLSearchParams({
    q: debounced,
    category,
    since,
    limit: preview ? '12' : '100',
    page: String(page),
  });
  if (radar && position) {
    params.set('lat', String(position.lat));
    params.set('lng', String(position.lng));
    params.set('radius', radius);
  }
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['reports', params.toString()],
    queryFn: () => api<{ items: Report[]; total: number }>('locations?' + params),
    refetchInterval: 10000,
  });
  // Polling updates map, list and open previews after post-publication moderation.
  const items = data?.items || [];
  const visible = selected ? items.find((r) => r.id === selected.id) : null;
  function gps() {
    if (!navigator.geolocation) {
      toast.error('อุปกรณ์ไม่รองรับ GPS');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setSelected(null);
        setPosition({ lat: p.coords.latitude, lng: p.coords.longitude });
      },
      () => toast.error('ไม่สามารถใช้ตำแหน่งได้ กรุณาอนุญาต GPS'),
    );
  }
  return (
    <section className={`explorer ${preview ? 'preview' : ''}`}>
      <ParanormalMap
        reports={items}
        onSelect={setSelected}
        heat={heat}
        center={radar && position ? [position.lng, position.lat] : undefined}
        selected={
          visible ? { latitude: visible.latitude, longitude: visible.longitude } : undefined
        }
      />
      <div className="explore-toolbar">
        <button
          className="icon-button"
          onClick={() => setSidebar(!sidebar)}
          aria-label="แสดงรายการ"
        >
          <SlidersHorizontal size={18} />
        </button>
        <label className="search">
          <Search size={17} />
          <input
            placeholder={en ? 'Search a place, a story…' : 'ค้นหาสถานที่ เรื่องเล่า หรือจังหวัด…'}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <kbd>⌕</kbd>
        </label>
        <button
          className={`icon-button ${heat ? 'active' : ''}`}
          onClick={() => setHeat(!heat)}
          title="ความหนาแน่นรายงาน"
        >
          <Layers size={18} />
        </button>
      </div>
      {sidebar && (
        <aside className="map-sidebar">
          <div className="eyebrow">
            <span className="live-dot" />
            {radar ? 'GHOST RADAR' : 'COMMUNITY ATLAS'}
            <span className="tiny">{en ? 'LIVE' : 'อัปเดตสด'}</span>
          </div>
          <h2>
            {radar
              ? en
                ? 'Stories around you'
                : 'เรื่องเล่ารอบตัวคุณ'
              : en
                ? 'What lingers here?'
                : 'ที่นี่… มีอะไรอยู่?'}
          </h2>
          <p className="muted">
            {radar
              ? 'แสดงรายงานตามระยะทาง ไม่ใช่เครื่องตรวจจับผี'
              : en
                ? 'Every pin is someone’s story.'
                : 'ทุกหมุด คือเรื่องเล่าของใครสักคน'}
          </p>
          {radar && (
            <div className="radar-controls">
              <button className="button secondary" onClick={gps}>
                <LocateFixed size={16} />
                ใช้ตำแหน่งของฉัน
              </button>
              <select
                aria-label="ระยะเรดาร์"
                value={radius}
                onChange={(e) => setRadius(e.target.value)}
              >
                {[1, 5, 10, 25, 50].map((n) => (
                  <option key={n} value={n * 1000}>
                    {n} km
                  </option>
                ))}
              </select>
              {position && <div className="radar-sweep" aria-hidden />}
            </div>
          )}
          <label className="filter-label">
            {en ? 'Category' : 'ประเภทเรื่องเล่า'}
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setPage(1);
              }}
            >
              <option value="">{en ? 'All phenomena' : 'ทุกปรากฏการณ์'}</option>
              {categories.map((c) => (
                <option key={c[0]} value={c[0]}>
                  {c[3]} {c[en ? 2 : 1]}
                </option>
              ))}
            </select>
          </label>
          <label className="filter-label">
            {en ? 'Reported since' : 'รายงานตั้งแต่'}
            <input type="date" value={since} onChange={(e) => setSince(e.target.value)} />
          </label>
          <div className="result-heading">
            <span>{en ? 'SIGHTING ARCHIVE' : 'บันทึกการพบเห็น'}</span>
            <span>{data?.total ?? '—'} REPORTS</span>
          </div>
          <div className="report-list" aria-live="polite">
            {isPending ? (
              <p className="empty">กำลังค้นหาเรื่องเล่า…</p>
            ) : isError ? (
              <div className="empty">
                เชื่อมต่อข้อมูลไม่สำเร็จ<button onClick={() => refetch()}>ลองอีกครั้ง</button>
              </div>
            ) : !items.length ? (
              <div className="empty">
                <Ghost size={32} />
                <h3>ความเงียบก็เป็นเรื่องเล่า</h3>
                <p>
                  ยังไม่มีรายงานในบริเวณนี้
                  <br />
                  เริ่มแบ่งปันประสบการณ์แรกได้เลย
                </p>
                <Link href="/submit">+ เพิ่มเรื่องเล่า</Link>
              </div>
            ) : (
              items.map((r) => (
                <button
                  className={`report-card ${visible?.id === r.id ? 'selected' : ''}`}
                  key={r.id}
                  onClick={() => setSelected(r)}
                >
                  <span
                    className="category-icon"
                    style={{ color: categories.find((c) => c[0] === r.category)?.[4] }}
                  >
                    {categories.find((c) => c[0] === r.category)?.[3]}
                  </span>
                  <div>
                    <span className="micro">
                      {r.fictional ? 'เรื่องสมมติ · DEMO' : categoryLabel(r.category, locale)}
                    </span>
                    <h3>{r.title}</h3>
                    <p>
                      {r.province || 'ไม่ระบุจังหวัด'} ·{' '}
                      {r.distance != null
                        ? `${(r.distance / 1000).toFixed(1)} km`
                        : thaiDate(r.published_at)}
                    </p>
                  </div>
                  <ArrowUpRight size={16} />
                </button>
              ))
            )}
          </div>
          {!preview && data && data.total > 100 && (
            <div className="pagination">
              <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                ก่อนหน้า
              </button>
              <span>{page}</span>
              <button disabled={page * 100 >= data.total} onClick={() => setPage((p) => p + 1)}>
                ถัดไป
              </button>
            </div>
          )}
          <div className="sidebar-note">
            ⌖{' '}
            {en
              ? 'Community experiences, unverified.'
              : 'ประสบการณ์จากชุมชน ยังไม่ได้รับการพิสูจน์'}
            <br />
            เคารพสถานที่ ไม่บุกรุกพื้นที่ส่วนบุคคล
          </div>
        </aside>
      )}
      <div className="map-coordinates">
        THAILAND & BEYOND <span>13°42′N 100°30′E</span>
      </div>
      {heat && (
        <div className="heat-legend">
          ความหนาแน่นของรายงานชุมชน <span />
          น้อย — มาก
        </div>
      )}
      {visible && (
        <article className="map-drawer">
          <button
            className="drawer-close icon-button"
            onClick={() => setSelected(null)}
            aria-label="ปิดรายละเอียด"
          >
            <X size={18} />
          </button>
          <div className="eyebrow">FIELD REPORT / {visible.id.slice(0, 8)}</div>
          <span className="big-ghost">
            <Ghost size={44} />
          </span>
          <p className="micro">
            {categoryLabel(visible.category, locale)}
            {visible.fictional ? ' · เรื่องสมมติ' : ''}
          </p>
          <h2>{visible.title}</h2>
          <p className="drawer-description">{visible.description}</p>
          <p className="muted">
            โดย {visible.guest_nickname || 'ผู้พบเห็นนิรนาม'}
            <br />
            {thaiDate(visible.published_at)}
          </p>
          <Link className="button" href={'/locations/' + visible.id}>
            เปิดบันทึกฉบับเต็ม
            <ArrowUpRight size={16} />
          </Link>
        </article>
      )}
      <Link className="button map-add" href="/submit">
        <Plus size={19} />
        {en ? 'Report a sighting' : 'เพิ่มพิกัดที่เจอผี'}
      </Link>
      {preview && (
        <Link className="map-full-link" href="/explore">
          เปิดแผนที่เต็มจอ <ArrowUpRight size={15} />
        </Link>
      )}
    </section>
  );
}
