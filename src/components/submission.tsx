'use client';
import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowUpRight, Check, MapPin, Upload, ShieldCheck, ArrowLeft, Search } from 'lucide-react';
import Link from 'next/link';
import { ParanormalMap } from './map';
import { Turnstile } from './turnstile';
import { categories, type Report } from '@/lib/categories';
import { api, share } from '@/lib/client';
import { toast } from 'sonner';
import { useUI } from './providers';
type Form = {
  title: string;
  description: string;
  nickname: string;
  category: string;
  province: string;
  district: string;
  latitude: number;
  longitude: number;
  website: string;
  sensitive: boolean;
  occurredAt: string;
  incidentTime: string;
  witnesses: string;
  observations: string;
};
function EvidenceUpload({ reportId }: { reportId: string }) {
  const [files, setFiles] = useState<File[]>([]);
  const [token, setToken] = useState('');
  const [reset, setReset] = useState(0);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(0);
  async function upload() {
    if (!files.length || !token) return;
    setBusy(true);
    try {
      const file = files[0];
      const result = await fetch('/api/media?reportId=' + reportId, {
        method: 'POST',
        headers: {
          'Content-Type': file.type || 'application/octet-stream',
          'X-Turnstile-Token': token,
        },
        body: file,
      });
      const data = await result.json();
      if (!result.ok) throw new Error(data.error);
      setFiles((f) => f.slice(1));
      setDone((d) => d + 1);
      toast.success('รับไฟล์แล้ว จะแสดงหลังผ่านการตรวจความปลอดภัย');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'อัปโหลดไม่สำเร็จ');
    } finally {
      setBusy(false);
      setToken('');
      setReset((r) => r + 1);
    }
  }
  return (
    <section className="evidence-upload">
      <h3>
        <Upload size={18} /> แนบหลักฐานเพิ่มเติม
      </h3>
      <p className="muted">
        ข้อความของคุณเผยแพร่แล้ว ไฟล์จะปรากฏเมื่อผ่านการตรวจเท่านั้น รองรับภาพ เสียง และวิดีโอ
        สูงสุด 20 MB/ไฟล์ ไม่เกิน 6 ไฟล์
      </p>
      <input
        aria-label="เลือกไฟล์หลักฐาน"
        type="file"
        accept="image/jpeg,image/png,image/webp,audio/mpeg,audio/wav,audio/ogg,video/mp4,video/webm"
        multiple
        onChange={(e) => {
          const next = Array.from(e.target.files || []);
          if (next.length > 6 || next.some((f) => f.size > 20971520)) {
            toast.error('เลือกไม่เกิน 6 ไฟล์ ไฟล์ละไม่เกิน 20 MB');
            return;
          }
          setFiles(next);
        }}
      />
      {files.length > 0 && (
        <>
          <p>
            {files[0].name} · เหลือ {files.length} ไฟล์
          </p>
          <Turnstile action="upload" onToken={setToken} reset={reset} />
          <button className="button secondary" disabled={!token || busy} onClick={upload}>
            {busy ? 'กำลังอัปโหลด…' : 'อัปโหลดไฟล์ถัดไป'}
          </button>
        </>
      )}
      {done > 0 && <p className="green">ส่งตรวจแล้ว {done} ไฟล์</p>}
    </section>
  );
}
export function Submission() {
  const { locale } = useUI();
  const en = locale === 'en';
  const client = useQueryClient();
  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { isSubmitting },
  } = useForm<Form>({
    defaultValues: {
      nickname: '',
      category: 'ghost',
      latitude: 13.7,
      longitude: 100.5,
      sensitive: true,
      province: '',
      district: '',
      website: '',
      occurredAt: '',
      incidentTime: '',
      witnesses: '',
      observations: '',
    },
  });
  const latitude = useWatch({ control, name: 'latitude' });
  const longitude = useWatch({ control, name: 'longitude' });
  const [chosen, setChosen] = useState(false);
  const [token, setToken] = useState('');
  const [reset, setReset] = useState(0);
  const [remember, setRemember] = useState(false);
  const [key, setKey] = useState('');
  const [error, setError] = useState('');
  const [published, setPublished] = useState<{ id: string; url: string } | null>(null);
  const [nearby, setNearby] = useState<Report[]>([]);
  const [locationId, setLocationId] = useState('');
  const [search, setSearch] = useState('');
  useEffect(() => {
    api('guest')
      .then(() => setKey(crypto.randomUUID()))
      .catch(() => setError('เริ่มเซสชันไม่สำเร็จ กรุณาโหลดใหม่'));
    const saved = localStorage.getItem('pa_nickname');
    if (saved) {
      setValue('nickname', saved);
      queueMicrotask(() => setRemember(true));
    }
    const id = new URLSearchParams(window.location.search).get('locationId');
    if (id)
      api<Report>(
        'locations/' + (new URLSearchParams(window.location.search).get('reportId') || id),
      )
        .then((r) => {
          setValue('latitude', r.latitude);
          setValue('longitude', r.longitude);
          setLocationId(r.location_id);
          setChosen(true);
        })
        .catch(() => {});
  }, [setValue]);
  useEffect(() => {
    if (!chosen || !Number.isFinite(latitude) || !Number.isFinite(longitude)) return;
    let active = true;
    const t = setTimeout(() => {
      api<{ items: Report[] }>(
        'locations/nearby?' +
          new URLSearchParams({
            lat: String(latitude),
            lng: String(longitude),
            radius: '1000',
            limit: '5',
          }),
      )
        .then((d) => {
          if (active) setNearby(d.items);
        })
        .catch(() => {});
    }, 500);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [latitude, longitude, chosen]);
  function pick(lat: number, lng: number) {
    setValue('latitude', Number(lat.toFixed(6)));
    setValue('longitude', Number(lng.toFixed(6)));
    setChosen(true);
    setLocationId('');
  }
  async function find() {
    const d = await api<{ items: Report[] }>('search?q=' + encodeURIComponent(search));
    if (d.items[0]) pick(d.items[0].latitude, d.items[0].longitude);
    else toast.info('ยังไม่มีสถานที่นี้ในชุมชน เลือกพิกัดบนแผนที่หรือใช้ GPS ได้เลย');
  }
  async function submit(values: Form) {
    setError('');
    if (!chosen) {
      setError('กรุณาเลือกพิกัดบนแผนที่หรือกรอกพิกัดก่อน');
      return;
    }
    if (!token) {
      setError('กรุณายืนยันความปลอดภัยก่อน');
      return;
    }
    try {
      const { occurredAt, incidentTime, witnesses, ...rest } = values;
      const result = await api<{ id: string; url: string }>('reports', {
        method: 'POST',
        body: JSON.stringify({
          ...rest,
          ...(occurredAt ? { occurredAt } : {}),
          ...(incidentTime ? { incidentTime } : {}),
          ...(witnesses ? { witnesses: Number(witnesses) } : {}),
          ...(locationId ? { locationId } : {}),
          turnstileToken: token,
          idempotencyKey: key,
        }),
      });
      if (remember && values.nickname) localStorage.setItem('pa_nickname', values.nickname);
      else localStorage.removeItem('pa_nickname');
      await client.invalidateQueries({ queryKey: ['reports'] });
      await client.invalidateQueries({ queryKey: ['stats'] });
      setPublished(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'ส่งไม่สำเร็จ');
      setToken('');
      setReset((r) => r + 1);
    }
  }
  if (published)
    return (
      <main className="success-page">
        <span className="success-icon">
          <Check size={34} />
        </span>
        <div className="eyebrow">A NEW STORY ON THE MAP</div>
        <h1>เพิ่มพิกัดลี้ลับสำเร็จ!</h1>
        <p>เรื่องราวของคุณถูกเผยแพร่บนแผนที่ Paranormal Activity แล้ว</p>
        <div className="actions">
          <Link className="button" href={published.url}>
            ดูพิกัดของฉัน
            <ArrowUpRight size={17} />
          </Link>
          <Link className="button secondary" href="/explore">
            กลับไปสำรวจแผนที่
          </Link>
          <button
            className="button secondary"
            onClick={() =>
              share(window.location.origin + published.url, 'Paranormal Activity').catch(() => {})
            }
          >
            แชร์เรื่องราว
          </button>
        </div>
        <EvidenceUpload reportId={published.id} />
      </main>
    );
  return (
    <main className="submission-page">
      <div className="form-intro">
        <Link href="/explore" className="back-link">
          <ArrowLeft size={15} />
          กลับไปสำรวจ
        </Link>
        <div className="eyebrow">LEAVE A TRACE / ANONYMOUS REPORT</div>
        <h1>{en ? 'Some stories stay with you.' : 'บางเรื่อง… ไม่ควรเก็บไว้คนเดียว'}</h1>
        <p className="muted">
          {en ? 'No account. Just your experience.' : 'ไม่ต้องสมัครสมาชิก แค่มีเรื่องที่อยากเล่า'}
          <br />
          รายงานที่ผ่านการตรวจจะปรากฏบนแผนที่ทันที
        </p>
        <div className="trust-note">
          <ShieldCheck size={18} />
          <span>ไม่เปิดเผยตัวตน · ไม่ต้องใช้อีเมล · ไม่มีขั้นตอนรออนุมัติ</span>
        </div>
      </div>
      <form onSubmit={handleSubmit(submit)} className="report-form">
        <fieldset>
          <legend>
            <span>01</span>
            {en ? 'Mark the place' : 'เลือกสถานที่'}
          </legend>
          <p className="muted">แตะบนแผนที่แล้วลากหมุด หรือกรอกละติจูด/ลองจิจูด</p>
          <div className="inline-search">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหาสถานที่ในคลังเรื่องเล่า"
              aria-label="ค้นหาสถานที่"
            />
            <button
              type="button"
              className="icon-button"
              onClick={() => find().catch(() => toast.error('ค้นหาไม่สำเร็จ'))}
              aria-label="ค้นหา"
            >
              <Search size={18} />
            </button>
          </div>
          <div className="picker-map">
            <ParanormalMap onPick={pick} selected={chosen ? { latitude, longitude } : undefined} />
          </div>
          <div className="form-grid">
            <label>
              ละติจูด
              <input
                type="number"
                step="any"
                min="-90"
                max="90"
                {...register('latitude', {
                  valueAsNumber: true,
                  required: true,
                  onChange: () => setChosen(true),
                })}
              />
            </label>
            <label>
              ลองจิจูด
              <input
                type="number"
                step="any"
                min="-180"
                max="180"
                {...register('longitude', {
                  valueAsNumber: true,
                  required: true,
                  onChange: () => setChosen(true),
                })}
              />
            </label>
            <label>
              จังหวัด / รัฐ
              <input maxLength={100} {...register('province')} />
            </label>
            <label>
              อำเภอ / เมือง
              <input maxLength={100} {...register('district')} />
            </label>
          </div>
          <label className="checkbox">
            <input type="checkbox" {...register('sensitive')} />
            เป็นบ้านพักหรือสถานที่อ่อนไหว — แสดงพิกัดโดยประมาณ
          </label>
          <p className="micro">
            พิกัดส่วนบุคคลจะถูกปัดเป็นกริดประมาณ 1 กม. ก่อนบันทึก ไม่เก็บพิกัดจริง
          </p>
          {nearby.length > 0 && (
            <div className="nearby-notice">
              <h3>
                <MapPin size={17} />
                พบพิกัดลี้ลับใกล้เคียง
              </h3>
              <p>เลือกเพิ่มประสบการณ์ในพิกัดเดิม หรือสร้างพิกัดใหม่</p>
              <select
                aria-label="พิกัดใกล้เคียง"
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
              >
                <option value="">เพิ่มพิกัดใหม่</option>
                {nearby.map((r) => (
                  <option key={r.id} value={r.location_id}>
                    {r.title} — เพิ่มประสบการณ์ในพิกัดเดิม
                  </option>
                ))}
              </select>
            </div>
          )}
        </fieldset>
        <fieldset>
          <legend>
            <span>02</span>
            {en ? 'What should we call you?' : 'ชื่อผู้พบเห็น'}
          </legend>
          <label>
            ชื่อเล่น <span className="muted">(ไม่บังคับ)</span>
            <input
              maxLength={30}
              placeholder="เช่น GhostHunter99, Meaw หรือ นักล่าผี"
              {...register('nickname')}
            />
          </label>
          <p className="micro">เว้นว่างจะแสดง “ผู้พบเห็นนิรนาม” ชื่อเล่นไม่ใช่การยืนยันตัวตน</p>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
            />
            จำชื่อเล่นไว้ในเครื่องนี้
          </label>
          <button
            type="button"
            className="text-button"
            onClick={() => {
              localStorage.removeItem('pa_nickname');
              setValue('nickname', '');
              setRemember(false);
            }}
          >
            ล้างชื่อที่บันทึก
          </button>
        </fieldset>
        <fieldset>
          <legend>
            <span>03</span>
            {en ? 'Tell your story' : 'เล่าเรื่องที่คุณพบ'}
          </legend>
          <label>
            ชื่อเหตุการณ์ *
            <input
              required
              minLength={6}
              maxLength={140}
              placeholder="คืนนั้นที่ทางโค้ง…"
              {...register('title', { required: true })}
            />
          </label>
          <label>
            ประเภท *
            <select {...register('category')}>
              {categories.map((c) => (
                <option key={c[0]} value={c[0]}>
                  {c[3]} {c[en ? 2 : 1]}
                </option>
              ))}
            </select>
          </label>
          <label>
            รายละเอียด *
            <textarea
              required
              minLength={30}
              maxLength={8000}
              rows={7}
              placeholder="เกิดอะไรขึ้น ที่ไหน คุณเห็นหรือได้ยินอะไร…"
              {...register('description', { required: true })}
            />
          </label>
          <div className="form-grid">
            <label>
              วันที่เกิดเหตุ
              <input
                type="date"
                max={new Date().toISOString().slice(0, 10)}
                {...register('occurredAt')}
              />
            </label>
            <label>
              เวลาโดยประมาณ
              <input type="time" {...register('incidentTime')} />
            </label>
            <label>
              จำนวนผู้พบเห็น
              <input type="number" min={1} max={10000} {...register('witnesses')} />
            </label>
          </div>
          <label>
            ข้อสังเกตเพิ่มเติม
            <textarea rows={2} maxLength={2000} {...register('observations')} />
          </label>
          <div className="honeypot" aria-hidden="true">
            <label>
              Website
              <input tabIndex={-1} autoComplete="off" {...register('website')} />
            </label>
          </div>
          <div className="evidence-hint">
            <Upload size={19} />
            <span>
              แนบภาพ เสียง หรือวิดีโอได้หลังเผยแพร่ข้อความ ไฟล์ทุกชิ้นต้องผ่านการตรวจก่อนแสดง
            </span>
          </div>
          <p className="micro">
            ไม่ระบุชื่อจริง เบอร์โทร ที่อยู่ หรือข้อมูลส่วนตัวของผู้อื่น
            กรุณาเคารพพื้นที่ส่วนบุคคลและไม่บุกรุกสถานที่
          </p>
          <Turnstile action="report" onToken={setToken} reset={reset} />
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          <button
            className="button submit-button"
            disabled={isSubmitting || !token || !key}
            type="submit"
          >
            {isSubmitting ? 'กำลังตรวจสอบและเผยแพร่…' : en ? 'Publish sighting' : 'เผยแพร่พิกัดผี'}
            <ArrowUpRight size={18} />
          </button>
          <p className="micro center">
            เรื่องเล่าจากประสบการณ์ส่วนบุคคล ไม่ใช่หลักฐานยืนยันสิ่งเหนือธรรมชาติ
          </p>
        </fieldset>
      </form>
    </main>
  );
}
