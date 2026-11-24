# Experimental Fetchly beta on Netlify Server

This deploy runs **both the website and the Express API on Netlify**. It does not proxy to
Render, so it may use a different source-facing IP; that does **not** guarantee YouTube or
any other source will permit downloads. The existing Render service is not changed by the
Netlify configuration.

The old Netlify configuration published only a static frontend. Opening the homepage could
work while `/api/v1/health` and `/api/v1/platforms` returned Netlify's HTML 404 page. A
static drag-and-drop upload of `client/dist` is still frontend-only and will not fix that.

## Before deploying

1. Check that your team is eligible for [Netlify Server Early Access](https://docs.netlify.com/build/server/)
   on a credit-based plan (or an Enterprise plan with credits enabled). Server compute is free
   during Early Access, but other metered usage, including requests and bandwidth, still applies.
   Check the current plan, limits and credit usage before testing. This is an experiment, not a
   production-ready hosting arrangement.
2. Use a Git-connected project and ensure the branch you deploy contains the Netlify changes
   and has been **committed and pushed**. Netlify cannot build uncommitted workspace files.
   A deploy preview or a separate project is safer for the first test than replacing a live site.
3. In the project's **environment variables** in the Netlify dashboard, create these values:

   | Key | Value |
   | --- | --- |
   | `ADMIN_EMAIL` | An email address you will use to sign in to the admin page. |
   | `ADMIN_PASSWORD` | A unique randomly generated password of at least 16 characters. |
   | `JWT_SECRET` | A different randomly generated secret, preferably at least 32 characters. |

   If your plan lets you select scopes, include **Functions** (the default all-scopes setting
   on Free also includes it). Make the values available for the deploy context you are testing,
   such as Deploy Previews. Do not put secrets in `netlify.toml`, GitHub, screenshots or chat.
   The server refuses to start with the development defaults. Redeploy after changing a value.
4. Keep the Netlify project's **base directory at the repository root**, and use the build
   command and publish directory from `netlify.toml`. Remove old UI-specified overrides if they
   prevent this configuration being used. Do not set `NODE_ENV=production` for the **build**:
   it can cause Netlify to omit TypeScript/Vite dev dependencies. The server sets production mode
   itself at runtime. Do not set `DATABASE_URL`, `REDIS_URL`, `CLIENT_DIST_DIR`, `YTDLP_PATH`,
   `FFMPEG_PATH`, `DOWNLOAD_DIR` or `TEMP_DIR` for this Netlify beta unless you have reviewed
   the code and understand the impact. This configuration expects local ephemeral state and
   `/tmp` storage, not an external worker. The Netlify build forces the frontend to use the same
   origin; no `VITE_API_ORIGIN` or external API rewrite is needed.
5. Deploy that branch and check the Netlify deploy and Server logs. `netlify.toml` selects Node
   24 and the small, single-instance server. The build bundles Linux x86-64 media executables
   and a copy of the frontend for deep-link fallback. Do **not** add a `/* → /index.html`
   rewrite: Netlify applies rewrites before the server, so it would intercept API requests.
   If the deployment fails, keep the prior production deploy and inspect the error rather than
   assuming the beta is live. A large bundle or unsupported runtime can still prevent deployment.

## Test the actual Netlify deploy

Use the exact preview or production HTTPS URL for your deploy. Append each path below:

1. `/api/v1/health` — expect JSON with `"status":"ok"` and `"persistence":"memory"`.
2. `/api/v1/platforms` — expect JSON with `"success":true` and a platform list.
3. `/api/v1/health/engine` and `/api/v1/health/ffmpeg` — expect `"status":"ok"` from each.
4. Open `/admin/login` and sign in with the values you configured privately. This is same-origin;
   the admin cookie is Secure and works over HTTPS.
5. On the homepage, use a small public video you own or have permission to save. Analyze it,
   download MP4, then try MP3 and play both files. A green health check only verifies that the
   executables start; it does **not** verify source access or an actual download.

If the source requests bot verification or sign-in, it may be blocking this Netlify server too.
No account cookies or passwords are needed for this test; do not upload or share them. The app
cannot bypass that challenge. Share the public deploy URL and a screenshot of the error or a
sanitized build/runtime log if help is needed; remove credentials, signed URLs and private links.

## Limits and reliability

- The small instance currently has **1 GB RAM** and **512 MB writable `/tmp`**. Defaults are one
  download worker, one public analysis at a time, three pending jobs, a 50 MiB finished-file limit,
  a 128 MiB free-disk floor and a five-minute file expiration. The size and disk safeguards are
  sampled/best-effort, not hard bandwidth or disk quotas; temporary merging may need multiple copies.
- Files, analysis results, jobs, queue state, settings and analytics are **in memory or on local
  disk**. Netlify can stop an idle instance after five minutes and replaces instances on deploy or
  periodically; all this data may disappear, sometimes before a file expires. Reanalyze and retry.
  `max = 1` reduces wrong-instance routing but does not make state durable or eliminate overlap
  during deploy/replacement. Do not scale this beta out or use it for important data.
- Netlify requires response headers within 20 seconds. The Netlify frontend starts analysis as
  background work and polls; the original synchronous `/media/analyze` endpoint is retained for
  compatibility on other hosts and may time out on Netlify. Background jobs use `waitUntil`, but
  are still interrupted when an instance is replaced or its shutdown grace period ends.
- A local Netlify emulator does not enforce all platform limits. Binary execution, bundle upload,
  real outbound platform access and the complete download flow must be checked on the real deploy.
- Builds attempt the pinned official yt-dlp 2026.10.26 Linux executable, verified by its published
  SHA-256. If GitHub release assets are unreachable, they warn and use an **older** 2026.08.19
  executable from npm whose bytes match the official release checksum. FFmpeg 7.0.2 and ffprobe
  are also pinned and checksum-verified. Check the engine health version and build logs; older
  extractors can fail as platforms change. The binaries are generated at build time, not in Git.
- The first version was tested locally with Netlify's emulator and synthetic media. That is not
  evidence of a successful live Netlify deployment, nor of a real YouTube download.

For wider use, the project needs durable shared jobs/files, stronger egress and abuse controls,
monitoring, legal/contact review and a hosting design suited to sustained media processing.
