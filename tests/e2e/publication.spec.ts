import { test, expect } from '@playwright/test';
import { spawnSync } from 'node:child_process';
test.beforeEach(async ({ context }, info) => {
  if (info.title.includes('live vector')) return;
  // Deterministic browser fixtures only. The server still calls Cloudflare Siteverify
  // with official development credentials; production has no mock or bypass.
  await context.route('https://challenges.cloudflare.com/turnstile/v0/api.js*', (route) =>
    route.fulfill({
      contentType: 'application/javascript',
      body: `window.turnstile={render:function(el,o){el.textContent='Cloudflare development test challenge';setTimeout(()=>o.callback('XXXX.DUMMY.TOKEN.XXXX'),50);return 'test-widget'},remove:function(){}};`,
    }),
  );
  await context.route('**/map-style.json', (route) =>
    route.fulfill({
      json: {
        version: 8,
        glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
        sources: {},
        layers: [
          { id: 'background', type: 'background', paint: { 'background-color': '#10131a' } },
        ],
      },
    }),
  );
  await context.route(
    (url) => url.pathname === '/api/geocode',
    (route) =>
      route.fulfill({
        json: { province: 'กรุงเทพมหานคร', district: 'วัฒนา' },
      }),
  );
});
test('home opens on the full map', async ({ page }) => {
  await page.goto('/');
  const map = page.locator('main > .explorer .map-shell');
  await expect(map).toBeVisible();
  const box = await page.locator('main > .explorer').boundingBox();
  expect(box?.y).toBeLessThan(90);
  expect(box?.height).toBeGreaterThan(400);
  await expect(map).toHaveAttribute('data-state', 'ready');
});
test('guest publishes, map updates, admin deletes and restores, and mobile remains usable', async ({
  page,
  context,
}) => {
  const title = 'เสียงกระซิบในคืนทดสอบบราวเซอร์';
  const worker = page.waitForResponse(
    (r) => r.url().endsWith('/vendor/maplibre/maplibre-gl-worker.mjs') && r.status() === 200,
  );
  await page.goto('/explore');
  await worker;
  await expect(page.getByPlaceholder('ค้นหาสถานที่ เรื่องเล่า หรือจังหวัด…')).toBeVisible();
  await page.getByRole('link', { name: 'เพิ่มพิกัดที่เจอผี', exact: true }).click();
  await expect(page).toHaveURL(/\/submit/);
  await expect(
    page.getByRole('heading', { name: 'บางเรื่อง… ไม่ควรเก็บไว้คนเดียว' }),
  ).toBeVisible();
  await expect(page.locator('.map-shell')).toHaveAttribute('data-state', 'ready');
  const canvas = page.locator('canvas.maplibregl-canvas');
  await expect(canvas).toBeVisible();
  await canvas.click({ position: { x: 190, y: 130 } });
  await page.getByLabel('ละติจูด', { exact: true }).fill('13.71234');
  await page.getByLabel('ลองจิจูด', { exact: true }).fill('100.51234');
  await page.getByPlaceholder('เช่น GhostHunter99, Meaw หรือ นักล่าผี').fill('Meaw จากบราวเซอร์');
  await page.getByLabel('จำชื่อเล่นไว้ในเครื่องนี้').check();
  await page.getByLabel('ชื่อเหตุการณ์ *', { exact: true }).fill(title);
  await page
    .getByLabel('รายละเอียด *', { exact: true })
    .fill(
      'เมื่อคืนเดินผ่านลานกว้างและได้ยินเสียงกระซิบข้างหู ทั้งที่ไม่มีใครอยู่ใกล้ จึงลองหยุดฟังสักพัก ก่อนจะเดินกลับทางเดิมอย่างปลอดภัย',
    );
  await page.getByRole('button', { name: 'เผยแพร่พิกัดผี', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'เพิ่มพิกัดลี้ลับสำเร็จ!' })).toBeVisible({
    timeout: 20000,
  });
  await page.getByRole('link', { name: 'ดูพิกัดของฉัน', exact: true }).click();
  await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
  await expect(page.getByText('Meaw จากบราวเซอร์', { exact: true })).toBeVisible();
  const detailURL = page.url();
  const id = detailURL.split('/').pop()!;
  const response = await page.request.get('/api/locations');
  const data = await response.json();
  expect(data.items.some((r: { id: string }) => r.id === id)).toBe(true);
  await page.goto('/explore');
  await page
    .getByRole('button')
    .filter({ has: page.getByRole('heading', { name: title, exact: true }) })
    .click();
  await expect(page.locator('.map-drawer').getByRole('heading', { name: title })).toBeVisible();
  await expect(page.locator('.map-shell')).not.toHaveAttribute('data-rendered-markers', '0');
  await page.screenshot({ path: 'test-results/map-published.png' });
  const observer = await context.newPage();
  await observer.goto('/explore');
  await observer
    .getByRole('button')
    .filter({ has: observer.getByRole('heading', { name: title, exact: true }) })
    .click();
  await expect(observer.locator('.maplibregl-marker')).toHaveCount(1);
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/admin\/login/);
  await page.getByLabel('อีเมล', { exact: true }).fill('browser-admin@example.com');
  await page
    .getByLabel('รหัสผ่าน', { exact: true })
    .fill('browser-test-password-is-not-production');
  await page.getByRole('button', { name: 'เข้าสู่ระบบผู้ดูแล', exact: true }).click();
  await expect(page).toHaveURL(/\/admin$/);
  const report = page.locator('.admin-report').filter({ hasText: title });
  await report.getByRole('button', { name: 'ลบ', exact: true }).click();
  await page.getByLabel('เหตุผล (บันทึกใน audit log)').fill('ลบรายงานสำหรับตรวจสอบ workflow');
  await page.getByRole('button', { name: 'ยืนยัน', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(observer.locator('.report-list').getByRole('heading', { name: title })).toHaveCount(
    0,
    { timeout: 15000 },
  );
  await expect(observer.locator('.maplibregl-marker')).toHaveCount(0);
  await expect(observer.locator('.map-drawer')).toHaveCount(0);
  await observer.close();
  expect(
    (await (await page.request.get('/api/locations')).json()).items.some(
      (r: { id: string }) => r.id === id,
    ),
  ).toBe(false);
  expect((await page.request.get('/api/reports/' + id)).status()).toBe(404);
  await page.goto('/explore');
  await expect(page.locator('.report-list').getByRole('heading', { name: title })).toHaveCount(0);
  await page.goto('/admin/locations');
  await page
    .locator('.admin-report')
    .filter({ hasText: title })
    .getByRole('button', { name: 'กู้คืน', exact: true })
    .click();
  await page.getByLabel('เหตุผล (บันทึกใน audit log)').fill('ตรวจแล้วกู้คืนรายงานทดสอบ');
  await page.getByRole('button', { name: 'ยืนยัน', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(
    (await (await page.request.get('/api/locations')).json()).items.some(
      (r: { id: string }) => r.id === id,
    ),
  ).toBe(true);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/explore');
  await expect(page.getByRole('link', { name: 'เพิ่มพิกัดที่เจอผี', exact: true })).toBeVisible();
  await page.screenshot({ path: 'test-results/mobile-map.png' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await context.grantPermissions(['geolocation']);
  await context.setGeolocation({ latitude: 13.7563, longitude: 100.5018 });
  await page.goto('/radar');
  await expect(page.getByRole('heading', { name: 'เรื่องผีรอบๆ ตัวคุณ' })).toBeVisible();
  const nearby = page.waitForRequest((request) => {
    const url = new URL(request.url());
    return (
      url.pathname === '/api/locations' &&
      url.searchParams.get('lat') === '13.7563' &&
      url.searchParams.get('lng') === '100.5018'
    );
  });
  await page.getByRole('button', { name: 'ใช้ตำแหน่งของฉัน' }).click();
  await nearby;
  await expect(page.locator('.map-shell')).toHaveAttribute('data-state', 'ready');
  await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
  await page.goto('/submit');
  await expect(page.getByPlaceholder('เช่น GhostHunter99, Meaw หรือ นักล่าผี')).toHaveValue(
    'Meaw จากบราวเซอร์',
  );
  await page.getByRole('button', { name: 'ล้างชื่อที่บันทึก' }).click();
  expect(await page.evaluate(() => localStorage.getItem('pa_nickname'))).toBeNull();
});

// Opt-in smoke test: this checks the real licensed tile provider rather than a fixture.
test('live vector basemap and fictional demo preview', async ({ page }) => {
  test.skip(process.env.LIVE_MAP_TEST !== 'true', 'External tile-provider smoke test is opt-in');
  const seeded = spawnSync(process.execPath, ['--import', 'tsx', 'scripts/seed.ts'], {
    env: { ...process.env, DATABASE_URL: process.env.E2E_DATABASE_URL },
    stdio: 'inherit',
  });
  expect(seeded.status).toBe(0);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/explore');
  await expect(page.locator('.map-shell')).toHaveAttribute('data-state', 'ready', {
    timeout: 45000,
  });
  await expect(
    page.locator('.report-list .report-card').filter({ hasText: 'เรื่องสมมติ' }),
  ).toHaveCount(20);
  await expect(page.locator('.map-error')).toHaveCount(0);
  await expect(page.locator('.map-shell')).not.toHaveAttribute('data-rendered-markers', '0', {
    timeout: 20000,
  });
  await page.screenshot({ path: 'test-results/live-map.png' });
  await page.goto('/');
  await expect(page.locator('.map-shell')).toHaveAttribute('data-state', 'ready', {
    timeout: 45000,
  });
  await expect(page.locator('.map-shell')).not.toHaveAttribute('data-rendered-markers', '0', {
    timeout: 20000,
  });
  await page.screenshot({
    path: 'test-results/live-home.png',
    animations: 'disabled',
    timeout: 15000,
  });
});
