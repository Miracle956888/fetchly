/**
 * Real-browser page check (Chromium via playwright-core).
 * Visits every route at mobile + desktop widths in both themes, collects
 * console errors, uncaught exceptions and failed requests, then exercises
 * the automatic-analysis flow with a real URL.
 */
import { chromium } from 'playwright-core';

const BASE = 'http://localhost:5173';
const ROUTES = [
  '/',
  '/downloads',
  '/youtube-downloader',
  '/tiktok-downloader',
  '/instagram-downloader',
  '/youtube-to-mp3',
  '/youtube-to-mp4',
  '/terms',
  '/privacy',
  '/dmca',
  '/responsible-use',
  '/admin/login',
  '/admin', // should redirect to /admin/login without a session
  '/this-page-does-not-exist',
];

const results = [];
let failures = 0;

const browser = await chromium.launch({
  executablePath: '/usr/bin/chromium',
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});

for (const viewport of [
  { name: 'mobile-375', width: 375, height: 720 },
  { name: 'desktop-1280', width: 1280, height: 860 },
]) {
  for (const theme of ['light', 'dark']) {
    const ctx = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
    await ctx.addInitScript((t) => {
      try {
        localStorage.setItem('fetchly-theme', t);
      } catch {}
    }, theme);

    for (const route of ROUTES) {
      const page = await ctx.newPage();
      const errors = [];
      page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
      page.on('console', (msg) => {
        if (msg.type() !== 'error') return;
        const text = msg.text();
        // 401 = the app's intentional logged-out auth probe (redirects to
        // login). 429 = the rate limiter doing its job when a sweep hammers
        // one IP. Both are handled gracefully by the UI; real page errors
        // surface via `pageerror` or JS console messages.
        if (text.startsWith('Failed to load resource') && (text.includes('401') || text.includes('429'))) return;
        errors.push(`console: ${text}`);
      });
      const failedReqs = [];
      page.on('response', (res) => {
        if (res.status() >= 500) failedReqs.push(`${res.status()} ${res.url()}`);
      });

      let finalUrl = '';
      try {
        const resp = await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle', timeout: 30000 });
        finalUrl = page.url();
        if (resp && resp.status() >= 400 && resp.status() !== 404) {
          errors.push(`http ${resp.status()} on navigation`);
        }
      } catch (e) {
        errors.push(`navigation: ${e.message.split('\n')[0]}`);
      }

      // AdminApp does a /auth/me round-trip; give lazy chunks a beat.
      await page.waitForTimeout(400);
      const bodyText = await page.evaluate(() => document.body.innerText).catch(() => '');
      const blank = bodyText.trim().length < 10;
      if (blank) errors.push('blank page (no rendered text)');

      const themeOk = await page.evaluate(
        (expected) => document.documentElement.classList.contains('dark') === (expected === 'dark'),
        theme,
      );
      if (!themeOk) errors.push(`theme not applied (expected ${theme})`);

      const ok = errors.length === 0 && failedReqs.length === 0;
      if (!ok) failures += 1;
      results.push({
        viewport: viewport.name,
        theme,
        route,
        ok: ok ? 'PASS' : 'FAIL',
        finalUrl: finalUrl.replace(BASE, ''),
        errors: [...errors, ...failedReqs],
      });
      await page.close();
    }
    await ctx.close();
  }
}

// ── Theme persistence across reload ────────────────────────────────────────
{
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.setItem('fetchly-theme', 'dark'));
  await page.evaluate(() => {
    document.documentElement.classList.toggle('dark', true);
  });
  await page.reload({ waitUntil: 'networkidle' });
  const stillDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
  results.push({
    viewport: 'desktop-1280',
    theme: 'dark',
    route: '/ (persistence reload)',
    ok: stillDark ? 'PASS' : 'FAIL',
    errors: stillDark ? [] : ['dark theme lost after reload'],
  });
  if (!stillDark) failures += 1;
  await ctx.close();
}

// ── Automatic analysis flow in a real browser ──────────────────────────────
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => m.type() === 'error' && errors.push(`console: ${m.text()}`));

  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await page.fill('#url-input', 'https://www.tiktok.com/@scout2015/video/6718335390845095173');
  // Auto-analysis should kick in (debounce) — wait for the result panel.
  try {
    await page.waitForSelector('text=Media information loaded', { timeout: 90_000 });
  } catch {
    errors.push('auto-analysis did not produce a result panel within 90s');
  }
  const estimates = await page.locator('text=/estimated/').count();
  const sizeUnknown = await page.locator('text=/Size calculated during processing/').count();
  results.push({
    viewport: 'desktop-1280',
    theme: 'light',
    route: '/ auto-analyze flow',
    ok: errors.length === 0 && estimates + sizeUnknown > 0 ? 'PASS' : 'FAIL',
    errors: [...errors, `format rows with estimates: ${estimates}, without: ${sizeUnknown}`],
  });
  if (errors.length) failures += 1;
  await ctx.close();
}

await browser.close();

for (const r of results) {
  console.log(
    `${r.ok}  [${r.viewport}/${r.theme}] ${r.route} -> ${r.finalUrl ?? ''} ${r.errors.length ? '\n      ' + r.errors.join('\n      ') : ''}`,
  );
}
console.log(`\n${results.length - failures}/${results.length} checks passed`);
process.exit(failures ? 1 : 0);
