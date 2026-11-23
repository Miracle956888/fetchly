import { randomUUID } from 'node:crypto';
import { access, chmod, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { env } from '../../config/env.js';
import { logger } from '../../config/logger.js';
import { db, initDatastore } from '../../db/index.js';
import { requireProvider } from '../../providers/registry.js';
import { ApiError } from '../../utils/errors.js';
import { bindQueue, cancelJob, createDownload, processJob, retryJob } from '../downloadService.js';
import { ensureDirs, finalPathFor, workDirFor } from '../storage.js';

let root: string;
const original = {
  TEMP_DIR: env.TEMP_DIR,
  DOWNLOAD_DIR: env.DOWNLOAD_DIR,
  YTDLP_PATH: env.YTDLP_PATH,
  FFMPEG_PATH: env.FFMPEG_PATH,
  MAX_DOWNLOAD_SIZE_MB: env.MAX_DOWNLOAD_SIZE_MB,
  DOWNLOAD_TIMEOUT_SECONDS: env.DOWNLOAD_TIMEOUT_SECONDS,
  PROCESS_TIMEOUT_SECONDS: env.PROCESS_TIMEOUT_SECONDS,
};

beforeAll(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), 'fetchly-pipeline-test-'));
  env.TEMP_DIR = path.join(root, 'temp');
  env.DOWNLOAD_DIR = path.join(root, 'downloads');
  env.YTDLP_PATH = path.join(root, 'fake-ytdlp');
  env.FFMPEG_PATH = path.join(root, 'fake-ffmpeg');
  env.MAX_DOWNLOAD_SIZE_MB = 1;
  env.DOWNLOAD_TIMEOUT_SECONDS = 1;
  env.PROCESS_TIMEOUT_SECONDS = 2;
  ensureDirs();

  // Tiny fake executables make partial downloads, hangs and failures reproducible.
  await writeFile(env.YTDLP_PATH, `#!/usr/bin/env node
const fs = require('node:fs');
const args = process.argv.slice(2);
const output = args[args.indexOf('-o') + 1].replace('%(ext)s', 'mp4');
const mode = process.env.FAKE_DOWNLOAD_MODE || 'ok';
if (mode === 'engine-error') {
  console.error('ERROR: request failed https://cdn.example/video?token=test-secret-query-token');
  process.exit(1);
}
if (mode === 'incomplete') {
  fs.writeFileSync(output.replace('source.mp4', 'source.f137.mp4'), 'partial stream');
  process.exit(0); // yt-dlp can skip a stream yet return success
}
fs.writeFileSync(output, mode === 'oversize' ? Buffer.alloc(2 * 1024 * 1024) : 'downloaded media');
// A multi-stream job can skip an oversized video, save audio, print a final
// marker and still exit 0. This must not be mistaken for a successful result.
if (mode === 'size-skip') console.log('[download] File is larger than max-filesize (2.00MiB > 1.00MiB). Skipping.');
if (mode === 'hang' || mode === 'oversize') setInterval(() => {}, 1000);
else console.log('FETCHLY_OUTPUT:' + output);
`);
  await writeFile(env.FFMPEG_PATH, `#!/usr/bin/env node
const fs = require('node:fs');
const args = process.argv.slice(2);
const output = args[args.length - 1];
const mode = process.env.FAKE_PROCESS_MODE || 'ok';
fs.writeFileSync(output, 'processed media');
if (mode === 'hang') setInterval(() => {}, 1000);
else if (mode === 'fail') process.exit(1);
`);
  await chmod(env.YTDLP_PATH, 0o755);
  await chmod(env.FFMPEG_PATH, 0o755);
  await initDatastore();
  const provider = requireProvider('https://www.youtube.com/watch?v=test').provider;
  vi.spyOn(provider, 'analyzeWithPlans').mockResolvedValue({
    info: {
      id: 'test', platform: 'youtube', title: 'Test video', duration: 2,
      thumbnail: null, uploader: null, webpageUrl: 'https://www.youtube.com/watch?v=test',
      formats: [{ id: 'v720', kind: 'video', container: 'mp4', quality: '720p' }],
    },
    plans: { v720: { kind: 'video', container: 'mp4', selector: 'best' } },
  });
});

afterAll(async () => {
  vi.restoreAllMocks();
  Object.assign(env, original);
  delete process.env.FAKE_DOWNLOAD_MODE;
  delete process.env.FAKE_PROCESS_MODE;
  await rm(root, { recursive: true, force: true });
});

beforeEach(() => {
  process.env.FAKE_DOWNLOAD_MODE = 'ok';
  process.env.FAKE_PROCESS_MODE = 'ok';
});

async function job(): Promise<string> {
  const id = randomUUID();
  await db().createJob({
    id, ipKey: 'test-ip', sourceUrl: 'https://www.youtube.com/watch?v=test',
    platform: 'youtube', title: 'Test video', thumbnailUrl: null,
    format: 'mp4', quality: '720p', expiresMinutes: 30,
  });
  return id;
}

async function expectCleaned(id: string): Promise<void> {
  await expect(access(workDirFor(id))).rejects.toMatchObject({ code: 'ENOENT' });
  await expect(access(finalPathFor(id, 'mp4'))).rejects.toMatchObject({ code: 'ENOENT' });
}

