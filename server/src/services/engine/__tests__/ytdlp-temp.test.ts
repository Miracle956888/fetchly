import { chmod, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { env } from '../../../config/env.js';
import { checkAvailable, probeUrl } from '../ytdlp.js';

let root: string;
const oldTempDir = env.TEMP_DIR;
const oldEngine = env.YTDLP_PATH;

beforeAll(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), 'fetchly-ytdlp-temp-test-'));
  env.TEMP_DIR = path.join(root, 'temp');
  const engine = path.join(root, 'fake-ytdlp');
  await writeFile(engine, `#!/usr/bin/env node
const fs = require('node:fs'); const path = require('node:path');
fs.mkdirSync(path.join(process.env.TMPDIR, '_MEI-test'));
fs.writeFileSync(path.join(process.env.TMPDIR, '_MEI-test', 'runtime'), 'runtime');
if (process.argv.includes('--version')) {
  fs.appendFileSync(${JSON.stringify(path.join(root, 'checks'))}, 'x');
  console.log('test-version'); process.exit(0);
}
setInterval(() => {}, 1000);
`);
  await chmod(engine, 0o755);
  env.YTDLP_PATH = engine;
});

afterAll(async () => {
  env.TEMP_DIR = oldTempDir;
  env.YTDLP_PATH = oldEngine;
  await rm(root, { recursive: true, force: true });
});

describe.runIf(process.platform !== 'win32')('yt-dlp temporary runtime cleanup', () => {
  it('cleans extracted files even when a probe is cancelled', async () => {
    const signal = { cancelled: false };
    const result = probeUrl('https://www.youtube.com/watch?v=test', signal).catch((err: unknown) => err);
    await vi.waitFor(async () => {
      const entries = await readdir(env.TEMP_DIR).catch(() => []);
      expect(entries).toHaveLength(1);
      const children = await readdir(path.join(env.TEMP_DIR, entries[0]));
      expect(children).toContain('_MEI-test');
    });
    signal.cancelled = true;
    expect(await result).toMatchObject({ message: 'Cancelled.' });
    expect(await readdir(env.TEMP_DIR)).toEqual([]);
  });

  it('shares and caches health checks and cleans their runtime files', async () => {
    await mkdir(env.TEMP_DIR, { recursive: true });
    const results = await Promise.all(Array.from({ length: 10 }, () => checkAvailable()));
    expect(results).toEqual(Array.from({ length: 10 }, () => ({ available: true, version: 'test-version' })));
    await expect(checkAvailable()).resolves.toEqual({ available: true, version: 'test-version' });
    expect(await readFile(path.join(root, 'checks'), 'utf8')).toBe('x');
    expect(await readdir(env.TEMP_DIR)).toEqual([]);
  });
});
