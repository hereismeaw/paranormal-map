import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isInThailand } from '../src/lib/thailand';
import { inThailandView } from '../src/lib/thailand-bounds';
import { thaiAddress } from '../src/lib/geocoding';

const cache = vi.hoisted(() => ({ store: new Map<string, string>() }));
vi.mock('../src/lib/security', () => ({
  redis: () => ({
    get: async (key: string) => cache.store.get(key) ?? null,
    set: async (key: string, value: string, ...args: unknown[]) => {
      if (args.includes('NX') && cache.store.has(key)) return null;
      cache.store.set(key, value);
      return 'OK';
    },
  }),
}));

describe('Thailand coverage', () => {
  it('accepts provinces, islands and a Bangkok point', () => {
    for (const [lat, lng] of [
      [13.7563, 100.5018],
      [18.7883, 98.9853],
      [7.8804, 98.3923],
      [6.489, 99.305],
    ])
      expect(isInThailand(lat, lng)).toBe(true);
  });
  it('rejects neighbouring countries and the open sea', () => {
    for (const [lat, lng] of [
      [40.7128, -74.006],
      [1.3521, 103.8198],
      [17.9757, 102.6331],
      [9.5, 97.0],
    ])
      expect(isInThailand(lat, lng)).toBe(false);
  });
  it('uses a padded view box for the map without treating it as the legal border', () => {
    expect(inThailandView(13.75, 100.5)).toBe(true);
    expect(inThailandView(40.71, -74)).toBe(false);
  });
});

describe('Thai reverse-geocoded address labels', () => {
  it('strips จังหวัด and อำเภอ prefixes', () => {
    expect(
      thaiAddress({
        country_code: 'th',
        state: 'จังหวัดเชียงใหม่',
        county: 'อำเภอเมืองเชียงใหม่',
      }),
    ).toEqual({ province: 'เชียงใหม่', district: 'เมืองเชียงใหม่' });
  });
  it('uses Bangkok district names instead of amphoe', () => {
    expect(
      thaiAddress({
        country_code: 'th',
        city: 'กรุงเทพมหานคร',
        city_district: 'เขตคลองเตย',
        suburb: 'แขวงคลองตัน',
      }),
    ).toEqual({ province: 'กรุงเทพมหานคร', district: 'คลองเตย' });
  });
});

describe('reverse geocoding lookup', () => {
  beforeEach(() => {
    cache.store.clear();
    vi.unstubAllGlobals();
  });
  it('asks the provider only for Thai points and caches the answer', async () => {
    const { reverseAddress } = await import('../src/lib/geocoding');
    const fetchMock = vi.fn(async () =>
      Response.json({
        address: {
          country_code: 'th',
          state: 'จังหวัดกรุงเทพมหานคร',
          city_district: 'เขตพระนคร',
        },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);
    await expect(reverseAddress(40.71, -74.0)).rejects.toMatchObject({ status: 400 });
    expect(fetchMock).not.toHaveBeenCalled();
    await expect(reverseAddress(13.756, 100.502)).resolves.toEqual({
      province: 'กรุงเทพมหานคร',
      district: 'พระนคร',
    });
    await expect(reverseAddress(13.756, 100.502)).resolves.toEqual({
      province: 'กรุงเทพมหานคร',
      district: 'พระนคร',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
