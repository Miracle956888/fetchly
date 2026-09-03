import { beforeEach, describe, expect, it } from 'vitest';
import { MemoryDatastore } from '../memory.js';

const makeJob = (id: string, overrides: Partial<Parameters<MemoryDatastore['createJob']>[0]> = {}) => ({
  id,
  ipKey: 'ip-1',
  sourceUrl: 'https://www.youtube.com/watch?v=x',
  platform: 'youtube',
  title: `Video ${id}`,
  thumbnailUrl: null,
  format: 'mp4',
  quality: '720p',
  expiresMinutes: 30,
  ...overrides,
});

describe('MemoryDatastore', () => {
  let store: MemoryDatastore;
  beforeEach(() => {
    store = new MemoryDatastore();
  });

  it('creates jobs with QUEUED status and computed expiry', async () => {
    const job = await store.createJob(makeJob('j1'));
    expect(job.status).toBe('QUEUED');
    expect(job.expiresAt!.getTime()).toBeGreaterThan(Date.now());
  });

  it('filters and counts jobs', async () => {
    await store.createJob(makeJob('a'));
    await store.createJob(makeJob('b', { ipKey: 'ip-2' }));
    await store.updateJob('a', { status: 'DOWNLOADING' });
    await store.updateJob('b', { status: 'QUEUED' });

    expect(await store.countActiveJobsForIp('ip-1')).toBe(1);
    expect(await store.countActiveJobsForIp('ip-2')).toBe(1);

    const active = await store.listJobs({ status: 'QUEUED' });
    expect(active.total).toBe(1);
    expect(active.items[0].id).toBe('b');
  });

  it('searches by title and paginates', async () => {
    for (let i = 0; i < 30; i++) {
      await store.createJob(makeJob(`job-${i}`, { title: i % 2 === 0 ? 'Alpha talk' : 'Beta song' }));
    }
    const found = await store.listJobs({ search: 'alpha', limit: 10, offset: 0 });
    expect(found.total).toBe(15);
    expect(found.items).toHaveLength(10);
  });

  it('aggregates stats without invented numbers', async () => {
    await store.createJob(makeJob('a'));
    await store.createJob(makeJob('b', { format: 'mp3', platform: 'tiktok' }));
    await store.updateJob('a', { status: 'COMPLETED', fileSize: 1234 });
    await store.updateJob('b', { status: 'FAILED', errorCode: 'DOWNLOAD_FAILED' });

    const stats = await store.jobStats();
    expect(stats.total).toBe(2);
    expect(stats.today).toBe(2);
    expect(stats.completed).toBe(1);
    expect(stats.failed).toBe(1);
    expect(stats.bytesProcessed).toBe(1234);
    expect(stats.byPlatform).toEqual(
      expect.arrayContaining([
        { platform: 'youtube', count: 1 },
        { platform: 'tiktok', count: 1 },
      ]),
    );
  });

  it('tracks analytics events and ranks them', async () => {
    await store.track('analyze', 'youtube');
    await store.track('analyze', 'youtube');
    await store.track('download_created', 'youtube');
    const top = await store.topAnalytics(5);
    expect(top[0]).toEqual({ eventType: 'analyze', count: 2 });
  });

  it('seeds the admin once and never overwrites', async () => {
    await store.ensureAdmin('Admin', 'admin@test.dev', 'hash-1');
    await store.ensureAdmin('Admin', 'admin@test.dev', 'hash-2');
    const user = await store.findByEmail('admin@test.dev');
    expect(user?.passwordHash).toBe('hash-1');
  });

  it('toggles platform overrides', async () => {
    await store.setPlatformEnabled('youtube', false);
    expect((await store.getPlatformOverrides()).youtube).toBe(false);
  });
});
