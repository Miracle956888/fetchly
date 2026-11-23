import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import type { Server } from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../app.js';
import { env } from '../config/env.js';
import { db, initDatastore } from '../db/index.js';

let root: string;
let server: Server;
let origin: string;

beforeAll(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), 'fetchly-app-test-'));
  await mkdir(path.join(root, 'assets'));
  await writeFile(path.join(root, 'index.html'), '<html>Fetchly test application</html>');
  await writeFile(path.join(root, 'assets', 'app.js'), 'console.log("app");');
  await initDatastore();
  server = createApp(root).listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Expected TCP address');
  origin = `http://127.0.0.1:${address.port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => server.close((err) => err ? reject(err) : resolve()));
  await rm(root, { force: true, recursive: true });
});

describe('same-origin web service', () => {
  it('serves the SPA, its assets and browser navigation with a compatible CSP', async () => {
    const home = await fetch(origin);
    expect(home.status).toBe(200);
    expect(await home.text()).toContain('Fetchly test application');
    expect(home.headers.get('content-security-policy')).toContain("script-src 'self'");
    expect(home.headers.get('content-security-policy')).toContain("img-src 'self' data: https:");
    const page = await fetch(`${origin}/admin/login`, { headers: { accept: 'text/html' } });
    expect(await page.text()).toContain('Fetchly test application');
    expect((await fetch(`${origin}/assets/app.js`)).status).toBe(200);
    expect((await fetch(`${origin}/assets/missing.js`)).status).toBe(404);
  });

  it('keeps API responses and unknown API paths separate from the SPA', async () => {
    const health = await fetch(`${origin}/api/v1/health`);
    expect(health.status).toBe(200);
    expect(await health.json()).toMatchObject({ status: 'ok', persistence: 'memory' });
    const missing = await fetch(`${origin}/api/v1/not-a-route`);
    expect(missing.status).toBe(404);
    expect(await missing.json()).toMatchObject({ success: false, error: { code: 'NOT_FOUND' } });
  });

  it('does not rate-limit frequent liveness probes or consume the API budget', async () => {
    for (let i = 0; i < env.RATE_LIMIT_MAX_REQUESTS + 5; i++) {
      expect((await fetch(`${origin}/api/v1/health`)).status).toBe(200);
    }
    expect((await fetch(`${origin}/api/v1/platforms`)).status).toBe(200);
  });

  it('logs in and uses the same-origin HTTP-only admin cookie', async () => {
    const login = await fetch(`${origin}/api/v1/admin/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin },
      body: JSON.stringify({ email: env.ADMIN_EMAIL, password: env.ADMIN_PASSWORD }),
    });
    expect(login.status).toBe(200);
    const body = await login.json() as { data: { token?: string } };
    expect(body.data.token).toBeUndefined();
    const cookie = login.headers.get('set-cookie');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Strict');
    const me = await fetch(`${origin}/api/v1/admin/auth/me`, {
      headers: { cookie: cookie!.split(';')[0] },
    });
    expect(me.status).toBe(200);
    expect(await me.json()).toMatchObject({ success: true, data: { email: env.ADMIN_EMAIL } });
  });

  it('serves a query-bearing signed file URL and range requests on the same origin', async () => {
    const id = 'file-delivery-test';
    const content = Buffer.from('test video bytes');
    const filename = path.join(root, 'file.mp4');
    await writeFile(filename, content);
    await db().createJob({
      id,
      ipKey: 'test-ip',
      sourceUrl: 'https://youtube.com/watch?v=test',
      platform: 'youtube',
      title: 'Test',
      thumbnailUrl: null,
      format: 'mp4',
      quality: '720p',
      expiresMinutes: 30,
    });
    await db().updateJob(id, {
      status: 'COMPLETED', filePath: filename, fileName: 'test.mp4', fileSize: content.length,
    });
    const status = await (await fetch(`${origin}/api/v1/downloads/${id}`)).json() as {
      data: { downloadUrl: string };
    };
    expect(status.data.downloadUrl).toMatch(/^\/api\/v1\/downloads\/file-delivery-test\/file\?token=/);
    const file = await fetch(origin + status.data.downloadUrl);
    expect(file.status).toBe(200);
    expect(Buffer.from(await file.arrayBuffer())).toEqual(content);
    const range = await fetch(origin + status.data.downloadUrl, { headers: { range: 'bytes=1-3' } });
    expect(range.status).toBe(206);
    expect(range.headers.get('content-range')).toBe(`bytes 1-3/${content.length}`);
    expect(Buffer.from(await range.arrayBuffer())).toEqual(content.subarray(1, 4));
    expect((await fetch(`${origin}/api/v1/downloads/${id}/file?token=bad`)).status).toBe(401);

    // Expiry is visible even if the periodic cleanup worker has not run yet.
    await db().updateJob(id, { expiresAt: new Date(Date.now() - 1) });
    const expired = await (await fetch(`${origin}/api/v1/downloads/${id}`)).json() as {
      data: { status: string; downloadUrl: string | null };
    };
    expect(expired.data).toMatchObject({ status: 'expired', downloadUrl: null });
    expect((await fetch(origin + status.data.downloadUrl)).status).toBe(410);
  });
});
