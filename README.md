# Fetchly — Multi-Platform Media Downloader

Fetchly is a web application for downloading **publicly accessible** media from supported
platforms. Paste a link → analyze → choose format & quality → download MP4 or MP3 with real
progress, a job queue, FFmpeg processing, automatic cleanup, and an admin dashboard. The free
Render configuration is intended for a **limited beta**, not a reliable production service.

The UI is an original design built around a **white + `#00C9A7`** identity. It takes *functional*
inspiration from simple downloader tools (paste → inspect → pick → download) and queue-based
download managers, but shares no layout, branding, or assets with any existing product.

> **Responsible use:** Fetchly is intended for content you own, public-domain content, or content
> you have explicit permission to save. It does **not** bypass DRM, authentication, paywalls, or
> any access control, and it refuses private or restricted media.

---

## Enhancement phase (current)

- **Automatic URL analysis** — paste or type a link; valid URLs are analyzed automatically
  (600 ms debounce, no Analyze button). Normalized-URL de-duplication prevents repeat
  requests (`www.`/`m.` prefixes and tracking params stripped); replacing the URL aborts the
  in-flight request via AbortController. Clipboard button and drag-and-drop paste included,
  with live status copy ("Checking link…", "Analyzing TikTok video…", "Ready").
- **Light & dark themes** — class-based dark mode with semantic tokens
  (`#0B0F0E` background, `#17201E` cards, mint accent retained), smooth color transitions,
  localStorage persistence (`fetchly-theme`) with system-preference fallback and no
  flash-of-wrong-theme (inline pre-paint script).
- **Real delivery pipeline** — Download creates a queued job; the worker downloads, FFmpeg
  processes, and the finished file is served through a signed, short-lived delivery URL with
  correct `Content-Type`, `Content-Disposition: attachment`, actual `Content-Length` and HTTP
  Range support (206). No file paths are ever exposed; tokens are HMAC-signed per job.
- **Actual file-size tracking** — the canonical `file_size_bytes` is read from the finished
  file on disk (verified equal to DB value and HTTP Content-Length); live telemetry
  (bytes downloaded, speed) is parsed from the engine and shown in the UI alongside the
  canonical `formatFileSize()` formatter (B/KB/MB/GB/TB, 1024-based).
- **Delivery analytics** — processing events (`job_created → file_ready`) are recorded
  separately from delivery events (`download_requested → download_completed`), so the admin
  dashboard shows both *files generated* and *files actually delivered*, with data totals from
  DB aggregation queries, plus a temporary-storage monitor (used/free/files/expired).
- **Download history** — `/downloads` shows thumbnail, platform, format, quality, size,
  status and date with All/MP4/MP3/Completed/Failed filters. Expired files are reprocessed
  on "Download again" — never served from deleted storage.

## Features

- URL-first flow: paste → analyze → preview → choose format/quality → download
- Provider architecture (YouTube, TikTok, Instagram active; Facebook, X, Reddit, Vimeo, Twitch,
  Dailymotion, Pinterest on the registry roadmap)
- Honest results: only formats the source actually reports are shown; progress is real
- Queue-based download engine (BullMQ + Redis; in-process fallback for local dev)
- FFmpeg processing layer (remux when possible, MP3 conversion, timeouts, cleanup)
- Session download manager with multiple concurrent jobs, cancel, retry, remove
- Admin dashboard: live stats, charts, job management, platform toggles, users, analytics,
  system health, event logs, settings
- Automatic file expiration + cleanup workers (no media kept permanently)
- Security: Helmet, CORS allow-list, layered rate limiting, Zod validation, initial-host URL
  checks, JWT admin auth in httpOnly cookies, no shell execution
- Structured JSON logging with secret redaction and request ids
- Fully responsive, mobile-first UI · accessible (keyboard, ARIA, reduced motion)
- SEO landing pages, Open Graph/Twitter metadata, robots.txt and JSON-LD

## Technology stack

| Layer | Technology |
| --- | --- |
| Frontend | React 18, Vite 6, TypeScript, Tailwind CSS 4, React Router 6, TanStack Query 5, Lucide icons |
| Backend | Node.js 22 in Docker, Express 4, TypeScript (ESM), Zod, Helmet, CORS, express-rate-limit, pino |
| Queue | BullMQ + Redis (in-process dev fallback) |
| Media engine | yt-dlp (extraction/download) + FFmpeg (remux/convert) |
| Database | MySQL 8 + Prisma ORM |
| Infra | Docker, Docker Compose, Nginx |

