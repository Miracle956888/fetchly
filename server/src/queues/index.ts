import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import type { BackgroundWorkTracker } from '../utils/background.js';
import { ApiError } from '../utils/errors.js';

/**
 * Job queue boundary. Production uses BullMQ + Redis; when REDIS_URL is not
 * configured (local dev) a small in-process FIFO with the same semantics is
 * used instead. Selection is logged at boot.
 */
export interface JobQueue {
  readonly kind: 'bullmq' | 'local';
  enqueue(jobId: string, trackWork?: BackgroundWorkTracker): Promise<void>;
  shutdown(): Promise<void>;
}

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
    { connection, concurrency: env.JOB_CONCURRENCY },
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
  const pending: Array<{ jobId: string; finish: () => void }> = [];
  let running = 0;
  let stopped = false;

  const pump = (): void => {
    while (!stopped && running < env.JOB_CONCURRENCY && pending.length > 0) {
      const { jobId, finish } = pending.shift()!;
      running += 1;
      // Also catch a handler that throws before returning a promise.
      Promise.resolve().then(() => handler(jobId))
        .catch((err) => logger.error({ jobId, err }, 'Local queue job crashed'))
        .finally(() => {
          running -= 1;
          finish();
          setImmediate(pump);
        });
    }
  };

  logger.warn('REDIS_URL not set — using in-process queue (dev only; use Redis + BullMQ in production)');
  return {
    kind: 'local',
    async enqueue(jobId, trackWork) {
      if (stopped) throw new ApiError('SERVER_ERROR', 'The download queue is stopping.');
      if (pending.length >= env.MAX_PENDING_JOBS) {
        throw new ApiError('JOB_LIMIT_REACHED', 'The download queue is full. Please try again shortly.');
      }
      let finish = (): void => undefined;
      if (trackWork) {
        // Include time waiting in the queue as well as the running job. The
        // host can keep the instance alive until this promise settles.
        const completion = new Promise<void>((resolve) => { finish = resolve; });
        trackWork(completion);
      }
      pending.push({ jobId, finish });
      setImmediate(pump);
    },
    async shutdown() {
      stopped = true;
      for (const item of pending.splice(0)) item.finish();
    },
  };
}

export async function createJobQueue(handler: (jobId: string) => Promise<void>): Promise<JobQueue> {
  if (env.REDIS_URL) {
    try {
      return await createBullQueue(handler);
    } catch (err) {
      logger.error({ err }, 'Redis unavailable — falling back to in-process queue (dev only)');
    }
  }
  return createLocalQueue(handler);
}
