# Fetchly — Production Deployment Runbook

This document is the source of truth for deploying Fetchly. It reflects what was
**actually verified** in this repository (see “Verification results”), not aspirational
steps. Run `npm run verify:deploy` to re-run the automated gate at any time.

---

## 1. Architecture

Fetchly is a two-tier app that is deliberately deployable in two topologies:

| Topology | Frontend | API | Auth credential |
| --- | --- | --- | --- |
| **Same-origin (recommended)** | static build behind Nginx / reverse proxy | same host, `/api/*` proxied | httpOnly `SameSite=Strict` cookie |
| **Split-origin** | Netlify / Vercel / cPanel static host | Render / VPS on its own host | bearer token (auto) or `SameSite=None` cookie |

- **Frontend:** React 18 + Vite 6 (static SPA). No SSR. Code-split admin chunk.
- **Backend:** Node 20 + Express 4 (TypeScript ESM), single `node dist/server.js`.
- **Queue:** BullMQ + Redis in production; in-process FIFO in dev / ephemeral mode.
- **Database:** MySQL 8 via Prisma. In-memory adapter in dev / ephemeral mode only.
- **Media engine:** yt-dlp + FFmpeg. Bundled in the Docker images; must be installed
  manually on bare-metal hosts.

There are **no WebSockets**; job progress is client-poll over HTTP, so any static +
Node host works.

---

## 2. Hosting configurations

### A. Docker Compose (full stack, one VPS) — recommended

```bash
cp .env.example .env        # set JWT_SECRET, ADMIN_PASSWORD, MYSQL_*
docker compose up -d --build
```

Migrations run automatically from the container entrypoint. Nginx terminates at the
edge and routes `/api/` to the API and everything else to the static frontend.

### B. Netlify (frontend) + Render (API) — free tier

1. Push the repo to GitHub.
2. **Frontend (Netlify):** connect repo; build command `npm ci && npm run build -w client`;
   publish dir `client/dist`. Set env `VITE_SITE_URL` (and `VITE_API_ORIGIN` only if the API
   is on a different origin). `netlify.toml` supplies the SPA fallback + cache headers.
3. **API (Render):** New → Blueprint → select repo. `render.yaml` builds `server/Dockerfile`.
   Render prompts for `CLIENT_URL`, `ADMIN_EMAIL`; it generates `JWT_SECRET`/`ADMIN_PASSWORD`.
   The free tier has no MySQL/Redis, so the blueprint sets `ALLOW_EPHEMERAL_STORAGE=true`
   **explicitly** (data resets on sleep/redeploy). For persistence, attach MySQL + Redis,
   set `DATABASE_URL`/`REDIS_URL` and flip that to `false`.

### C. cPanel / shared hosting

See [`docs/CPANEL.md`](docs/CPANEL.md). Use the split-origin topology and build the client
with `VITE_API_ORIGIN`.

---

## 3. Environment variables (names only — never commit values)

Server (runtime):
`NODE_ENV` `PORT` `LOG_LEVEL` `LOG_DIR` `CLIENT_URL` `API_URL` `CORS_ORIGINS`
`DATABASE_URL` `REDIS_URL` `ALLOW_EPHEMERAL_STORAGE` `JWT_SECRET` `JWT_EXPIRES_IN`
`ADMIN_EMAIL` `ADMIN_PASSWORD` `COOKIE_SAMESITE` `DOWNLOAD_DIR` `TEMP_DIR`
`DOWNLOAD_EXPIRATION_MINUTES` `TEMP_FILE_RETENTION_MINUTES` `MAX_DOWNLOAD_SIZE_MB`
`MAX_CONCURRENT_JOBS_PER_IP` `MIN_FREE_DISK_MB` `RATE_LIMIT_WINDOW_MS`
`RATE_LIMIT_MAX_REQUESTS` `ANALYZE_LIMIT_MAX_REQUESTS` `LOGIN_LIMIT_MAX_REQUESTS`
`FFMPEG_PATH` `YTDLP_PATH`

Client (build-time, all optional):
`VITE_API_ORIGIN` `VITE_SITE_URL` `VITE_CONTACT_EMAIL`

A complete annotated template lives in [`.env.example`](.env.example).
`.env` is git-ignored (`.gitignore` has `.env`, `.env.*`, `!.env.example`).

### Production gate

With `NODE_ENV=production` the API **exits at boot** unless:
- `JWT_SECRET` is set and is not the published dev default;
- `ADMIN_PASSWORD` is set (≥ 8 chars) and is not the published dev default;
- `DATABASE_URL` and `REDIS_URL` are set, **or** `ALLOW_EPHEMERAL_STORAGE=true`.

