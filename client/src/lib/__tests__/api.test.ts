import { afterEach, describe, expect, it, vi } from 'vitest';
import { api, ApiClientError } from '../api';

const json = (data: unknown, status = 200): Response =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });

const result = {
  id: 'analysis-1', platform: 'youtube', title: 'Example', duration: 1,
  thumbnail: null, uploader: null, webpageUrl: 'https://youtube.com/watch?v=test', formats: [],
};

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('API client', () => {
  it('keeps the existing synchronous endpoint when the Netlify flag is absent', async () => {
    vi.stubEnv('VITE_ASYNC_ANALYSIS', 'false');
    const fetchMock = vi.fn().mockResolvedValue(json({ success: true, data: result }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(api.analyze(result.webpageUrl)).resolves.toEqual(result);
    expect(fetchMock.mock.calls[0][0]).toBe('/api/v1/media/analyze');
  });

  it('polls a background analysis until it is ready', async () => {
    vi.stubEnv('VITE_ASYNC_ANALYSIS', 'true');
    vi.useFakeTimers();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(json({ success: true, data: { taskId: 'task-1' } }, 202))
      .mockResolvedValueOnce(json({ success: true, data: { status: 'pending' } }))
      .mockResolvedValueOnce(json({ success: true, data: { status: 'ready', result } }));
    vi.stubGlobal('fetch', fetchMock);
    const task = api.analyze(result.webpageUrl);
    await vi.advanceTimersByTimeAsync(1000);
    await vi.advanceTimersByTimeAsync(1000);
    await expect(task).resolves.toEqual(result);
    expect(fetchMock.mock.calls.map((call) => call[0])).toEqual([
      '/api/v1/media/analysis', '/api/v1/media/analysis/task-1', '/api/v1/media/analysis/task-1',
    ]);
  });

  it('cancels a task even when the URL changes before the start response arrives', async () => {
    vi.stubEnv('VITE_ASYNC_ANALYSIS', 'true');
    let finish!: (response: Response) => void;
    const fetchMock = vi.fn()
      .mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }))
      .mockResolvedValueOnce(json({ success: true }));
    vi.stubGlobal('fetch', fetchMock);
    const controller = new AbortController();
    const task = api.analyze(result.webpageUrl, controller.signal);
    controller.abort();
    finish(json({ success: true, data: { taskId: 'task-2' } }, 202));
    await expect(task).rejects.toMatchObject({ name: 'AbortError' });
    expect(fetchMock.mock.calls[1][0]).toBe('/api/v1/media/analysis/task-2');
    expect(fetchMock.mock.calls[1][1]).toMatchObject({ method: 'DELETE' });
  });

  it('treats an HTML SPA fallback as an API error instead of success', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('<html>not the API</html>', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(api.platforms()).rejects.toBeInstanceOf(ApiClientError);
  });
});
