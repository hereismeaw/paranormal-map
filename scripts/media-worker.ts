import { ensureBucket, processOneMedia } from '../src/lib/media';
import { setTimeout } from 'node:timers/promises';
await ensureBucket();
let running = true;
process.on('SIGTERM', () => (running = false));
process.on('SIGINT', () => (running = false));
while (running) {
  try {
    if (!(await processOneMedia())) await setTimeout(2000);
  } catch (e) {
    console.error('Media processing deferred:', e instanceof Error ? e.name : 'UnknownError');
    await setTimeout(10000);
  }
}
process.exit(0);
