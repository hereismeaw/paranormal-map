'use client';
import Script from 'next/script';
import { useEffect, useRef, useState } from 'react';
type Turnstile = {
  render: (el: HTMLElement, options: Record<string, unknown>) => string;
  remove: (id: string) => void;
};
declare global {
  interface Window {
    turnstile?: Turnstile;
  }
}
export function Turnstile({
  action,
  onToken,
  reset = 0,
}: {
  action: string;
  onToken: (token: string) => void;
  reset?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const callback = useRef(onToken);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    callback.current = onToken;
  }, [onToken]);
  useEffect(() => {
    if (!loaded || !ref.current || !window.turnstile) return;
    callback.current('');
    const id = window.turnstile.render(ref.current, {
      sitekey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
      theme: 'dark',
      action,
      callback: (t: string) => callback.current(t),
      'expired-callback': () => callback.current(''),
      'error-callback': () => callback.current(''),
    });
    return () => {
      window.turnstile?.remove(id);
    };
  }, [loaded, action, reset]);
  if (!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY)
    return (
      <p className="error" role="alert">
        ยังไม่ได้ตั้งค่าระบบยืนยันความปลอดภัย กรุณาติดต่อผู้ดูแล
      </p>
    );
  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        onReady={() => setLoaded(true)}
      />
      <div ref={ref} className="turnstile" />
    </>
  );
}
