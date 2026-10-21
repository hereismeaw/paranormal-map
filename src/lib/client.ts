export async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch('/api/' + path, {
    ...options,
    headers: {
      ...(typeof options?.body === 'string' ? { 'Content-Type': 'application/json' } : {}),
      ...options?.headers,
    },
    cache: 'no-store',
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'เชื่อมต่อไม่สำเร็จ');
  return data as T;
}
export function share(url: string, title: string) {
  return navigator.share ? navigator.share({ url, title }) : navigator.clipboard.writeText(url);
}
export const thaiDate = (date: string) =>
  new Date(date).toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Bangkok',
  });
