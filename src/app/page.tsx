import { Home } from '@/components/home';
import Link from 'next/link';
export default function Page() {
  return (
    <>
      <Home />
      <footer>
        <Link href="/">PARANORMAL ACTIVITY</Link>
        <span>Every Place Has a Story.</span>
        <Link href="/admin">สำหรับผู้ดูแล</Link>
        <a href="https://github.com/hereismeaw/paranormal-map" target="_blank" rel="noreferrer">
          GitHub ↗
        </a>
        <p>
          เรื่องเล่าจากประสบการณ์ส่วนบุคคล ไม่ใช่ข้อเท็จจริงที่ยืนยันแล้ว ·
          ไม่สนับสนุนการบุกรุกสถานที่
        </p>
      </footer>
    </>
  );
}
