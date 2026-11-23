/**
 * Offline browser smoke test for the single-service beta.
 *
 * Requires built client/server, yt-dlp, FFmpeg and a Chromium executable.
 * Platform metadata is synthetic; the actual download/conversion uses local
 * media with real yt-dlp and FFmpeg. This does not test a live source or Docker.
 */
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { chmod, mkdtemp, rm, stat, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const browserPath = process.env.CHROMIUM_PATH || '/usr/bin/chromium';
const ffmpeg = process.env.FFMPEG_PATH || 'ffmpeg';
const ytdlp = process.env.YTDLP_PATH || 'yt-dlp';
if (!existsSync(browserPath)) throw new Error('Set CHROMIUM_PATH to a Chromium executable.');
if (!existsSync(path.join(root, 'client/dist/index.html')) || !existsSync(path.join(root, 'server/dist/server.js'))) {
  throw new Error('Run npm run build before the smoke test.');
}

const temp = await mkdtemp(path.join(os.tmpdir(), 'fetchly-beta-smoke-'));
const password = 'offline-smoke-test-password';
let fixtureServer;
let app;
let browser;
let logs = '';
try {
  const fixture = path.join(temp, 'fixture.mp4');
  execFileSync(ffmpeg, [
    '-loglevel', 'error', '-f', 'lavfi', '-i', 'testsrc2=duration=2:size=320x180:rate=15',
    '-f', 'lavfi', '-i', 'sine=frequency=440:duration=2', '-c:v', 'mpeg4', '-c:a', 'aac',
    '-shortest', '-y', fixture,
  ]);
  fixtureServer = createServer((req, res) => {
    res.setHeader('content-type', 'video/mp4');
    res.setHeader('content-length', statSync(fixture).size);
    if (req.method === 'HEAD') return res.end();
    createReadStream(fixture).pipe(res);
  });
  await new Promise((resolve) => fixtureServer.listen(0, '127.0.0.1', resolve));
  const fixtureUrl = `http://127.0.0.1:${fixtureServer.address().port}/fixture.mp4`;

  const wrapper = path.join(temp, 'fixture-ytdlp');
  await writeFile(wrapper, `#!/usr/bin/env node
const { spawn } = require('node:child_process');
const args = process.argv.slice(2);
if (args.includes('--dump-single-json')) {
  console.log(JSON.stringify({id:'fixture',title:'Offline test',duration:2,
    webpage_url:'https://www.youtube.com/watch?v=fixture',
    formats:[{format_id:'mp4',ext:'mp4',height:180,vcodec:'mpeg4',acodec:'aac'}]}));
} else {
  if (args[args.length-1].startsWith('https://www.youtube.com/')) args[args.length-1] = process.env.FIXTURE_URL;
  const child = spawn(process.env.REAL_YTDLP, args, {stdio:'inherit'});
  child.on('error', () => process.exit(1));
  child.on('close', code => process.exit(code ?? 1));
}
`);
  await chmod(wrapper, 0o755);

  const port = await new Promise((resolve, reject) => {
    const socket = createServer();
    socket.once('error', reject);
    socket.listen(0, '127.0.0.1', () => {
      const selected = socket.address().port;
      socket.close(() => resolve(selected));
    });
  });
  const env = {
    ...process.env,
    NODE_ENV: 'production', PORT: String(port), CLIENT_DIST_DIR: path.join(root, 'client/dist'),
    DOWNLOAD_DIR: path.join(temp, 'downloads'), TEMP_DIR: path.join(temp, 'temp'), LOG_DIR: '',
    DATABASE_URL: '', REDIS_URL: '', JWT_SECRET: 'offline-smoke-test-secret-32-bytes',
    ADMIN_EMAIL: 'smoke@example.com', ADMIN_PASSWORD: password,
    YTDLP_PATH: wrapper, REAL_YTDLP: ytdlp, FIXTURE_URL: fixtureUrl,
    JOB_CONCURRENCY: '1', MAX_DOWNLOAD_SIZE_MB: '1', MIN_FREE_DISK_MB: '0',
  };
  app = spawn(process.execPath, ['server/dist/server.js'], { cwd: root, env, stdio: ['ignore', 'pipe', 'pipe'] });
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Server startup timed out: ${logs}`)), 15_000);
    app.stdout.on('data', (chunk) => {
      logs += chunk;
      if (logs.includes('Fetchly API listening')) { clearTimeout(timer); resolve(); }
    });
    app.stderr.on('data', (chunk) => { logs += chunk; });
    app.once('exit', (code) => { clearTimeout(timer); reject(new Error(`Server exited ${code}: ${logs}`)); });
  });

  browser = await chromium.launch({
    executablePath: browserPath, headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--single-process', '--no-zygote'],
  });
  const context = await browser.newContext({ acceptDownloads: true, viewport: { width: 1200, height: 900 } });
  await context.addInitScript(() => localStorage.setItem('fetchly-theme', 'dark'));
  const page = await context.newPage();
  const errors = [];
  let analyses = 0;
  let completedStatuses = 0;
  let tampered = false;
  const deliveryTokens = new Set();
  page.on('pageerror', (err) => errors.push(err.message));
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('request', (req) => {
    if (req.method() === 'POST' && new URL(req.url()).pathname === '/api/v1/media/analyze') analyses++;
  });
  // Make the first cached completed-job token invalid. A fresh status request
  // must replace it before the browser attempts the actual delivery.
  await page.route(/\/api\/v1\/downloads\/[^/?]+$/, async (route) => {
    if (route.request().method() !== 'GET') return route.continue();
    const response = await route.fetch();
    const body = await response.json();
    if (body.data?.status === 'completed') {
      completedStatuses++;
      const token = new URL(body.data.downloadUrl, 'http://localhost').searchParams.get('token');
      if (token) deliveryTokens.add(token);
      if (!tampered) {
        body.data.downloadUrl = body.data.downloadUrl.replace(/token=.*/, 'token=stale-test-token');
        tampered = true;
      }
    }
    return route.fulfill({ response, body: JSON.stringify(body) });
  });

  const base = `http://127.0.0.1:${port}`;
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: /Save your media/ }).waitFor();
  assert(await page.locator('html').evaluate((el) => el.classList.contains('dark')));
  const input = page.getByLabel('Video URL');
  await input.fill('https://www.youtube.com/watch?v=fixture');
  await Promise.all([page.waitForResponse((r) => r.url().endsWith('/api/v1/media/analyze')), input.press('Enter')]);
  await page.getByText('Media information loaded').waitFor();
  await page.waitForTimeout(800);
  assert.equal(analyses, 1, 'Enter should cancel the pending debounce');
  await Promise.all([page.waitForResponse((r) => r.url().endsWith('/api/v1/media/analyze')), input.press('Enter')]);
  await page.getByText('Media information loaded').waitFor();
  assert.equal(analyses, 2, 'Enter should perform a fresh analysis');

  await page.getByRole('button', { name: 'Download', exact: true }).first().click();
  const videoButton = page.getByRole('button', { name: 'Download to device' });
  await videoButton.waitFor({ timeout: 20_000 });
  assert(tampered, 'expected a stale cached delivery token');
  const [video] = await Promise.all([page.waitForEvent('download'), videoButton.click()]);
  assert(completedStatuses >= 2, 'a fresh status should be requested for delivery');
  assert((await stat(await video.path())).size > 0);
  assert(video.suggestedFilename().endsWith('.mp4'));

  await page.getByRole('tab', { name: /Audio/ }).click();
  const [created] = await Promise.all([
    page.waitForResponse((r) => r.url().endsWith('/api/v1/downloads') && r.request().method() === 'POST'),
    page.getByRole('button', { name: 'Download', exact: true }).first().click(),
  ]);
  const audioId = (await created.json()).data.jobId;
  await page.waitForResponse(async (r) => {
    if (!r.url().endsWith(`/api/v1/downloads/${audioId}`) || r.request().method() !== 'GET') return false;
    return (await r.json()).data?.status === 'completed';
  }, { timeout: 20_000 });
  const audioButton = page.getByRole('button', { name: 'Download to device' });
  await audioButton.waitFor({ timeout: 10_000 });
  const [audio] = await Promise.all([page.waitForEvent('download'), audioButton.click()]);
  assert((await stat(await audio.path())).size > 0);
  assert(audio.suggestedFilename().endsWith('.mp3'));
  console.log('PASS: analysis, job polling, fresh-token MP4 delivery and MP3 conversion');

  await page.goto(`${base}/admin/login`);
  await page.getByLabel('Email').fill('smoke@example.com');
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL((url) => url.pathname === '/admin');
  await page.getByText('Overview', { exact: false }).first().waitFor();
  const cookie = (await context.cookies()).find((c) => c.name === 'fetchly_admin');
  assert(cookie?.httpOnly && cookie.secure);
  assert.deepEqual(errors, []);
  assert(!logs.includes(password) && !logs.includes(cookie.value));
  for (const token of deliveryTokens) assert(!logs.includes(token), 'delivery token leaked into logs');
  console.log('PASS: theme, same-origin admin login, CSP and basic log redaction');
} finally {
  if (browser) await browser.close();
  if (app && app.exitCode === null) {
    app.kill('SIGTERM');
    await new Promise((resolve) => {
      const timer = setTimeout(() => { app.kill('SIGKILL'); resolve(); }, 4_000);
      app.once('exit', () => { clearTimeout(timer); resolve(); });
    });
  }
  if (fixtureServer) await new Promise((resolve) => fixtureServer.close(resolve));
  await rm(temp, { recursive: true, force: true });
}