## Project structure

```
fetchly/
├── client/                     # React app
│   ├── src/components/ui/      # design system (Button, Input, Card, Modal, Tabs, …)
│   ├── src/components/         # Navbar, Footer, UrlForm, MediaPreview, DownloadCard, …
│   ├── src/pages/              # Home, Downloads, platform SEO pages, legal, admin/
│   ├── src/contexts/           # session download manager
│   ├── src/hooks/              # usePlatforms, useJobPolling
│   ├── src/lib/api.ts          # typed API client (relative URLs, proxied)
│   └── public/                 # robots.txt, theme initializer, favicon
├── server/                     # Express API + workers
│   ├── prisma/schema.prisma    # MySQL schema + seed script
│   └── src/
│       ├── config/             # env validation, pino logger
│       ├── providers/          # MediaProvider interface + one class per platform
│       ├── services/engine/    # yt-dlp + FFmpeg wrappers (no shell, fixed args)
│       ├── services/           # analyzeService, downloadService, storage
│       ├── queues/             # BullMQ or in-process queue
│       ├── workers/            # standalone worker entry + cleanup worker
│       ├── controllers/ routes/ middleware/ utils/
│       └── db/                 # Datastore interface: Prisma(MySQL) + memory(dev)
├── database/migrations/        # mirrored SQL DDL (Prisma owns migrations)
├── docker/nginx/               # edge + static-site nginx configs
├── docker-compose.yml
└── docs/API.md                 # full REST API reference
```

## Installation

Requirements: Node ≥ 20 and npm (Node ≥ 22 is recommended for yt-dlp's YouTube JavaScript
solver). For the full pipeline: FFmpeg and yt-dlp; MySQL 8 and Redis 7 are optional.

```bash
npm ci
cp .env.example .env           # development defaults only; replace secrets for any deployment
```

Install media engines:

```bash
sudo apt-get install -y ffmpeg
pip3 install 'yt-dlp[default]' # or install the same extra with pipx
```

