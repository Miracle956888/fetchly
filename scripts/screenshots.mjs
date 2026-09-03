import { chromium } from 'playwright-core';
const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox','--disable-dev-shm-usage'] });
const shots = [
  { name: 'mobile-light-home', w: 375, h: 740, theme: 'light', url: '/', scroll: 0 },
  { name: 'mobile-dark-home', w: 375, h: 740, theme: 'dark', url: '/', scroll: 0 },
  { name: 'mobile-dark-downloads', w: 375, h: 740, theme: 'dark', url: '/downloads', scroll: 0 },
  { name: 'desktop-light-home', w: 1280, h: 900, theme: 'light', url: '/', scroll: 0 },
  { name: 'desktop-dark-home', w: 1280, h: 900, theme: 'dark', url: '/', scroll: 0 },
];
for (const s of shots) {
  const ctx = await browser.newContext({ viewport: { width: s.w, height: s.h } });
  await ctx.addInitScript((t) => { try { localStorage.setItem('fetchly-theme', t); } catch {} }, s.theme);
  const page = await ctx.newPage();
  await page.goto('http://localhost:5173' + s.url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  if (s.scroll) await page.evaluate((y) => window.scrollTo(0, y), s.scroll);
  await page.screenshot({ path: `scripts/shots/${s.name}.png` });
  await ctx.close();
}
// desktop dark: result panel with a real analysis
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
  await ctx.addInitScript(() => { try { localStorage.setItem('fetchly-theme', 'dark'); } catch {} });
  const page = await ctx.newPage();
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await page.fill('#url-input', 'https://www.tiktok.com/@scout2015/video/6718335390845095173');
  await page.waitForSelector('text=Media information loaded', { timeout: 90000 }).catch(() => {});
  await page.waitForTimeout(500);
  await page.evaluate(() => document.querySelector('[aria-label="Analysis result"]')?.scrollIntoView());
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'scripts/shots/desktop-dark-result.png' });
  await ctx.close();
}
await browser.close();
console.log('screenshots done');