A missing/failed MySQL or Redis at boot is likewise fatal in production instead of
silently degrading to the in-memory store (which would discard all data on restart).

---

## 4. Database

- **Type:** MySQL 8 (utf8mb4), Prisma ORM.
- **Migrations:** `server/prisma/migrations/` (canonical). Apply with `npm run db:deploy`
  or automatically via the Docker entrypoint. Idempotent on already-migrated databases.
- **Legacy SQL:** `database/migrations/*.sql` mirrors the schema for manual import
  (phpMyAdmin) on hosts without Prisma CLI.
- **Seed:** `npm run db:seed` inserts the platform registry + admin account. The admin is
  also auto-seeded on first boot from `ADMIN_EMAIL`/`ADMIN_PASSWORD`.
- **Never** reset or drop a production database as part of a deploy.

---

## 5. Security posture (implemented)

- Helmet CSP/HSTS; `x-powered-by` disabled; `trust proxy` = 1 hop.
- CORS is an explicit allow-list (`CLIENT_URL` + `CORS_ORIGINS`), reflected per request;
  credentials enabled, so `*` is impossible.
- **CSRF guard** on all POST/PUT/PATCH/DELETE: allows same-origin (host match through the
  proxy) and configured origins; rejects any other browser `Origin`. This closes the
  body-less admin mutations (`/admin/jobs/:id/cancel`, …) that CORS preflight would not.
- Admin JWT in an httpOnly cookie; `SameSite` configurable; `Secure` in production and
  always when `SameSite=None`; cookie lifetime tied to `JWT_EXPIRES_IN`.
- Every admin route re-verified server-side (`requireAdmin`); UI guarding is UX only.
- Layered rate limits (global / analyze / login / polling), Zod validation on all input,
  SSRF-safe URL intake, signed short-lived delivery tokens, path-traversal-safe storage,
  no shell execution anywhere.
- Logger redacts cookies, authorization headers and password/token fields.

---

## 6. Verification results

Automated gate `npm run verify:deploy` (23 checks) — **all passing**:
build succeeds; production gate refuses insecure boot; server starts; health/platforms/
404/400 structured errors; anonymous admin → 401; published default password → 401;
real login → 200 + HttpOnly cookie; session persists; forged default-secret JWT → 401;
cross-site POST → 403; disallowed origin gets no CORS header; allowed origin reflected;
built HTML free of placeholder domains/localhost; hashed assets, robots.txt, og image present.

Unit tests: server 33 + client 13, all passing. `npm run lint` clean on both workspaces.
SPA routing verified by direct GET of every route (`/downloads`, `/admin/login`, …) → 200.

**Not verifiable in this environment (external requirements):**
- Real end-to-end media download: needs FFmpeg (installable only with root) and platforms
  that do not bot-check the egress IP. The engine layer reports honestly
  (`ENGINE_UNAVAILABLE`, `CONTENT_UNAVAILABLE`) rather than failing silently.
- Real-browser responsive/console checks: no browser binary is available here. The CSS and
  layout were not modified by this work; the repo ships committed screenshots from a prior
  real-browser pass (`scripts/shots/`).
- Executing `prisma migrate deploy` against a live MySQL: no MySQL server is reachable from
  this sandbox. The migration SQL is the same DDL that the project has always shipped in
  `database/migrations/`, written idempotently (`IF NOT EXISTS`) so it is safe on both fresh
  and already-provisioned databases. Run `npm run db:deploy` against a scratch database as
  part of your first real deploy to confirm.

---

## 7. Deploy checklist

- [ ] `npm run verify:deploy` green
- [ ] `.env` created from `.env.example` with unique `JWT_SECRET`, `ADMIN_PASSWORD`
- [ ] `DATABASE_URL` / `REDIS_URL` set (or explicit `ALLOW_EPHEMERAL_STORAGE=true`)
- [ ] `CLIENT_URL` (and `CORS_ORIGINS`) = real frontend origin(s), HTTPS
- [ ] Client built with `VITE_SITE_URL` (and `VITE_API_ORIGIN` if split-origin)
- [ ] TLS terminated; `COOKIE_SAMESITE` chosen for the topology
- [ ] Migrations applied (`db:deploy` or container entrypoint log)
- [ ] `/api/v1/health` and `/api/v1/health/database` return 200 on the live host
- [ ] Admin login → dashboard → logout works on the live host
- [ ] A hard refresh of a deep route (e.g. `/downloads`) does not 404
