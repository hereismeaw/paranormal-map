import Link from 'next/link';
export default function NotFound() {
  return (
    <main className="not-found">
      <div className="eyebrow">404 / NO SIGNAL</div>
      <h1>เรื่องเล่านี้… หายไปแล้ว</h1>
      <p>อาจไม่มีพิกัดนี้ หรือรายงานถูกนำออกจากพื้นที่สาธารณะ</p>
      <Link href="/explore" className="button">
        กลับไปสำรวจแผนที่ ↗
      </Link>
    </main>
  );
}
