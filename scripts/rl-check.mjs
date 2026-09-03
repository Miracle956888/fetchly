import { chromium } from 'playwright-core';
const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox','--disable-dev-shm-usage'] });
const ctx = await browser.newContext();
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push('pageerror: '+e.message));
page.on('console', m => { if (m.type()==='error' && !m.text().startsWith('Failed to load resource')) errors.push('console: '+m.text()); });
await page.goto('http://localhost:5173/', { waitUntil:'networkidle' });
// Simulate heavy polling on the status endpoint (the previous lockout scenario)
const results = [];
for (let i=0;i<130;i++){
  const r = await page.evaluate(() => fetch('/api/v1/downloads/00000000-0000-4000-8000-000000000000').then(x=>x.status));
  results.push(r);
}
const got429 = results.filter(r=>r===429).length;
// The analyze endpoint (strict limiter) should still be protected:
let analyze429=0;
for (let i=0;i<30;i++){
  const r = await page.evaluate(() => fetch('/api/v1/media/analyze',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:'https://example.com/x'})}).then(x=>x.status));
  if(r===429) analyze429++;
}
console.log('polling responses:', JSON.stringify([...new Set(results)]), '| 429s on polling:', got429, '(expect 0)');
console.log('analyze 429s:', analyze429, '(expect >0, limiter still enforced)');
console.log('page errors:', errors.length ? errors : 'none');
await browser.close();
