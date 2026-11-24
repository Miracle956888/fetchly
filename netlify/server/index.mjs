import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getContext, onShutdown } from '@netlify/server';

// Netlify bundles this entry and the explicitly included files together.
// Resolve everything relative to this module, never the runtime cwd.
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
if (process.platform !== 'linux' || process.arch !== 'x64') {
  throw new Error('This experimental Netlify build requires Linux x86-64.');
}

// Set these before importing the API: its configuration is parsed on import.
// Production requires a unique JWT_SECRET and ADMIN_PASSWORD from Netlify's
// Functions-scoped environment. Never fall back to development credentials.
process.env.NODE_ENV = 'production';
process.env.YTDLP_PATH ??= path.join(here, 'bin', 'yt-dlp');
process.env.FFMPEG_PATH ??= path.join(here, 'bin', 'ffmpeg');
process.env.YTDLP_JS_RUNTIME ??= 'node';
process.env.DOWNLOAD_DIR ??= path.join(tmpdir(), 'fetchly', 'downloads');
process.env.TEMP_DIR ??= path.join(tmpdir(), 'fetchly', 'temp');
process.env.MAX_DOWNLOAD_SIZE_MB ??= '50';
process.env.MIN_FREE_DISK_MB ??= '128';
process.env.JOB_CONCURRENCY ??= '1';
process.env.MAX_PENDING_JOBS ??= '3';
process.env.MAX_CONCURRENT_JOBS_PER_IP ??= '1';
process.env.MAX_CONCURRENT_ANALYSES ??= '1';
process.env.DOWNLOAD_TIMEOUT_SECONDS ??= '300';
process.env.PROCESS_TIMEOUT_SECONDS ??= '300';
process.env.DOWNLOAD_EXPIRATION_MINUTES ??= '5';

if (process.env.DATABASE_URL || process.env.REDIS_URL) {
  throw new Error('The Netlify beta uses local temporary state; unset DATABASE_URL and REDIS_URL for this deploy.');
}
for (const binary of [process.env.YTDLP_PATH, process.env.FFMPEG_PATH, path.join(here, 'bin', 'ffprobe')]) {
  if (!existsSync(binary)) throw new Error(`A bundled media engine is missing: ${binary}`);
}

const [appModule, dataModule, queueModule, downloads, storage, cleanup] = await Promise.all([
  import('../../server/dist/app.js'),
  import('../../server/dist/db/index.js'),
  import('../../server/dist/queues/index.js'),
  import('../../server/dist/services/downloadService.js'),
  import('../../server/dist/services/storage.js'),
  import('../../server/dist/workers/cleanup.worker.js'),
]);

storage.ensureDirs();
await dataModule.initDatastore();
const queue = await queueModule.createJobQueue(downloads.processJob);
downloads.bindQueue(queue);
const stopCleanup = cleanup.startCleanupWorker();

// CDN static files take precedence. Express supplies the SPA fallback for
// deep links and JSON 404s for /api without an unsafe catch-all rewrite.
const app = appModule.createApp(path.join(root, 'client', 'dist'), { trustProxy: false });
app.locals.keepBackgroundWorkAlive = (work) => getContext().waitUntil(work);

onShutdown(async ({ drained }) => {
  stopCleanup();
  await drained;
  await queue.shutdown();
});

export default app;
