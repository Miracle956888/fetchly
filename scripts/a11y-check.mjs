import { chromium } from 'playwright-core';
import AxeBuilder from '@axe-core/playwright';

const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox','--disable-dev-shm-usage'] });
const pages = [
  { url: '/', theme: 'light', name: 'home-light' },
  { url: '/', theme: 'dark', name: 'home-dark' },
  { url: '/downloads', theme: 'dark', name: 'downloads-dark' },
  { url: '/admin/login', theme: 'light', name: 'admin-login' },
  { url: '/terms', theme: 'dark', name: 'terms-dark' },
];
let total = 0;
for (const p of pages) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.addInitScript((t) => { try { localStorage.setItem('fetchly-theme', t); } catch {} }, p.theme);
  const page = await ctx.newPage();
  await page.goto('http://localhost:5173' + p.url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze();
  const serious = results.violations.filter(v => v.impact === 'serious' || v.impact === 'critical');
  total += serious.length;
  console.log(`── ${p.name}: ${results.violations.length} violations (${serious.length} serious/critical)`);
  for (const v of results.violations) {
    console.log(`   [${v.impact}] ${v.id}: ${v.help}`);
    for (const n of v.nodes.slice(0, 3)) console.log(`       ${n.target.join(' ')} :: ${n.html.slice(0, 110)}`);
  }
  await ctx.close();
}
await browser.close();
console.log(total === 0 ? 'NO SERIOUS A11Y VIOLATIONS' : `${total} serious violations to fix`);
process.exit(total ? 1 : 0);