For YouTube, install Node 22+ and set `YTDLP_JS_RUNTIME=node` in `.env`. The `default` extra
includes the matching `yt-dlp-ejs` challenge scripts. Platform blocking and extractor changes can
still prevent downloads; see the [yt-dlp EJS guide](https://github.com/yt-dlp/yt-dlp/wiki/EJS).

### Database setup (optional in dev)

- **With MySQL:** set `DATABASE_URL` in `.env`, then
  `npm run db:generate && npm run db:migrate && npm run db:seed`.
- **Without:** leave `DATABASE_URL` empty. The API boots with an in-memory persistence adapter
  (logged loudly). Data does not survive restarts; use it only for development or a disposable beta.

### Redis setup (optional in dev)

- **With Redis:** set `REDIS_URL` → BullMQ queue + standalone worker.
- **Without:** leave empty → built-in in-process queue, which is lost on restart.

## Development commands

```bash
npm run dev          # API :3000 + Vite :5173 together
npm run dev:server   # API only
npm run dev:client   # frontend only
npm test             # server test suite (vitest)
npm run test -w client   # frontend unit tests
npm run lint         # both workspaces
npm run build        # server tsc + client production build
```

Optional offline browser smoke test (Linux/macOS): install Chromium, FFmpeg and yt-dlp, run
`npm run build`, then `CHROMIUM_PATH=/path/to/chromium npm run smoke:beta`. If the executables
are not on `PATH`, set `FFMPEG_PATH` and `YTDLP_PATH`. This exercises the real browser and media
engines with synthetic metadata and a local fixture; it does **not** test a live platform or Docker.

Open http://localhost:5173 — the dev server proxies `/api` to the backend.

Admin dashboard: http://localhost:5173/admin/login
Default credentials come from `.env` (`ADMIN_EMAIL` / `ADMIN_PASSWORD`). The admin account is
seeded automatically on first boot; change both values before any real deployment.

## Render free beta

The simplest $0 starting point is one Render Free Docker web service serving the website and API
from the same HTTPS origin. See **[docs/RENDER.md](docs/RENDER.md)** for the dashboard steps,
post-deploy checks, security caveats and important free-tier limits. Render can only deploy a
branch that has been committed and pushed to GitHub.

## Netlify Server experiment

A separate, experimental Netlify Server configuration runs the frontend and API on Netlify
instead of proxying to Render. It requires Early Access eligibility, private runtime secrets and
careful testing; its in-memory jobs and temporary files are disposable. See
**[docs/NETLIFY.md](docs/NETLIFY.md)** for setup, limitations and live-deploy checks. A different
cloud IP does not guarantee that a source will allow downloads.

## Docker deployment

The existing Compose stack is a separate, more involved setup; it was not validated as part of the
Render beta work. Before trying it, configure strong credentials in `.env` and review the SQL
migrations and persistent-storage requirements.

```bash
cp .env.example .env           # configure strong secrets first
docker compose up -d --build
```

Services: `nginx` (edge) → `frontend` (static build) + `backend` (API) + `worker`
(downloads/FFmpeg/cleanup) + `mysql` + `redis`. Generated media lives in the `media-storage`
volume shared by backend and worker.

### cPanel / shared hosting

A complete step-by-step guide (subdomains, static frontend upload, Node.js app
setup, FFmpeg + yt-dlp installation without GitHub, MySQL import, and the
`VITE_API_ORIGIN` cross-origin build) lives in [`docs/CPANEL.md`](docs/CPANEL.md).
If your shared plan blocks binary execution or long-running processes, use the
Docker Compose stack on a small VPS instead.

### Production notes

- Terminate TLS at Nginx or Cloudflare; set `CLIENT_URL`/`API_URL` to your real origin.
- Set strong `JWT_SECRET`, `MYSQL_*`, and `ADMIN_PASSWORD` values; never commit `.env`.
- The SQL in `database/migrations/` is loaded by the MySQL container only on first initialization.
  Plan and test an explicit migration process for subsequent schema changes.
- Tune `MAX_CONCURRENT_JOBS_PER_IP`, rate limits, `MAX_DOWNLOAD_SIZE_MB` and disk budget for
  your hardware; run one worker process per ~2 CPU cores.

## API documentation

Complete reference: [`docs/API.md`](docs/API.md).

Key endpoints: `GET /api/v1/health*` · `GET /api/v1/platforms` · `POST /api/v1/media/analyze` ·
`POST /api/v1/downloads` · `GET /api/v1/downloads/:jobId` · `GET /api/v1/downloads/:jobId/file` ·
`DELETE /api/v1/downloads/:jobId` · `/api/v1/admin/*` (authenticated).

## Security considerations

- **SSRF:** initial URLs are checked against provider hosts and reject literal IPs, localhost,
  private ranges, unusual ports and embedded credentials. These checks do not fully isolate
  extractor-initiated requests or redirects; use network-level egress controls before trusting
  this with sensitive internal services or broader public traffic.
- **Command injection:** yt-dlp and FFmpeg are spawned with fixed argument arrays built entirely
  server-side; no shell is involved; user text never becomes an argument.
- **Path traversal:** file names derive from server-generated UUIDs; download file names are
  sanitized before use in `Content-Disposition`.
- **DoS:** layered rate limits, per-IP job caps, bounded local queue/analysis concurrency,
  sampled file-size checks, disk-space checks and subprocess timeouts. These are best-effort
  safeguards, not a hard bandwidth quota or a replacement for production abuse protection.
- **Secrets:** avoid committing `.env`; HTTP request logs omit headers and query strings, and
  admin auth uses short-lived JWTs in httpOnly same-site cookies.
- **Admin:** every admin endpoint re-verifies authorization server-side; route guarding in the
  UI is UX, not security.

## Troubleshooting

| Symptom | Cause / fix |
| --- | --- |
| `ENGINE_UNAVAILABLE` | yt-dlp missing or not on PATH (`YTDLP_PATH` to override) |
| FFmpeg health `unavailable` | Install FFmpeg or set `FFMPEG_PATH` |
| YouTube says “unavailable” | Cloud IPs may be blocked, or yt-dlp/EJS may need updating; some media remains inaccessible |
| Jobs stuck `queued` | Check Redis (`/api/v1/health/redis`); worker process running? |
| Admin login loops | Clock skew (JWT), or `JWT_SECRET` changed between boots |
| “in-memory persistence” warning | `DATABASE_URL` not set or MySQL unreachable — expected for the disposable Render beta |

## Testing

```bash
npm test                    # server: URL/SSRF validation, provider registry, datastore
npm run test -w client      # client: formatting + URL validation utilities
```

The server suite covers same-origin routing, admin cookies, signed downloads, queue limits,
process cancellation, size checks and cleanup. After deploying, test MP4 and MP3 with media you
have permission to save: a passing health endpoint does not prove a platform is reachable.
