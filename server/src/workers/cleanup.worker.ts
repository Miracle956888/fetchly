import { logger } from '../config/logger.js';
import { expireStaleJobs } from '../services/downloadService.js';
import { cleanupFiles } from '../services/storage.js';

/**
 * Periodic cleanup: expires completed jobs, deletes expired deliverables and
 * stale temp files. Runs in the API process in dev; in production it can run
 * in the standalone worker process (workers/standalone.ts).
 */
const INTERVAL_MS = 5 * 60_000;

export function startCleanupWorker(): () => void {
  const timer = setInterval(async () => {
    try {
      const expiredJobs = await expireStaleJobs();
      const files = await cleanupFiles();
      if (expiredJobs || files.expiredDownloads || files.staleTempFiles) {
        logger.info(
          { expiredJobs, ...files },
          'Cleanup pass completed',
        );
      }
    } catch (err) {
      logger.error({ err }, 'Cleanup pass failed');
    }
  }, INTERVAL_MS);
  timer.unref();
  logger.info({ intervalMs: INTERVAL_MS }, 'Cleanup worker started');
  return () => clearInterval(timer);
}