describe.runIf(process.platform !== 'win32')('download pipeline safeguards', () => {
  it('completes a valid job and removes its entire temporary directory', async () => {
    const id = await job();
    await processJob(id);
    const result = await db().getJob(id);
    expect(result).toMatchObject({ status: 'COMPLETED', progress: 100, fileSize: 15 });
    await expect(access(workDirFor(id))).rejects.toMatchObject({ code: 'ENOENT' });
    await expect(access(finalPathFor(id, 'mp4'))).resolves.toBeUndefined();
  });

  it('rejects a zero-exit partial download instead of serving a leftover stream', async () => {
    process.env.FAKE_DOWNLOAD_MODE = 'incomplete';
    const id = await job();
    await processJob(id);
    expect(await db().getJob(id)).toMatchObject({ status: 'FAILED', errorCode: 'DOWNLOAD_FAILED' });
    await expectCleaned(id);
  });

  it('rejects a skipped oversized stream even if yt-dlp reports success and an output', async () => {
    process.env.FAKE_DOWNLOAD_MODE = 'size-skip';
    const id = await job();
    await processJob(id);
    expect(await db().getJob(id)).toMatchObject({
      status: 'FAILED', errorCode: 'DOWNLOAD_FAILED', errorMessage: expect.stringContaining('size limit'),
    });
    await expectCleaned(id);
  });

  it('does not log signed source URLs from engine failures', async () => {
    process.env.FAKE_DOWNLOAD_MODE = 'engine-error';
    const warn = vi.spyOn(logger, 'warn');
    try {
      const id = await job();
      await processJob(id);
      expect(await db().getJob(id)).toMatchObject({ status: 'FAILED' });
      expect(warn).toHaveBeenCalledWith(
        expect.objectContaining({ stderr: expect.stringContaining('[url]') }), 'yt-dlp download failed',
      );
      expect(JSON.stringify(warn.mock.calls)).not.toContain('test-secret-query-token');
      await expectCleaned(id);
    } finally {
      warn.mockRestore();
    }
  });

  it('stops an oversized ongoing download and removes all fragments', async () => {
    process.env.FAKE_DOWNLOAD_MODE = 'oversize';
    const id = await job();
    await processJob(id);
    expect(await db().getJob(id)).toMatchObject({ status: 'FAILED', errorCode: 'DOWNLOAD_FAILED' });
    await expectCleaned(id);
  });

  it('times out a stalled download and removes all fragments', async () => {
    process.env.FAKE_DOWNLOAD_MODE = 'hang';
    const id = await job();
    await processJob(id);
    expect(await db().getJob(id)).toMatchObject({ status: 'FAILED', errorCode: 'TIMEOUT' });
    await expectCleaned(id);
  });

  it('removes partially written output after FFmpeg fails', async () => {
    process.env.FAKE_PROCESS_MODE = 'fail';
    const id = await job();
    await processJob(id);
    expect(await db().getJob(id)).toMatchObject({ status: 'FAILED', errorCode: 'FFMPEG_FAILED' });
    await expectCleaned(id);
  });

  it('does not leave a queued record when a full queue rejects a new job or retry', async () => {
    bindQueue({
      kind: 'local',
      enqueue: async () => { throw new ApiError('JOB_LIMIT_REACHED', 'Queue full.'); },
      shutdown: async () => undefined,
    });
    const analysisId = randomUUID();
    const url = 'https://www.youtube.com/watch?v=test';
    await db().saveAnalysis({
      id: analysisId, url, createdAt: new Date(),
      info: {
        id: 'test', platform: 'youtube', title: 'Test', duration: 1, thumbnail: null,
        uploader: null, webpageUrl: url,
        formats: [{ id: 'v720', kind: 'video', container: 'mp4', quality: '720p' }],
      },
      plans: { v720: { kind: 'video', container: 'mp4', selector: 'best' } },
    });
    const before = await db().listJobs({ limit: 1000 });
    await expect(createDownload({ analysisId, format: 'mp4', quality: '720p', ipKey: 'new-ip' }))
      .rejects.toMatchObject({ code: 'JOB_LIMIT_REACHED' });
    expect((await db().listJobs({ limit: 1000 })).total).toBe(before.total);

    const id = await job();
    await db().updateJob(id, { status: 'FAILED', errorMessage: 'Earlier failure' });
    await expect(retryJob(id)).rejects.toMatchObject({ code: 'JOB_LIMIT_REACHED' });
    expect(await db().getJob(id)).toMatchObject({ status: 'FAILED', errorMessage: 'Earlier failure' });
  });

  it('cancels processing and prevents retry until cleanup finishes', async () => {
    process.env.FAKE_PROCESS_MODE = 'hang';
    const id = await job();
    const processing = processJob(id);
    await vi.waitFor(async () => {
      expect((await db().getJob(id))?.status).toBe('PROCESSING');
      await access(finalPathFor(id, 'mp4'));
    }, { timeout: 3000, interval: 50 });
    await cancelJob(id);
    await expect(retryJob(id)).rejects.toMatchObject({ code: 'JOB_LIMIT_REACHED' });
    await processing;
    expect(await db().getJob(id)).toMatchObject({ status: 'CANCELLED' });
    await expectCleaned(id);
  });
});
