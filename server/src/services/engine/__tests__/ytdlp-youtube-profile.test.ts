import { spawnSync } from 'node:child_process';
import { chmod, mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { env } from '../../../config/env.js';
import { YouTubeProvider } from '../../../providers/youtube.js';
import { downloadStreams, probeUrl } from '../ytdlp.js';

// Exercise the real guarded subprocess and argument plumbing without making
// network requests, installing yt-dlp or accepting account credentials.
describe.runIf(process.platform !== 'win32')('opt-in anonymous YouTube profile', () => {
  let root: string;
  let argsLog: string;
  const originalPath = env.YTDLP_PATH;
  const originalProfile = env.YTDLP_YOUTUBE_CLIENT_PROFILE;
  const originalLog = process.env.FETCHLY_TEST_ARGS_LOG;

  beforeAll(async () => {
    root = await mkdtemp(path.join(os.tmpdir(), 'fetchly-youtube-profile-'));
    argsLog = path.join(root, 'args.jsonl');
    env.YTDLP_PATH = path.join(root, 'fake-ytdlp');
    process.env.FETCHLY_TEST_ARGS_LOG = argsLog;
    await writeFile(env.YTDLP_PATH, `#!/usr/bin/env node
const fs = require('node:fs');
const args = process.argv.slice(2);
fs.appendFileSync(process.env.FETCHLY_TEST_ARGS_LOG, JSON.stringify(args) + '\\n');
if (args[args.length - 1].includes('botcheck001')) {
  console.error("ERROR: Sign in to confirm you're not a bot.");
  process.exit(1);
}
if (args.includes('--dump-single-json')) {
  console.log(JSON.stringify({
    id: 'abcdefghijk', title: 'Test media', duration: 2,
    formats: [{ format_id: '18', height: 360, vcodec: 'avc1', acodec: 'mp4a' }],
  }));
} else {
  const output = args[args.indexOf('-o') + 1].replace('%(ext)s', 'mp4');
  fs.writeFileSync(output, 'synthetic media');
  console.log('FETCHLY_OUTPUT:' + output);
}
`);
    await chmod(env.YTDLP_PATH, 0o755);
  });

  beforeEach(async () => {
    env.YTDLP_YOUTUBE_CLIENT_PROFILE = 'default';
    await writeFile(argsLog, '');
  });

  afterAll(async () => {
    env.YTDLP_PATH = originalPath;
    env.YTDLP_YOUTUBE_CLIENT_PROFILE = originalProfile;
    if (originalLog === undefined) delete process.env.FETCHLY_TEST_ARGS_LOG;
    else process.env.FETCHLY_TEST_ARGS_LOG = originalLog;
    await rm(root, { recursive: true, force: true });
  });

  async function recordedArgs(): Promise<string[][]> {
    const lines = (await readFile(argsLog, 'utf8')).trim().split('\n').filter(Boolean);
    return lines.map((line) => JSON.parse(line) as string[]);
  }

  function expectExperiment(args: string[], url: string): void {
    expect(args.at(-1)).toBe(url);
    expect(args).toEqual(expect.arrayContaining([
      '--ignore-config', '--no-cookies', '--no-cookies-from-browser', '--no-plugin-dirs',
      '--extractor-args', 'youtube:player_client=default,ios_producer',
    ]));
    expect(args[args.indexOf('--extractor-args') + 1]).toBe('youtube:player_client=default,ios_producer');
    expect(args).not.toContain('--cookies');
    expect(args).not.toContain('--cookies-from-browser');
    expect(args).not.toContain('--netrc');
  }

  function expectDefault(args: string[], url: string): void {
    expect(args.at(-1)).toBe(url);
    expect(args).not.toContain('--extractor-args');
    expect(args).not.toContain('--ignore-config');
    expect(args).not.toContain('--no-plugin-dirs');
  }

  it('leaves the existing invocation unchanged by default, for analysis and download', async () => {
    const url = 'https://www.youtube.com/watch?v=abcdefghijk';
    const dir = path.join(root, 'default');
    await mkdir(dir);
    await probeUrl(url);
    await downloadStreams(url, '18', path.join(dir, 'source.%(ext)s'), () => undefined, { cancelled: false });
    const [probe, download] = await recordedArgs();
    expectDefault(probe, url);
    expectDefault(download, url);
    expect(probe).toEqual(expect.arrayContaining(['--dump-single-json', '--skip-download', '--no-playlist']));
    expect(download).toEqual(expect.arrayContaining(['--max-filesize', '--no-playlist']));
  });

  it('uses the same fixed profile for provider analysis and the stream download', async () => {
    env.YTDLP_YOUTUBE_CLIENT_PROFILE = 'ios-producer';
    const url = 'https://www.youtube.com/watch?v=abcdefghijk';
    const dir = path.join(root, 'experimental');
    await mkdir(dir);
    const { info, plans } = await new YouTubeProvider().analyzeWithPlans(url);
    expect(info.title).toBe('Test media');
    expect(plans.v360.selector).toBe('18');
    const output = await downloadStreams(
      url, plans.v360.selector!, path.join(dir, 'source.%(ext)s'), () => undefined, { cancelled: false },
    );
    expect(await readFile(output, 'utf8')).toBe('synthetic media');
    const [probe, download] = await recordedArgs();
    expectExperiment(probe, url);
    expectExperiment(download, url);
  });

  it.each([
    'youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com',
    'youtu.be', 'youtube-nocookie.com', 'www.youtube-nocookie.com',
  ])('recognizes the registered YouTube host %s', async (hostname) => {
    env.YTDLP_YOUTUBE_CLIENT_PROFILE = 'ios-producer';
    const url = `https://${hostname}/watch?v=abcdefghijk`;
    await probeUrl(url);
    const [args] = await recordedArgs();
    expectExperiment(args, url);
    expect(new YouTubeProvider().matches(hostname)).toBe(true);
  });

  it.each([
    'https://www.tiktok.com/@user/video/123',
    'https://youtube.com.attacker.example/watch?v=abcdefghijk',
    'https://notyoutube.com/watch?v=abcdefghijk',
    'https://youtube.com@attacker.example/watch?v=abcdefghijk',
    'not a URL',
  ])('does not add YouTube flags for %s', async (url) => {
    env.YTDLP_YOUTUBE_CLIENT_PROFILE = 'ios-producer';
    await probeUrl(url);
    const [args] = await recordedArgs();
    expectDefault(args, url);
  });

  it('does not add the profile to other platforms during stream downloads', async () => {
    env.YTDLP_YOUTUBE_CLIENT_PROFILE = 'ios-producer';
    const url = 'https://www.tiktok.com/@user/video/123';
    const dir = path.join(root, 'non-youtube');
    await mkdir(dir);
    await downloadStreams(url, 'best', path.join(dir, 'source.%(ext)s'), () => undefined, { cancelled: false });
    const [args] = await recordedArgs();
    expectDefault(args, url);
  });

  it('still reports a source bot challenge during analysis and download', async () => {
    env.YTDLP_YOUTUBE_CLIENT_PROFILE = 'ios-producer';
    const url = 'https://www.youtube.com/watch?v=botcheck001';
    const dir = path.join(root, 'bot');
    await mkdir(dir);
    await expect(probeUrl(url)).rejects.toMatchObject({
      code: 'SOURCE_UNAVAILABLE', message: expect.stringMatching(/bot verification/i),
    });
    await expect(downloadStreams(
      url, 'best', path.join(dir, 'source.%(ext)s'), () => undefined, { cancelled: false },
    )).rejects.toMatchObject({
      code: 'SOURCE_UNAVAILABLE', message: expect.stringMatching(/bot verification/i),
    });
    const [probe, download] = await recordedArgs();
    expectExperiment(probe, url);
    expectExperiment(download, url);
  });

  it('honors cancellation before starting an experimental analysis', async () => {
    env.YTDLP_YOUTUBE_CLIENT_PROFILE = 'ios-producer';
    await expect(probeUrl('https://youtu.be/abcdefghijk', { cancelled: true })).rejects.toMatchObject({
      code: 'DOWNLOAD_FAILED', message: 'Cancelled.',
    });
    expect(await readFile(argsLog, 'utf8')).toBe('');
  });

  it('defaults to off and rejects unknown profile configuration at startup', () => {
    const configUrl = new URL('../../../config/env.ts', import.meta.url).href;
    const script = `import { env } from ${JSON.stringify(configUrl)}; console.log(env.YTDLP_YOUTUBE_CLIENT_PROFILE);`;
    const childEnv = { ...process.env, NODE_ENV: 'test' };
    delete childEnv.YTDLP_YOUTUBE_CLIENT_PROFILE;
    const start = (profile?: string) => spawnSync(
      process.execPath, ['--import', 'tsx', '--input-type=module', '-e', script],
      { env: profile === undefined ? childEnv : { ...childEnv, YTDLP_YOUTUBE_CLIENT_PROFILE: profile }, encoding: 'utf8' },
    );
    expect(start().stdout.trim()).toBe('default');
    expect(start('ios-producer').stdout.trim()).toBe('ios-producer');
    const invalid = start('arbitrary-extractor-arguments');
    expect(invalid.status).not.toBe(0);
    expect(invalid.stderr).toContain('YTDLP_YOUTUBE_CLIENT_PROFILE');
  });
});
