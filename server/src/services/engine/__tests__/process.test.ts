import { access, mkdtemp, rm, utimes, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { env } from '../../../config/env.js';
import { assertWorkSize, beginTempWork, cleanupFiles, endTempWork, ensureDirs } from '../../storage.js';
import { runGuarded } from '../process.js';

let root: string;
const oldTempDir = env.TEMP_DIR;
const oldDownloadDir = env.DOWNLOAD_DIR;

beforeAll(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), 'fetchly-process-test-'));
  env.TEMP_DIR = path.join(root, 'temp');
  env.DOWNLOAD_DIR = path.join(root, 'downloads');
  ensureDirs();
});

afterAll(async () => {
  env.TEMP_DIR = oldTempDir;
  env.DOWNLOAD_DIR = oldDownloadDir;
  await rm(root, { recursive: true, force: true });
});

const options = {
  timeoutMs: 5000,
  timeoutMessage: 'Process timed out.',
  unavailableMessage: 'Engine missing.',
  startErrorMessage: 'Engine did not start.',
};

describe('guarded media processes', () => {
  it('enforces a wall-clock timeout', async () => {
    await expect(runGuarded(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], {
      ...options, timeoutMs: 150,
    })).rejects.toMatchObject({ code: 'TIMEOUT' });
  });

  it('checks the final size even if a process finishes between samples', async () => {
    const dir = await beginTempWork('fast-job');
    const script = `require('node:fs').writeFileSync(${JSON.stringify(path.join(dir, 'source.mp4'))}, Buffer.alloc(2048))`;
    try {
      await expect(runGuarded(process.execPath, ['-e', script], {
        ...options, checkLimit: () => assertWorkSize(dir, 1024),
      })).rejects.toMatchObject({ code: 'DOWNLOAD_FAILED' });
    } finally {
      await endTempWork('fast-job');
    }
  });

  it('accounts for multiple streams and merge artifacts together', async () => {
    const dir = await beginTempWork('streams-job');
    try {
      // Each file is under 1 MiB, but the combined work area exceeds the
      // two-copy allowance (2 MiB + 1 MiB of sidecar headroom).
      for (let i = 0; i < 4; i++) {
        await writeFile(path.join(dir, `stream-${i}`), Buffer.alloc(900 * 1024));
      }
      await expect(assertWorkSize(dir, 1024 * 1024)).rejects.toMatchObject({ code: 'DOWNLOAD_FAILED' });
    } finally {
      await endTempWork('streams-job');
    }
  });

  it.runIf(process.platform !== 'win32')('kills child processes before returning from cancellation', async () => {
    const marker = path.join(root, 'child-kept-writing');
    const grandchild = `console.log('CHILD_READY'); setTimeout(() => require('node:fs').writeFileSync(${JSON.stringify(marker)}, 'bad'), 1600); setInterval(() => {}, 1000);`;
    const parent = `require('node:child_process').spawn(process.execPath, ['-e', ${JSON.stringify(grandchild)}], { stdio: 'inherit' }); setInterval(() => {}, 1000);`;
    const signal = { cancelled: false };
    await expect(runGuarded(process.execPath, ['-e', parent], {
      ...options,
      signal,
      onStdout: (text) => { if (text.includes('CHILD_READY')) signal.cancelled = true; },
    })).rejects.toMatchObject({ message: 'Cancelled.' });
    await new Promise((resolve) => setTimeout(resolve, 1800));
    await expect(access(marker)).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('does not clean active work directories, but removes abandoned directories', async () => {
    const active = await beginTempWork('active');
    const stale = await beginTempWork('stale');
    // Simulate an orphan left by an earlier process rather than ending it.
    await endTempWork('stale');
    const orphan = path.join(env.TEMP_DIR, 'orphan');
    await writeFile(path.join(active, 'incomplete'), 'active');
    const { mkdir } = await import('node:fs/promises');
    await mkdir(orphan);
    await writeFile(path.join(orphan, 'fragment'), 'old');
    const old = new Date(Date.now() - (env.TEMP_FILE_RETENTION_MINUTES + 5) * 60_000);
    await utimes(active, old, old);
    await utimes(orphan, old, old);
    const result = await cleanupFiles();
    expect(result.staleTempFiles).toBeGreaterThanOrEqual(1);
    await expect(access(orphan)).rejects.toMatchObject({ code: 'ENOENT' });
    await expect(access(path.join(active, 'incomplete'))).resolves.toBeUndefined();
    await endTempWork('active');
    await expect(access(active)).rejects.toMatchObject({ code: 'ENOENT' });
    expect(stale).not.toBe(active);
  });
});
