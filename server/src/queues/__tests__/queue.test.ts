import { afterAll, describe, expect, it, vi } from 'vitest';
import { env } from '../../config/env.js';
import { createJobQueue } from '../index.js';

const original = {
  REDIS_URL: env.REDIS_URL,
  JOB_CONCURRENCY: env.JOB_CONCURRENCY,
  MAX_PENDING_JOBS: env.MAX_PENDING_JOBS,
};
afterAll(() => Object.assign(env, original));

describe('local queue admission', () => {
  it('respects worker concurrency and rejects an overfull pending queue', async () => {
    env.REDIS_URL = undefined;
    env.JOB_CONCURRENCY = 1;
    env.MAX_PENDING_JOBS = 2;
    const started: string[] = [];
    const releases: Array<() => void> = [];
    const queue = await createJobQueue(async (id) => {
      started.push(id);
      await new Promise<void>((resolve) => releases.push(resolve));
    });
    try {
      await queue.enqueue('one');
      await vi.waitFor(() => expect(started).toEqual(['one']));
      await queue.enqueue('two');
      await queue.enqueue('three');
      await expect(queue.enqueue('four')).rejects.toMatchObject({ code: 'JOB_LIMIT_REACHED' });
      expect(started).toEqual(['one']);
      releases[0]();
      await vi.waitFor(() => expect(started).toEqual(['one', 'two']));
      releases[1]();
      await vi.waitFor(() => expect(started).toEqual(['one', 'two', 'three']));
      releases[2]();
    } finally {
      for (const release of releases) release();
      await queue.shutdown();
    }
    await expect(queue.enqueue('after-shutdown')).rejects.toMatchObject({ code: 'SERVER_ERROR' });
  });
});
