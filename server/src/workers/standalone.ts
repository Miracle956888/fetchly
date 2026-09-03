/**
 * Standalone worker process for production deployments:
 *   npm run worker
 * Runs the BullMQ download worker + cleanup worker separately from the API
 * server, so FFmpeg processing never competes with request handling.
 */
import { initDatastore } from '../db/index.js';
import { logger } from '../config/logger.js';
import { createJobQueue } from '../queues/index.js';
import { bindQueue, processJob } from '../services/downloadService.js';
import { startCleanupWorker } from './cleanup.worker.js';

async function main(): Promise<void> {
  await initDatastore();
  const queue = await createJobQueue(processJob);
  bindQueue(queue); // only used if this process also accepts retry requests
  startCleanupWorker();
  logger.info({ queue: queue.kind }, 'Standalone worker running');

  const shutdown = async (): Promise<void> => {
    logger.info('Worker shutting down');
    await queue.shutdown();
    process.exit(0);
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch((err) => {
  logger.fatal({ err }, 'Worker failed to start');
  process.exit(1);
});
