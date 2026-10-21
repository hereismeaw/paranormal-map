import { ApiError } from './http';
import { redis } from './security';
import { isInThailand } from './thailand';

function pick(address: Record<string, string>, keys: string[]) {
  for (const key of keys) {
    const value = address[key]?.trim();
    if (value) return value;
  }
  return '';
}
function strip(value: string, prefixes: string[]) {
  let text = value.trim();
  for (const prefix of prefixes) {
    if (text.startsWith(prefix)) text = text.slice(prefix.length).trim();
  }
  return text;
}
export function thaiAddress(address: Record<string, string>) {
  const blob = [address.state, address.province, address.city].filter(Boolean).join(' ');
  const bangkok = /กรุงเทพ|bangkok/i.test(blob);
  const province = strip(
    pick(address, bangkok ? ['state', 'province', 'city'] : ['state', 'province']) ||
      (bangkok ? 'กรุงเทพมหานคร' : ''),
    ['จังหวัด'],
  );
  const district = strip(
    pick(
      address,
      bangkok
        ? ['city_district', 'district', 'suburb', 'county']
        : ['county', 'state_district', 'municipality', 'city_district', 'town', 'suburb'],
    ),
    ['อำเภอ', 'เขต', 'แขวง'],
  );
  return { province, district };
}
export async function reverseAddress(lat: number, lng: number) {
  if (!isInThailand(lat, lng)) throw new ApiError(400, 'ตอนนี้รับเรื่องเล่าเฉพาะพิกัดในประเทศไทย');
  // Only send an approximate point to the external provider; never forward guest identity.
  const latitude = lat.toFixed(3);
  const longitude = lng.toFixed(3);
  const key = `address:th:v2:${latitude}:${longitude}`;
  const cache = redis();
  const saved = await cache.get(key);
  if (saved) return JSON.parse(saved) as { province: string; district: string };
  // Shared across app instances: respect the public provider's one-request-per-second limit.
  if (!(await cache.set('address:provider:lock', '1', 'PX', 1100, 'NX')))
    throw new ApiError(429, 'กำลังค้นหาที่อยู่ กรุณาลองอีกครั้ง', 2);
  const url = new URL(
    '/reverse',
    process.env.GEOCODER_URL || 'https://nominatim.openstreetmap.org',
  );
  url.search = new URLSearchParams({
    format: 'jsonv2',
    lat: latitude,
    lon: longitude,
    zoom: '12',
    addressdetails: '1',
    'accept-language': 'th',
  }).toString();
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'ParanormalMap/1.0 (https://github.com/hereismeaw/paranormal-map)' },
      signal: AbortSignal.timeout(6000),
    });
    if (!response.ok) throw new Error('Geocoder unavailable');
    const result = (await response.json()) as { address?: Record<string, string> };
    const a = result.address;
    if (!a || a.country_code !== 'th') throw new Error('No Thai address');
    const address = thaiAddress(a);
    await cache.set(key, JSON.stringify(address), 'EX', 604800);
    return address;
  } catch {
    throw new ApiError(503, 'ค้นหาที่อยู่อัตโนมัติไม่ได้ กรุณากรอกจังหวัดและอำเภอเอง');
  }
}
