import { ImageResponse } from 'next/og';
export const alt = 'Paranormal Activity — Every Place Has a Story.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export default function Image() {
  return new ImageResponse(
    <div
      style={{
        display: 'flex',
        width: '100%',
        height: '100%',
        background: '#08090D',
        padding: 90,
        flexDirection: 'column',
        justifyContent: 'center',
        border: '2px solid #303641',
      }}
    >
      <span style={{ color: '#9DFFB0', fontSize: 22, letterSpacing: 8 }}>
        แผนที่เรื่องผีจากคนเจอ
      </span>
      <h1 style={{ fontSize: 88, color: '#F1F2F0', lineHeight: 1.05 }}>
        PARANORMAL
        <br />
        ACTIVITY
      </h1>
      <span style={{ fontSize: 30, color: '#9EA6B3' }}>Every Place Has a Story.</span>
    </div>,
    { ...size },
  );
}
