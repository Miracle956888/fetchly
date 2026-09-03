# Upgrading Fetchly (Windows / any OS)

This document explains how to replace an older downloaded copy of this
project with the current one, and lists everything the current version fixes.

## What's included in the current version

Everything from the original build **plus**:

### Features
- **Automatic URL analysis** — paste a link and it analyzes itself (debounced,
  no Analyze button), with a clipboard-paste button and drag & drop support.
- **Light & dark themes** — toggle in the header, persisted in
  localStorage (`fetchly-theme`), system-preference default, no flash on load.
- **Size estimates before download** — video/audio rows show `~X MB (estimated)`
  derived from source metadata; after processing the *exact* filesystem size is shown.
- **Real device download** — signed, expiring delivery URLs, correct
  `Content-Type` / `Content-Disposition`, HTTP Range (206) support.
- **Download history** (`/downloads`) with All / MP4 / MP3 / Completed / Failed
  filters; deleted/expired records show a graceful "record no longer exists"
  card with *Download Again* (reprocesses; never serves deleted files).
- **Admin**: data-delivered vs data-processed stats, storage monitor
  (used / free / files / expired), delivery-event log.

### Fixes
- Malformed or oversized JSON bodies now return 400/413 instead of a generic 500.
- **Rate-limit lockout fixed** — job-status polling and token-protected file
  delivery use their own generous limiter, so watching a download can no longer
  exhaust the global budget; expensive endpoints stay strictly protected.
- **Polling stops for deleted records** — stale history entries no longer
  hammer the server forever.
- **Accessibility (WCAG 2 AA)** — text-safe accent and status colors in light
  mode (0 axe violations on audited pages, both themes).
- Responsive: full-width Download buttons on phones, wrapped format rows,
  no overflow at 320–375px.
- yt-dlp failures are now logged with stderr and mapped to actionable messages
  (e.g. "platform changed its response format — run `yt-dlp -U`").

### New in this release
- **File logging** — every warning/error is written to
  `server/logs/error.log`; the full audit trail to `server/logs/server.log`
  (folder created automatically; override with `LOG_DIR` in `.env`).
  Passwords/tokens/cookies are redacted from all logs.
- Dependency refresh (all packages updated to latest compatible versions).

## Upgrade steps (Windows)

1. In the PowerShell window running the app, press `Ctrl+C`, then close it.
2. Rename your old folder, e.g.
   `fetchlt-new-updated` → `fetchly-backup` (keep it until you confirm the new one works).
3. Download the **latest** project zip from the Arena workspace and extract it
   (e.g. `C:\Users\<you>\Downloads\fetchly`).
4. If you ever created a custom `.env` in the old folder, copy it into the new
   one. (If not, skip — defaults are fine.)
5. Open a **new** PowerShell window in the new folder and run:
   ```powershell
   npm install
   yt-dlp -U                 # keep the media engine current (fixes TikTok/YouTube breakages)
   npm run dev
   ```
6. Open http://localhost:5173 and paste a link. Verify engines at
   http://localhost:3000/api/v1/health/ffmpeg and `.../health/engine`
   (or Admin → System).

## If something fails

Open `server\logs\error.log` — the last line contains the exact error
(including yt-dlp's own message). Send that line when asking for help.

## Keeping engines current (recommended monthly)

```powershell
yt-dlp -U
winget upgrade Gyan.FFmpeg
```

Platforms change their sites regularly; an up-to-date yt-dlp is the #1 fix for
"analysis failed" errors.
