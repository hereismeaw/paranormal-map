'use client';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="not-found">
      <h1>สัญญาณขาดหายชั่วคราว</h1>
      <p>เชื่อมต่อข้อมูลไม่ได้ กรุณาลองใหม่อีกครั้ง</p>
      <button className="button" onClick={reset}>
        ลองใหม่
      </button>
    </main>
  );
}
