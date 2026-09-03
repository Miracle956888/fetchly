/**
 * Deep-flow check in a real browser:
 *  1. Automatic analysis → download a video → verify the actual downloaded
 *     bytes equal the server's authoritative file size.
 *  2. Admin login → dashboard/jobs/platforms/system/logs render with real data.
 */
import { chromium } from 'playwright-core';

const BASE = 'http://localhost:5173';
const API = 'http://localhost:3000/api/v1';
const errors = [];
let failures = 0;
const fail = (m) => {
  failures += 1;
  errors.push(m);
};

const browser = await chromium.launch({
  executablePath: '/usr/bin/chromium',
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
const page = await ctx.newPage();
page.on('pageerror', (e) => fail(`pageerror: ${e.message}`));
page.on('console', (m) => {
  if (m.type() !== 'error') return;
  const t = m.text();
  if (t.startsWith('Failed to load resource') && (t.includes('401') || t.includes('429'))) return;
  fail(`console: ${t}`);
});

// ── 1. Auto-analyze ────────────────────────────────────────────────────────
await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
await page.fill('#url-input', 'https://www.tiktok.com/@scout2015/video/6718335390845095173');
try {
  await page.waitForSelector('text=Media information loaded', { timeout: 90_000 });
  console.log('PASS  auto-analysis produced result panel');
} catch {
  fail('auto-analysis did not complete');
}

// Confirm estimated sizes are visible before download
const estimateCount = await page.locator('text=/estimated/').count();
console.log(`INFO  format rows showing estimates: ${estimateCount}`);
if (estimateCount === 0) fail('no estimated sizes shown before download');

// ── 2. Start a real download (exact "Download" on the first format row;
//       ":text-is" avoids matching "Start Download" in the navbar) ─────────
await page.locator('button:text-is("Download")').first().click();
let jobId = null;

// Find the job via the API (in-memory store, single recent job)
await page.waitForTimeout(1500);
// Derive jobId from the page's status polls:
page.on('request', (r) => {
  const m = r.url().match(/\/api\/v1\/downloads\/([0-9a-f-]{36})$/);
  if (m && r.method() === 'GET') jobId = m[1];
});
try {
  await page.waitForSelector('text=/Ready ·/', { timeout: 180_000 });
  console.log('PASS  job reached Ready state in the UI');
} catch {
  const body = await page.evaluate(() => document.body.innerText);
  fail(`job never became Ready. Card text: ${body.slice(body.indexOf('Scramble'), body.indexOf('Scramble') + 300)}`);
}
if (!jobId) fail('could not observe a job id being polled');

// Authoritative size from the API
let apiSize = null;
if (jobId) {
  const res = await fetch(`${API}/downloads/${jobId}`);
  const json = await res.json();
  apiSize = json.data?.fileSize ?? null;
  console.log(`INFO  API fileSize: ${apiSize} bytes, fileName: ${json.data?.fileName}`);
}

// ── 3. Click "Download to device" and capture the real browser download ──
let downloadedBytes = null;
try {
  const button = page
    .locator('button:text-is("Download to device"), button:text-is("Download Again")')
    .first();
  await button.waitFor({ state: 'visible', timeout: 10_000 });
  const dlPromise = page.waitForEvent('download', { timeout: 30_000 });
  await button.click();
  const download = await dlPromise;
  const path = '/tmp/browser-dl.bin';
  await download.saveAs(path);
  const { statSync } = await import('node:fs');
  downloadedBytes = statSync(path).size;
  console.log(`INFO  browser received file "${download.suggestedFilename()}" (${downloadedBytes} bytes)`);
} catch (e) {
  fail(`browser download event failed: ${e.message.split('\n')[0]}`);
}

if (apiSize != null && downloadedBytes != null) {
  if (apiSize === downloadedBytes) {
    console.log('PASS  downloaded bytes === API fileSize === filesystem truth');
  } else {
    fail(`SIZE MISMATCH: browser=${downloadedBytes} api=${apiSize}`);
  }
}

// Honest delivery message shown?
const deliveryMsg = await page.locator('text=Your browser has started downloading the file.').count();
if (deliveryMsg > 0) console.log('PASS  honest "download started" message shown');
else fail('delivery message missing');

// ── 4. Admin flow ──────────────────────────────────────────────────────────
await page.goto(`${BASE}/admin/login`, { waitUntil: 'networkidle' });
await page.fill('input[type="email"]', 'admin@fetchly.local');
await page.fill('input[type="password"]', 'change-me-strong-password');
await page.locator('button[type="submit"]').click();
await page.waitForURL('**/admin', { timeout: 15_000 }).catch(() => fail('admin login did not redirect'));

await page.waitForSelector('text=Data Delivered', { timeout: 15_000 }).catch(() => fail('dashboard stats missing'));
const dashText = await page.evaluate(() => document.body.innerText);
console.log(`PASS  admin dashboard rendered (${dashText.length} chars)`);

// Charts present?
const svgCharts = await page.locator('svg[role="img"]').count();
if (svgCharts >= 2) console.log(`PASS  ${svgCharts} charts rendered`);
else fail(`expected >=2 charts, found ${svgCharts}`);

// Storage monitor
if (dashText.includes('Temporary storage')) console.log('PASS  storage monitor present');
else fail('storage monitor missing from dashboard');

// Jobs page shows our completed job
await page.goto(`${BASE}/admin/jobs`, { waitUntil: 'networkidle' });
await page.waitForSelector('table', { timeout: 10_000 }).catch(() => fail('jobs table missing'));
const jobsText = await page.evaluate(() => document.body.innerText);
if (jobsText.includes('COMPLETED')) console.log('PASS  jobs table shows COMPLETED job');
else fail('jobs table has no COMPLETED row');

// Platforms page toggles
await page.goto(`${BASE}/admin/platforms`, { waitUntil: 'networkidle' });
const switches = await page.locator('[role="switch"]').count();
console.log(`${switches >= 3 ? 'PASS' : 'FAIL'}  platforms page has ${switches} toggles`);
if (switches < 3) fail('platform toggles missing');

// Logs show the delivery lifecycle
await page.goto(`${BASE}/admin/logs`, { waitUntil: 'networkidle' });
const logsText = await page.evaluate(() => document.body.innerText);
for (const ev of ['job_created', 'file_ready', 'download_requested', 'download_completed', 'download_started']) {
  if (logsText.includes(ev)) console.log(`PASS  log event recorded: ${ev}`);
  else fail(`log event missing: ${ev}`);
}

await browser.close();
console.log(`\n${errors.length === 0 ? 'ALL DEEP-FLOW CHECKS PASSED' : errors.length + ' PROBLEMS:'}`);
errors.forEach((e) => console.log('  ✗ ' + e));
process.exit(failures ? 1 : 0);
