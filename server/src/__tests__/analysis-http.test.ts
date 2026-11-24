import type { Express } from 'express';
import type { Server } from 'node:http';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createApp } from '../app.js';
import { initDatastore } from '../db/index.js';
import { requireProvider } from '../providers/registry.js';
import type { CancellationFlag } from '../services/engine/process.js';
import { ApiError } from '../utils/errors.js';

const url = 'https://www.youtube.com/watch?v=abcdefghijk';
const payload = {
  info: {
    id: 'source-id', platform: 'youtube', title: 'Example', duration: 10,
    thumbnail: null, uploader: null, webpageUrl: url,
    formats: [{ id: 'v720', kind: 'video' as const, container: 'mp4' as const, quality: '720p', converted: false }],
  },
  plans: { v720: { kind: 'video' as const, container: 'mp4' as const, selector: 'best' } },
};
let app: Express;
let server: Server;
let origin: string;
const tracked: Array<Promise<void>> = [];

beforeAll(async () => {
  await initDatastore();
  app = createApp(undefined, { trustProxy: false });
  app.locals.keepBackgroundWorkAlive = (work: Promise<void>) => tracked.push(work);
  server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Expected TCP address');
  origin = `http://127.0.0.1:${address.port}`;
});

afterAll(async () => {
  vi.restoreAllMocks();
  await new Promise<void>((resolve, reject) => server.close((err) => err ? reject(err) : resolve()));
});

async function start(): Promise<{ taskId: string }> {
  const response = await fetch(`${origin}/api/v1/media/analysis`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ url }), signal: AbortSignal.timeout(3000),
  });
  expect(response.status).toBe(202);
  expect(response.headers.get('cache-control')).toBe('no-store');
  return (await response.json() as { data: { taskId: string } }).data;
}

describe('background analysis over HTTP', () => {
  it('returns before a slow probe finishes and then exposes the result', async () => {
    expect(app.get('trust proxy')).toBe(false);
    let finish!: (value: typeof payload) => void;
    const provider = requireProvider(url).provider;
    const spy = vi.spyOn(provider, 'analyzeWithPlans').mockImplementationOnce(
      () => new Promise((resolve) => { finish = resolve; }),
    );
    const before = tracked.length;
    const { taskId } = await start();
    await vi.waitFor(() => expect(spy).toHaveBeenCalledOnce());
    expect(tracked).toHaveLength(before + 1);
    const pending = await fetch(`${origin}/api/v1/media/analysis/${taskId}`);
    expect(await pending.json()).toMatchObject({ data: { status: 'pending' } });
    finish(payload);
    await tracked[before];
    const ready = await fetch(`${origin}/api/v1/media/analysis/${taskId}`);
    expect(await ready.json()).toMatchObject({
      success: true, data: { status: 'ready', result: { title: 'Example', formats: [{ quality: '720p' }] } },
    });
    spy.mockRestore();
  });

  it('reports safe source errors from the background probe', async () => {
    const spy = vi.spyOn(requireProvider(url).provider, 'analyzeWithPlans').mockRejectedValueOnce(
      new ApiError('SOURCE_UNAVAILABLE', 'The source requested bot verification.'),
    );
    const before = tracked.length;
    const { taskId } = await start();
    await tracked[before];
    const response = await fetch(`${origin}/api/v1/media/analysis/${taskId}`);
    expect(response.status).toBe(502);
    expect(await response.json()).toMatchObject({
      success: false, error: { code: 'SOURCE_UNAVAILABLE', message: 'The source requested bot verification.' },
    });
    spy.mockRestore();
  });

  it('cancels a pending probe and drops the task', async () => {
    let finish!: (value: typeof payload) => void;
    let cancellation: CancellationFlag | undefined;
    const spy = vi.spyOn(requireProvider(url).provider, 'analyzeWithPlans').mockImplementationOnce(
      (_url, signal) => {
        cancellation = signal;
        return new Promise((resolve) => { finish = resolve; });
      },
    );
    const before = tracked.length;
    const { taskId } = await start();
    await vi.waitFor(() => expect(spy).toHaveBeenCalledOnce());
    expect((await fetch(`${origin}/api/v1/media/analysis/${taskId}`, { method: 'DELETE' })).status).toBe(200);
    expect(cancellation?.cancelled).toBe(true);
    finish(payload);
    await tracked[before];
    const response = await fetch(`${origin}/api/v1/media/analysis/${taskId}`);
    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({ error: { code: 'NOT_FOUND' } });
    spy.mockRestore();
  });
});
