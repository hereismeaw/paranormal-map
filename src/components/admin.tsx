'use client';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShieldCheck, LogOut, ArrowUpRight } from 'lucide-react';
import { api, thaiDate } from '@/lib/client';
import { categories, type Report } from '@/lib/categories';
import { defaultSettings } from '@/lib/settings-defaults';
import { toast } from 'sonner';
function EvidenceInspector({ reportId }: { reportId: string }) {
  const [open, setOpen] = useState(false);
  const { data, error } = useQuery({
    queryKey: ['admin', 'evidence', reportId],
    queryFn: () =>
      api<{ media: { id: string; media_type: string; scan_status: string }[] }>(
        'admin/reports/' + reportId,
      ),
    enabled: open,
  });
  return (
    <details onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary>ตรวจหลักฐานแนบ</summary>
      {error && <p className="error">{error.message}</p>}
      {data?.media.length === 0 && <p>ไม่มีหลักฐานแนบ</p>}
      {data?.media.map((m) => (
        <p key={m.id}>
          {m.media_type} · {m.scan_status}{' '}
          {m.scan_status === 'ready' ? (
            <a
              className="text-button"
              href={'/api/admin/media/' + m.id}
              target="_blank"
              rel="noreferrer"
            >
              เปิดหลักฐานที่ผ่านการตรวจ ↗
            </a>
          ) : (
            <span>ยังไม่เปิดให้ดูไฟล์</span>
          )}
        </p>
      ))}
    </details>
  );
}
export function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  async function login() {
    setBusy(true);
    setError('');
    try {
      await api('auth/sign-in/email', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      setPassword('');
      router.push('/admin');
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'เข้าสู่ระบบไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="login-page">
      <ShieldCheck size={30} />
      <div className="eyebrow">RESTRICTED / ADMINISTRATION</div>
      <h1>ดูแลพื้นที่ของเรื่องเล่า</h1>
      <p className="muted">เฉพาะผู้ดูแลระบบ ผู้เล่าเรื่องไม่ต้องเข้าสู่ระบบ</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          login();
        }}
      >
        <label>
          อีเมล
          <input
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label>
          รหัสผ่าน
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button className="button" disabled={busy}>
          {busy ? 'กำลังตรวจสอบ…' : 'เข้าสู่ระบบผู้ดูแล'}
          <ArrowUpRight size={16} />
        </button>
      </form>
      <Link href="/submit">แค่ต้องการเล่าเรื่อง? เพิ่มพิกัดได้ที่นี่ ↗</Link>
    </main>
  );
}
type Counts = {
  published: number;
  locations: number;
  today: number;
  week: number;
  deleted: number;
  hidden: number;
  abuse: number;
  spam: number;
  provinces: { province: string; count: number }[];
};
type Abuse = {
  id: string;
  report_id: string;
  title: string;
  reason: string;
  details: string;
  status: string;
};
type Event = {
  id: string;
  event_type: string;
  risk_score: number;
  signals: string[];
  created_at: string;
};
type Audit = {
  id: string;
  report_id: string;
  administrator_id: string;
  action: string;
  reason: string;
  created_at: string;
};
export function AdminScreen({ section }: { section: string }) {
  const router = useRouter();
  const client = useQueryClient();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [category, setCategory] = useState('');
  const [nickname, setNickname] = useState('');
  const [province, setProvince] = useState('');
  const [page, setPage] = useState(1);
  const [target, setTarget] = useState<{ report: Report; action: string } | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const params = new URLSearchParams({
    q,
    status,
    category,
    nickname,
    province,
    page: String(page),
    limit: '50',
  });
  const counts = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: () => api<Counts>('admin/stats'),
  });
  const reports = useQuery({
    queryKey: ['admin', 'reports', params.toString()],
    queryFn: () => api<{ items: Report[]; total: number }>('admin/reports?' + params),
    enabled: ['locations', 'overview'].includes(section),
  });
  const abuse = useQuery({
    queryKey: ['admin', 'abuse'],
    queryFn: () => api<Abuse[]>('admin/abuse-reports'),
    enabled: section === 'reports',
  });
  const spam = useQuery({
    queryKey: ['admin', 'spam'],
    queryFn: () => api<Event[]>('admin/spam-events'),
    enabled: section === 'spam',
  });
  const audit = useQuery({
    queryKey: ['admin', 'audit'],
    queryFn: () => api<Audit[]>('admin/audit'),
    enabled: section === 'audit',
  });
  const [config, setConfig] = useState(defaultSettings);
  const settings = useQuery({
    queryKey: ['admin', 'settings'],
    queryFn: () => api<typeof defaultSettings>('admin/settings'),
    enabled: section === 'settings',
  });
  const [edited, setEdited] = useState(false);
  const current = edited ? config : settings.data || config;
  async function moderate() {
    if (!target) return;
    setBusy(true);
    try {
      await api('admin/reports/' + target.report.id, {
        method: 'PATCH',
        body: JSON.stringify({ action: target.action, reason }),
      });
      await client.invalidateQueries({ queryKey: ['admin'] });
      await client.invalidateQueries({ queryKey: ['reports'] });
      await client.invalidateQueries({ queryKey: ['stats'] });
      toast.success('บันทึกแล้ว ผลสาธารณะอัปเดตทันที');
      setTarget(null);
      setReason('');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'ทำรายการไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  }
  const failure =
    counts.error || reports.error || abuse.error || spam.error || audit.error || settings.error;
  return (
    <main className="admin-page">
      <aside className="admin-nav">
        <div className="eyebrow">POST-PUBLICATION CARE</div>
        <h2>ผู้ดูแลระบบ</h2>
        {[
          ['overview', 'ภาพรวม'],
          ['locations', 'รายงานทั้งหมด'],
          ['reports', 'การแจ้งเนื้อหา'],
          ['spam', 'สแปมอัตโนมัติ'],
          ['analytics', 'สถิติ'],
          ['settings', 'ตั้งค่าป้องกันสแปม'],
          ['audit', 'ประวัติการดูแล'],
        ].map(([id, label]) => (
          <Link
            className={section === id ? 'active' : ''}
            key={id}
            href={'/admin' + (id === 'overview' ? '' : '/' + id)}
          >
            {label}
          </Link>
        ))}
        <button
          onClick={async () => {
            await api('auth/sign-out', { method: 'POST', body: '{}' });
            router.push('/admin/login');
            router.refresh();
          }}
        >
          <LogOut size={16} />
          ออกจากระบบ
        </button>
        <p className="micro">
          รายงานเผยแพร่โดยอัตโนมัติ
          <br />
          ผู้ดูแลจัดการเนื้อหาหลังเผยแพร่
        </p>
      </aside>
      <section className="admin-content">
        <div className="eyebrow">PARANORMAL ACTIVITY / ADMIN</div>
        <h1>
          {section === 'overview'
            ? 'ภาพรวมชุมชน'
            : section === 'locations'
              ? 'รายงานทั้งหมด'
              : section === 'reports'
                ? 'การแจ้งเนื้อหา'
                : section === 'spam'
                  ? 'การป้องกันสแปม'
                  : section === 'analytics'
                    ? 'สถิติชุมชน'
                    : section === 'settings'
                      ? 'ตั้งค่าการป้องกัน'
                      : 'ประวัติการดูแล'}
        </h1>
        {failure && (
          <p className="error" role="alert">
            {failure.message}
          </p>
        )}
        {['overview', 'analytics'].includes(section) && (
          <>
            <div className="admin-stats">
              {[
                ['published', 'เผยแพร่แล้ว'],
                ['locations', 'พิกัด'],
                ['today', 'วันนี้'],
                ['week', 'สัปดาห์นี้'],
                ['hidden', 'ซ่อน'],
                ['deleted', 'ลบแล้ว'],
                ['spam', 'สแปมที่ปฏิเสธ'],
                ['abuse', 'แจ้งเนื้อหา'],
              ].map(([key, label]) => (
                <div key={key}>
                  <strong>{(counts.data?.[key as keyof Counts] as number) ?? '—'}</strong>
                  <span>{label}</span>
                </div>
              ))}
            </div>
            <div className="province-list">
              {counts.data?.provinces.map((p) => (
                <p key={p.province}>
                  {p.province || 'ไม่ระบุจังหวัด'}
                  <b>{p.count}</b>
                </p>
              ))}
            </div>
          </>
        )}
        {['locations', 'overview'].includes(section) && (
          <>
            <div className="admin-filters">
              <input
                aria-label="ค้นหารายงาน"
                placeholder="ค้นหาชื่อหรือเรื่องเล่า"
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(1);
                }}
              />
              <input
                aria-label="กรองชื่อเล่น"
                placeholder="ชื่อเล่น"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
              />
              <input
                aria-label="กรองจังหวัด"
                placeholder="จังหวัด"
                value={province}
                onChange={(e) => setProvince(e.target.value)}
              />
              <select
                aria-label="กรองสถานะ"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="">ทุกสถานะ</option>
                {['published', 'hidden', 'hidden_auto', 'deleted'].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
              <select
                aria-label="กรองประเภท"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="">ทุกประเภท</option>
                {categories.map((c) => (
                  <option key={c[0]} value={c[0]}>
                    {c[1]}
                  </option>
                ))}
              </select>
            </div>
            <div className="admin-report-list">
              {reports.data?.items.map((r) => (
                <article className="admin-report" key={r.id}>
                  <div>
                    <span className={'status ' + r.status}>{r.status}</span>
                    <h3>{r.title}</h3>
                    <p className="muted">
                      {r.guest_nickname || 'ผู้พบเห็นนิรนาม'} · {r.province} ·{' '}
                      {thaiDate(r.published_at)}
                    </p>
                    <details>
                      <summary>อ่านเรื่องเล่าและสัญญาณสแปม</summary>
                      <p className="story-text">{r.description}</p>
                      <p>
                        Spam score {r.spam_score}: {JSON.stringify(r.spam_flags)}
                      </p>
                      <p>
                        {r.latitude}, {r.longitude}
                      </p>
                    </details>
                    <EvidenceInspector reportId={r.id} />
                  </div>
                  <div className="moderation-actions">
                    {r.status === 'published' ? (
                      <>
                        <Link href={'/locations/' + r.id}>เปิดรายงาน ↗</Link>
                        <button onClick={() => setTarget({ report: r, action: 'hide' })}>
                          ซ่อน
                        </button>
                        <button
                          className="danger"
                          onClick={() => setTarget({ report: r, action: 'delete' })}
                        >
                          ลบ
                        </button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => setTarget({ report: r, action: 'restore' })}>
                          กู้คืน
                        </button>
                        {r.status !== 'deleted' && (
                          <button
                            className="danger"
                            onClick={() => setTarget({ report: r, action: 'delete' })}
                          >
                            ลบ
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </article>
              ))}
              {reports.data && !reports.data.items.length && (
                <p className="empty">ยังไม่มีรายงานที่ตรงกับตัวกรอง</p>
              )}
            </div>
            <div className="pagination">
              <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                ก่อนหน้า
              </button>
              <span>
                หน้า {page} · {reports.data?.total ?? 0} รายงาน
              </span>
              <button
                disabled={page * 50 >= (reports.data?.total || 0)}
                onClick={() => setPage((p) => p + 1)}
              >
                ถัดไป
              </button>
            </div>
          </>
        )}
        {section === 'reports' &&
          abuse.data?.map((a) => (
            <article className="admin-report" key={a.id}>
              <div>
                <span className="status">{a.status}</span>
                <h3>{a.title}</h3>
                <p>
                  {a.reason} · {a.details}
                </p>
                <Link href={'/admin/locations?q=' + encodeURIComponent(a.title)}>จัดการรายงาน</Link>
              </div>
              {a.status === 'open' && (
                <button
                  onClick={async () => {
                    try {
                      await api('admin/abuse-reports/' + a.id, { method: 'PATCH', body: '{}' });
                      await client.invalidateQueries({ queryKey: ['admin'] });
                    } catch {
                      toast.error('ทำรายการไม่สำเร็จ');
                    }
                  }}
                >
                  ตรวจแล้ว
                </button>
              )}
            </article>
          ))}
        {section === 'spam' &&
          spam.data?.map((e) => (
            <article className="admin-report" key={e.id}>
              <div>
                <h3>
                  {e.event_type} · {e.risk_score}
                </h3>
                <p>{e.signals.join(', ')}</p>
                <p className="micro">{thaiDate(e.created_at)}</p>
              </div>
            </article>
          ))}
        {section === 'audit' &&
          audit.data?.map((a) => (
            <article className="admin-report" key={a.id}>
              <div>
                <h3>{a.action}</h3>
                <p>{a.reason}</p>
                <p className="micro">
                  Report {a.report_id || '—'} · Admin {a.administrator_id || 'system'} ·{' '}
                  {thaiDate(a.created_at)}
                </p>
              </div>
            </article>
          ))}
        {section === 'settings' && (
          <form
            className="settings-form"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              try {
                await api('admin/settings', { method: 'POST', body: JSON.stringify(current) });
                await client.invalidateQueries({ queryKey: ['admin', 'settings'] });
                toast.success('บันทึกการตั้งค่าแล้ว');
              } catch (e) {
                toast.error(e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ');
              } finally {
                setBusy(false);
              }
            }}
          >
            {Object.entries(current).map(([key, value]) => (
              <label key={key}>
                {
                  (
                    {
                      reportsPerHour: 'รายงานต่อ IP ต่อชั่วโมง',
                      reportsPerDay: 'รายงานต่อ IP ต่อวัน',
                      guestPerHour: 'รายงานต่อเซสชันต่อชั่วโมง',
                      duplicateRadius: 'รัศมีตรวจรายงานซ้ำ (เมตร)',
                      spamThreshold: 'คะแนนปฏิเสธสแปม',
                    } as Record<string, string>
                  )[key]
                }
                <input
                  type="number"
                  min={1}
                  required
                  value={value}
                  onChange={(e) => {
                    setConfig({ ...current, [key]: Number(e.target.value) });
                    setEdited(true);
                  }}
                />
              </label>
            ))}
            <button className="button" disabled={busy}>
              บันทึกการตั้งค่า
            </button>
            <p className="muted">
              IP ร่วมกันใช้เพดานเดียวกัน ปรับตามการใช้งานจริง ไม่ใช่การแบนถาวร
            </p>
          </form>
        )}
      </section>
      {target && (
        <div className="modal-backdrop">
          <form
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="moderation-title"
            onSubmit={(e) => {
              e.preventDefault();
              moderate();
            }}
          >
            <h2 id="moderation-title">
              {target.action === 'delete'
                ? 'ลบรายงาน'
                : target.action === 'hide'
                  ? 'ซ่อนรายงาน'
                  : 'กู้คืนรายงาน'}
            </h2>
            <p>{target.report.title}</p>
            <label>
              เหตุผล (บันทึกใน audit log)
              <textarea
                required
                minLength={5}
                maxLength={1000}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </label>
            <div className="actions">
              <button className="button" disabled={busy}>
                ยืนยัน
              </button>
              <button
                type="button"
                className="button secondary"
                onClick={() => {
                  setTarget(null);
                  setReason('');
                }}
              >
                ยกเลิก
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
