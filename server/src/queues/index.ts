import { env, isProd } from '../config/env.js';
import { logger } from '../config/logger.js';

/**
 * Job queue boundary. Production uses BullMQ + Redis; when REDIS_URL is not
 * configured (local dev) a small in-process FIFO with the same semantics is
 * used instead. Selection is logged at boot.
 */
export interface JobQueue {
  readonly kind: 'bullmq' | 'local';
  enqueue(jobId: string): Promise<void>;
  shutdown(): Promise<void>;
}

const CONCURRENCY = 2;
const QUEUE_NAME = 'downloads';

async function createBullQueue(handler: (jobId: string) => Promise<void>): Promise<JobQueue> {
  const { Queue, Worker } = await import('bullmq');
  const connection = { url: env.REDIS_URL! };
  const queue = new Queue(QUEUE_NAME, { connection });
  const worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      await handler(job.id ?? '');
    },
    { connection, concurrency: CONCURRENCY },
  );
  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, 'Queue job crashed');
  });
  logger.info('Queue: BullMQ + Redis');
  return {
    kind: 'bullmq',
    async enqueue(jobId) {
      await queue.add('download', {}, { jobId, removeOnComplete: true, removeOnFail: true });
    },
    async shutdown() {
      await worker.close();
      await queue.close();
    },
  };
}

function createLocalQueue(handler: (jobId: string) => Promise<void>): JobQueue {
  const pending: string[] = [];
  let running = 0;
  let stopped = false;

  const pump = async (): Promise<void> => {
    while (!stopped && running < CONCURRENCY && pending.length > 0) {
      const jobId = pending.shift()!;
      running += 1;
      handler(jobId)
        .catch((err) => logger.error({ jobId, err }, 'Local queue job crashed'))
        .finally(() => {
          running -= 1;
          setImmediate(pump);
        });
    }
  };

  logger.warn('REDIS_URL not set — using in-process queue (dev only; use Redis + BullMQ in production)');
  return {
    kind: 'local',
    async enqueue(jobId) {
      if (stopped) return;
      pending.push(jobId);
      setImmediate(pump);
    },
    async shutdown() {
      stopped = true;
    },
  };
}

export async function createJobQueue(handler: (jobId: string) => Promise<void>): Promise<JobQueue> {
  if (env.REDIS_URL) {
    try {
      return await createBullQueue(handler);
    } catch (err) {
      // Same reasoning as the datastore: an in-process queue in production
      // means queued jobs vanish on restart and cannot be picked up by a
      // separate worker process or a second API instance.
      if (isProd && !env.ALLOW_EPHEMERAL_STORAGE) {
        logger.fatal(
          { err },
          'Redis unavailable. Refusing to start in production: set ALLOW_EPHEMERAL_STORAGE=true only if you accept an in-process queue.',
        );
        throw err instanceof Error ? err : new Error('Redis unavailable');
      }
      logger.error({ err }, 'Redis unavailable — falling back to in-process queue (dev only)');
    }
  } else if (isProd && !env.ALLOW_EPHEMERAL_STORAGE) {
    // env.ts already rejects this combination at boot; kept as a hard stop in
    // case the queue is constructed outside the normal server entrypoint.
    throw new Error('REDIS_URL is required in production');
  }
  return createLocalQueue(handler);
}
