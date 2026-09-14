#!/usr/bin/env node
/**
 * Fetchly production quality gate.
 *
 * Runs the real production build, boots the real production server, and
 * asserts the deployment-critical behaviours end to end. Exits non-zero if
 * any check fails, so it can gate CI / a release.
 *
 *   node scripts/deploy-check.mjs
 *
 * It never touches a real database: the server under test is started with
 * ALLOW_EPHEMERAL_STORAGE=true and a throwaway secret, and is shut down after.
 */
import { spawn, spawnSync } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const ROOT = new URL('..', import.meta.url).pathname;
const PORT = 3977;
const BASE = `http://127.0.0.1:${PORT}`;
const SECRET = 'quality-gate-secret-0123456789abcdef';
const ADMIN_PW = 'QualityGate123!';

let passed = 0;
let failed = 0;
const results = [];

function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  if (ok) passed += 1;
  else failed += 1;
  console.log(`  ${ok ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`);
}

function run(cmd, args, opts = {}) {
  return spawnSync(cmd, args, { cwd: ROOT, encoding: 'utf8', ...opts });
}

async function waitForServer(ms = 20000) {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    try {
      const r = await fetch(`${BASE}/api/v1/health`);
      if (r.ok) return true;
    } catch {
      /* not up yet */
    }
    await sleep(400);
  }
  return false;
}

console.log('\n── 1. Production build ─────────────────────────────────────────');
const build = run('npm', ['run', 'build']);
check('npm run build succeeds', build.status === 0, build.status === 0 ? '' : build.stderr.slice(-400));

console.log('\n── 2. Production boot gate ─────────────────────────────────────');
// A production boot WITHOUT secrets must be refused, not silently insecure.
const gate = run('node', ['server/dist/server.js'], {
  env: { ...process.env, NODE_ENV: 'production', PORT: String(PORT + 1) },
  timeout: 20000,
});
check(
  'production refuses to boot without JWT_SECRET/ADMIN_PASSWORD',
  gate.status !== 0 && /refusing to start/.test(gate.stderr || gate.stdout || ''),
);

console.log('\n── 3. Production server startup ────────────────────────────────');
const server = spawn('node', ['server/dist/server.js'], {
  cwd: ROOT,
  env: {
    ...process.env,
    NODE_ENV: 'production',
    PORT: String(PORT),
    ALLOW_EPHEMERAL_STORAGE: 'true',
    JWT_SECRET: SECRET,
    ADMIN_PASSWORD: ADMIN_PW,
    CLIENT_URL: BASE,
    LOG_LEVEL: 'error',
  },
  stdio: ['ignore', 'ignore', 'pipe'],
});
let serverErr = '';
server.stderr.on('data', (d) => (serverErr += d));

const up = await waitForServer();
check('production server starts and answers /api/v1/health', up);

if (up) {
  console.log('\n── 4. API + routing + error handling ───────────────────────────');
  let r = await fetch(`${BASE}/api/v1/health`);
  const health = await r.json();
  check('GET /api/v1/health 200 + reports persistence mode', r.ok && typeof health.persistence === 'string', `persistence=${health.persistence}`);

  r = await fetch(`${BASE}/api/v1/platforms`);
  const platforms = await r.json();
  check('GET /api/v1/platforms returns the registry', r.ok && Array.isArray(platforms.data) && platforms.data.length > 0);

  r = await fetch(`${BASE}/api/v1/does-not-exist`);
  const nf = await r.json();
  check('unknown API route → structured 404 (no stack trace)', r.status === 404 && nf.error?.code === 'NOT_FOUND');

  r = await fetch(`${BASE}/api/v1/media/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{bad json',
  });
  const bad = await r.json();
  check('malformed JSON body → structured 400', r.status === 400 && bad.error?.code === 'VALIDATION_ERROR');

  console.log('\n── 5. Authentication & authorization ───────────────────────────');
  r = await fetch(`${BASE}/api/v1/admin/stats`);
  check('admin route rejects anonymous access (401)', r.status === 401);

  r = await fetch(`${BASE}/api/v1/admin/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@fetchly.local', password: 'change-me-strong-password' }),
  });
  check('published default admin password is REJECTED', r.status === 401);

  r = await fetch(`${BASE}/api/v1/admin/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@fetchly.local', password: ADMIN_PW }),
  });
  const login = await r.json();
  const cookie = r.headers.get('set-cookie') ?? '';
  check('admin login with real credentials succeeds (200 + session cookie)', r.ok && /fetchly_admin=/.test(cookie));
  check(
    'session cookie is HttpOnly',
    /httponly/i.test(cookie),
  );

  const jar = cookie.split(';')[0];
  r = await fetch(`${BASE}/api/v1/admin/auth/me`, { headers: { Cookie: jar } });
  check('session persists: /admin/auth/me with cookie → 200', r.ok);

  r = await fetch(`${BASE}/api/v1/admin/users`, { headers: { Cookie: jar } });
  check('admin-only resource reachable when authorized', r.ok);

  const forged = (await import('node:module')).createRequire(import.meta.url)(
    `${ROOT}node_modules/jsonwebtoken`,
  ).sign({ sub: 'x', email: 'a@b.c', role: 'ADMIN' }, 'dev-only-insecure-secret-change-me', { expiresIn: '8h' });
  r = await fetch(`${BASE}/api/v1/admin/users`, { headers: { Authorization: `Bearer ${forged}` } });
  check('JWT forged with the published default secret is REJECTED', r.status === 401);

  console.log('\n── 6. CSRF / CORS ──────────────────────────────────────────────');
  r = await fetch(`${BASE}/api/v1/admin/auth/logout`, {
    method: 'POST',
    headers: { Cookie: jar, Origin: 'https://evil.example' },
  });
  check('cross-site state-changing request blocked (403)', r.status === 403);

  r = await fetch(`${BASE}/api/v1/platforms`, { headers: { Origin: 'https://evil.example' } });
  check('disallowed origin gets no CORS allow header', r.ok && r.headers.get('access-control-allow-origin') === null);

  r = await fetch(`${BASE}/api/v1/platforms`, { headers: { Origin: BASE } });
  check('allowed origin is reflected (not *)', r.headers.get('access-control-allow-origin') === BASE);

  console.log('\n── 7. Static frontend build ────────────────────────────────────');
  const fs = await import('node:fs');
  const html = fs.readFileSync(`${ROOT}client/dist/index.html`, 'utf8');
  check('built index.html exists', html.length > 0);
  check('no placeholder domain in built HTML', !/example\.com|netlify\.app/.test(html));
  check('no hardcoded localhost in built HTML', !/localhost|127\.0\.0\.1/.test(html));
  const assets = fs.readdirSync(`${ROOT}client/dist/assets`);
  check('hashed JS/CSS assets emitted', assets.some((f) => f.endsWith('.js')) && assets.some((f) => f.endsWith('.css')));
  check('robots.txt emitted', fs.existsSync(`${ROOT}client/dist/robots.txt`));
  check('og cover image present', fs.existsSync(`${ROOT}client/public/og-cover.png`));
}

server.kill('SIGTERM');
await sleep(600);
if (server.exitCode === null) server.kill('SIGKILL');

console.log('\n── Quality gate summary ────────────────────────────────────────');
for (const r of results) console.log(`  [${r.ok ? 'x' : ' '}] ${r.name}`);
console.log(`\n  ${passed} passed, ${failed} failed\n`);
process.exit(failed === 0 ? 0 : 1);
