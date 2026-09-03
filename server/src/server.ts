import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { initDatastore } from './db/index.js';
import { createJobQueue } from './queues/index.js';
import { bindQueue, processJob } from './services/downloadService.js';
import { ensureDirs } from './services/storage.js';
import { startCleanupWorker } from './workers/cleanup.worker.js';

async function main(): Promise<void> {
  ensureDirs();
  await initDatastore();

  const app = createApp();
  const queue = await createJobQueue(processJob);
  bindQueue(queue);
  const stopCleanup = startCleanupWorker();

  const server = app.listen(env.PORT, '0.0.0.0', () => {
    logger.info(
      { port: env.PORT, env: env.NODE_ENV, clientUrl: env.CLIENT_URL },
      'Fetchly API listening',
    );
  });

  const shutdown = (signal: string): void => {
    logger.info({ signal }, 'Shutting down');
    stopCleanup();
    server.close(() => {
      queue.shutdown().finally(() => process.exit(0));
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  logger.fatal({ err }, 'Failed to start API server');
  process.exit(1);
});
