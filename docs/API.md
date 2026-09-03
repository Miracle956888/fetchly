# Fetchly API Reference

Base path: `/api/v1` · Content type: `application/json`

Every successful response has the shape `{ "success": true, "data": … }`.
Every error has the shape `{ "success": false, "error": { "code", "message" } }`.

## Health

| Method | Path | Description |
| --- | --- | --- |
| GET | `/health` | API liveness, uptime, persistence mode |
| GET | `/health/database` | MySQL reachability (`200` / `503`) |
| GET | `/health/redis` | Redis reachability or `not-configured` |
| GET | `/health/ffmpeg` | FFmpeg availability + version |
| GET | `/health/engine` | yt-dlp availability + version |

## Platforms

### `GET /platforms`
Returns the platform registry (implemented + enabled state).

```json
{ "success": true, "data": [
  { "slug": "youtube", "name": "YouTube", "implemented": true, "enabled": true }
] }
```

## Media

### `POST /media/analyze`
```json
{ "url": "https://www.youtube.com/watch?v=…" }
```
Response:
```json
{
  "success": true,
  "data": {
    "id": "analysis-id",
    "platform": "youtube",
    "title": "Example Video",
    "duration": 320,
    "thumbnail": "https://…",
    "uploader": "Channel Name",
    "webpageUrl": "https://…",
    "formats": [
      { "id": "v1080", "kind": "video", "container": "mp4", "quality": "1080p",
        "height": 1080, "estimatedSize": 48211320, "converted": false },
      { "id": "a320", "kind": "audio", "container": "mp3", "quality": "320 kbps",
        "bitrate": 320, "estimatedSize": 12800000, "converted": true }
    ]
  }
}
```
Formats reflect **only what the source reports** — never invented.

Errors: `INVALID_URL`, `UNSUPPORTED_PLATFORM`, `PLATFORM_DISABLED`, `PRIVATE_CONTENT`,
`CONTENT_UNAVAILABLE`, `ENGINE_UNAVAILABLE`, `TIMEOUT`, `RATE_LIMITED`, `SOURCE_UNAVAILABLE`.

## Downloads

### `POST /downloads`
```json
{ "analysisId": "analysis-id", "format": "mp4", "quality": "720p" }
```
`format` is `mp4` or `mp3`; `quality` must match one of the analyzed options
(e.g. `"720p"`, `"320 kbps"`).

Response `201`:
```json
{ "success": true, "data": { "jobId": "job-id", "status": "queued" } }
```
Errors: `NOT_FOUND` (analysis expired), `VALIDATION_ERROR`, `JOB_LIMIT_REACHED`, `STORAGE_FULL`.

### `GET /downloads/:jobId`
```json
{
  "success": true,
  "data": {
    "id": "job-id", "status": "downloading", "progress": 64,
    "platform": "tiktok", "title": "…", "format": "mp4", "quality": "1280p",
    "fileSize": null, "fileName": null,
    "downloadedBytes": 57400000, "speedBps": 2400000,
    "errorCode": null, "errorMessage": null,
    "downloadUrl": "/api/v1/downloads/job-id/file?token=…",
    "expiresAt": "2026-08-24T10:47:55.854Z", "createdAt": "2026-08-24T10:17:48.398Z"
  }
}
```
- `fileSize` — canonical size in **bytes**, read from the finished file on disk
  (never estimated). `downloadedBytes` / `speedBps` are live engine telemetry.
- `downloadUrl` — signed, short-lived delivery URL; only present once the file
  is ready. Tokens are HMAC-signed per job and expire in 10 minutes.
- Status values: `queued`, `analyzing`, `downloading`, `processing`,
  `completed`, `failed`, `cancelled`, `expired`.

### `GET /downloads/:jobId/file?token=…`
Streams the finished file. Server-side checks: job exists → completed →
unexpired → signed token valid for this job → file exists → path confined to
the storage directory. Responses carry:

```
Content-Type: video/mp4 | audio/mpeg        (actual file type)
Content-Disposition: attachment; filename="…"; filename*=UTF-8''…
Content-Length: <actual byte size>
Accept-Ranges: bytes                        (206 Partial Content supported)
```

Delivery is recorded server-side (`download_requested` at start,
`download_completed` / `download_failed` at stream close) and the job's
`deliveredAt` / `deliveryCount` are updated — analytics distinguish
*files generated* from *files actually delivered*.
Errors: `FILE_NOT_FOUND`, `FILE_EXPIRED`, `NOT_FOUND`, `UNAUTHORIZED`.

### `POST /downloads/:jobId/events`
Allow-listed client delivery events: `{ "type": "download_started" }`.
Client-reported data is never trusted for sizes — the server keeps its own
authoritative byte counts. Unknown event types are rejected with `VALIDATION_ERROR`.

### `DELETE /downloads/:jobId`
Cancels an active job (kills the engine child process) and deletes any output file.

### `DELETE /downloads/:jobId/record`
Removes the job record entirely (admin-facing cleanup for anonymous users).

## Admin

All `/admin/*` routes require an authenticated administrator (JWT in an
httpOnly cookie, or `Authorization: Bearer`). Every route re-verifies
authorization server-side.

| Method | Path | Description |
| --- | --- | --- |
| POST | `/admin/auth/login` | `{ email, password }` → sets session cookie |
| POST | `/admin/auth/logout` | Clears the session |
| GET | `/admin/auth/me` | Current session identity |
| GET | `/admin/stats` | Totals, success rate, 14-day series, platform/format splits, data processed/delivered (DB aggregations) |
| GET | `/admin/storage` | Temp-storage usage: used/free bytes, file count, expired awaiting cleanup |
| GET | `/admin/jobs?status=&platform=&search=&page=` | Paginated job list |
| POST | `/admin/jobs/:id/cancel` | Cancel a stuck job |
| POST | `/admin/jobs/:id/retry` | Re-queue a failed/cancelled/expired job |
| DELETE | `/admin/jobs/:id` | Delete a job and its file |
| GET | `/admin/platforms` | Registry with enabled state |
| PUT | `/admin/platforms/:slug` | `{ "enabled": true|false }` |
| GET | `/admin/users` | Operator accounts |
| GET / PUT | `/admin/settings` | Key/value operational overrides |
| GET | `/admin/analytics` | Aggregate event counters |
| GET | `/admin/events?limit=100` | Structured job event log |
| GET | `/admin/system` | Health snapshot of every subsystem + limits |

## Error codes

`INVALID_URL` · `UNSUPPORTED_PLATFORM` · `PLATFORM_DISABLED` · `PRIVATE_CONTENT` ·
`CONTENT_UNAVAILABLE` · `VIDEO_NOT_FOUND` · `SOURCE_UNAVAILABLE` · `ENGINE_UNAVAILABLE` ·
`RATE_LIMITED` · `DOWNLOAD_FAILED` · `PROCESSING_FAILED` · `FFMPEG_FAILED` ·
`FILE_NOT_FOUND` · `FILE_EXPIRED` · `TIMEOUT` · `NOT_FOUND` · `UNAUTHORIZED` ·
`FORBIDDEN` · `VALIDATION_ERROR` · `JOB_LIMIT_REACHED` · `STORAGE_FULL` · `SERVER_ERROR`
