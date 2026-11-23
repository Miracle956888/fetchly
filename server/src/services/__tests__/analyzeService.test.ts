import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { env } from '../../config/env.js';
import { initDatastore } from '../../db/index.js';
import { requireProvider } from '../../providers/registry.js';
import { analyzeUrl } from '../analyzeService.js';

const originalLimit = env.MAX_CONCURRENT_ANALYSES;
const url = 'https://www.youtube.com/watch?v=test';
const payload = {
  info: {
    id: 'test', platform: 'youtube', title: 'Test', duration: 1,
    thumbnail: null, uploader: null, webpageUrl: url,
    formats: [{ id: 'v720', kind: 'video' as const, container: 'mp4' as const, quality: '720p' }],
  },
  plans: { v720: { kind: 'video' as const, container: 'mp4' as const, selector: 'best' } },
};

beforeAll(async () => {
  env.MAX_CONCURRENT_ANALYSES = 1;
  await initDatastore();
});
afterAll(() => {
  env.MAX_CONCURRENT_ANALYSES = originalLimit;
  vi.restoreAllMocks();
});

describe('analysis admission', () => {
  it('bounds concurrent probes and frees the slot on both success and failure', async () => {
    const provider = requireProvider(url).provider;
    let release!: (value: typeof payload) => void;
    const mock = vi.spyOn(provider, 'analyzeWithPlans').mockImplementationOnce(
      () => new Promise((resolve) => { release = resolve; }),
    );
    const first = analyzeUrl(url);
    await vi.waitFor(() => expect(mock).toHaveBeenCalledOnce());
    await expect(analyzeUrl(url)).rejects.toMatchObject({ code: 'JOB_LIMIT_REACHED' });
    release(payload);
    expect((await first).info.title).toBe('Test');

    mock.mockRejectedValueOnce(new Error('extractor failed'));
    await expect(analyzeUrl(url)).rejects.toThrow('extractor failed');
    mock.mockResolvedValueOnce(payload);
    await expect(analyzeUrl(url)).resolves.toMatchObject({ info: { title: 'Test' } });
  });
});
