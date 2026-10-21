import { defineConfig, devices } from '@playwright/test';
try {
  process.loadEnvFile('.env');
} catch {}
const url = new URL(
  process.env.DATABASE_URL || 'postgres://paranormal:local@127.0.0.1:5432/paranormal',
);
url.pathname = '/paranormal_e2e';
const cache = new URL(process.env.REDIS_URL || 'redis://127.0.0.1:6379');
cache.pathname = '/14';
const testEnv = {
  ...process.env,
  DATABASE_URL: url.toString(),
  REDIS_URL: cache.toString(),
  NODE_ENV: 'development',
  BETTER_AUTH_URL: 'http://localhost:3100',
  NEXT_PUBLIC_APP_URL: 'http://localhost:3100',
  TURNSTILE_HOSTNAME: '',
  TURNSTILE_CHECK_ACTION: 'false',
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: '1x00000000000000000000AA',
  TURNSTILE_SECRET_KEY: '1x0000000000000000000000000000000AA',
  TRUST_PROXY: 'false',
};
process.env.E2E_DATABASE_URL = url.toString();
export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 90000,
  globalSetup: './tests/e2e/setup.ts',
  use: {
    baseURL: 'http://localhost:3100',
    reducedMotion: 'reduce',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    ...devices['Desktop Chrome'],
    launchOptions: {
      args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
    },
  },
  webServer: {
    command:
      'node scripts/sync-map-assets.mjs && node node_modules/next/dist/bin/next dev --hostname 127.0.0.1 --port 3100',
    url: 'http://localhost:3100/',
    env: testEnv,
    reuseExistingServer: false,
    timeout: 120000,
  },
});
