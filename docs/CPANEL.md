# Hosting Fetchly on cPanel (shared hosting)

> **Honest expectation check first.** Fetchly needs three things shared hosting
> often restricts: a **Node.js runtime**, the ability to **execute binaries**
> (FFmpeg + yt-dlp), and a **long-running server process**. Many cPanel hosts
> (Hostinger Premium, NameHero, A2, InMotion, etc.) support all of this via
> "Setup Node.js App" + SSH. Some ultra-cheap plans don't — if your host lacks
> the Node.js selector *and* SSH, use a $5 VPS with the included
> `docker-compose.yml` instead (see README). Everything below assumes:
> cPanel **with** "Setup Node.js App" **and** SSH/Terminal access.

You will run:
- **Website** (static build) on `dl.yourdomain.com`
- **API** (Node app) on `api.yourdomain.com`
- **MySQL** from cPanel (optional but recommended)
- **FFmpeg + yt-dlp** as static files in your home directory

---

## Step 0 — Prepare on your own PC

```powershell
cd C:\path\to\fetchly
npm install
# Build the frontend pointed at your future API subdomain:
npx vite build --outDir dist client --config client/vite.config.ts   # or simpler below
```

Easiest: set the env var for the build, then build normally:

```powershell
cd client
set VITE_API_ORIGIN=https://api.yourdomain.com
npx vite build
```

(On PowerShell use `$env:VITE_API_ORIGIN="https://api.yourdomain.com"` instead of `set`.)

Result: `client/dist/` = your website files.

Also on your PC, make a zip of the **server** for upload:
include `server/` **without** `node_modules`, plus `database/`.
(From the project root: select `server` + `database` folders → send to zip.)

## Step 1 — Create two subdomains in cPanel

- `dl.yourdomain.com` → folder `public_dl` (or whatever cPanel creates)
- `api.yourdomain.com` → folder `api` (we won't serve it with Apache; the
  Node app binds it via Passenger)

Enable **AutoSSL/HTTPS** for both (cPanel → SSL/TLS Status → Run AutoSSL).

## Step 2 — Upload the website

1. File Manager → open the `dl` folder.
2. Upload the **contents** of `client/dist/` (index.html + assets/).
3. Create a file named `.htaccess` there with:

```apache
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^ /index.html [L]
```

Visit `https://dl.yourdomain.com` — the UI loads (API calls will fail until
step 5; that's expected).

## Step 3 — Upload the server

1. File Manager → home directory → create folder `fetchly`.
2. Upload your `server+database.zip`, extract into `~/fetchly/`
   so you get `~/fetchly/server/...` and `~/fetchly/database/...`.

## Step 4 — Install the two engines (SSH / cPanel Terminal)

```bash
mkdir -p ~/bin
# FFmpeg static build (not from GitHub):
cd /tmp
curl -LO https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz
tar xf ffmpeg-release-amd64-static.tar.xz
cp ffmpeg-*-static/ffmpeg ~/bin/ffmpeg
chmod 755 ~/bin/ffmpeg
~/bin/ffmpeg -version          # must print a version

# yt-dlp from PyPI (not from GitHub):
python3 -m pip install --user yt-dlp
chmod 755 ~/.local/bin/yt-dlp 2>/dev/null
~/.local/bin/yt-dlp --version  # must print a date-version
```

If `pip` is missing, ask your host to enable Python, or upload the `yt-dlp`
linux binary your host allows. **Checkpoint:** both `-version` commands work.
If your host says "Operation not permitted" on exec, this host cannot run
Fetchly's pipeline — use a VPS.

## Step 5 — Create the Node.js app in cPanel

cPanel → **Setup Node.js App** → ADD APPLICATION:

| Field | Value |
|---|---|
| Node.js version | highest available (18+) |
| Application mode | Production |
| Application root | `fetchly/server` |
| Application URL | `api.yourdomain.com` |
| Application startup file | `dist/server.js` |

Then in the app screen:

1. **Run NPM Install** (button).
2. Add **environment variables** (same screen):

```
NODE_ENV=production
CLIENT_URL=https://dl.yourdomain.com
JWT_SECRET=<long random string>
ADMIN_EMAIL=you@yourdomain.com
ADMIN_PASSWORD=<strong password>
DOWNLOAD_DIR=/home/YOURCPANELUSER/fetchly/storage/downloads
TEMP_DIR=/home/YOURCPANELUSER/fetchly/storage/temp
FFMPEG_PATH=/home/YOURCPANELUSER/bin/ffmpeg
YTDLP_PATH=/home/YOURCPANELUSER/.local/bin/yt-dlp
```

(Replace `YOURCPANELUSER`. Add `DATABASE_URL` in step 6 once the DB exists.)

3. **Build the server code.** The zip has source only; you need `dist/`.
   If the Node app screen offers "Run JS script / console", run:
   `npx tsc -p tsconfig.json`. Otherwise via SSH:

```bash
source ~/nodevenv/fetchly/server/20/bin/activate   # path shown in cPanel Node screen
cd ~/fetchly/server
npm install
npx tsc -p tsconfig.json     # creates dist/
```

4. Press **RESTART** on the app.

**Checkpoint:** `https://api.yourdomain.com/api/v1/health` returns
`{"status":"ok",...}` and `/api/v1/health/engine` + `/health/ffmpeg` show
`"status":"ok"`.

## Step 6 — MySQL (recommended)

1. cPanel → MySQL Databases: create DB `fetchly`, user `fetchly`, strong
   password, grant ALL.
2. phpMyAdmin → select the DB → Import → choose
   `database/migrations/0001_init.sql` (it now contains everything for fresh
   installs) → Go. (Delete the first two lines `CREATE DATABASE/USE` if
   phpMyAdmin complains.)
3. Add env var in the Node app:

```
DATABASE_URL=mysql://fetchly:PASSWORD@localhost:3306/YOURCPANELUSER_fetchly
```

(cPanel DB names are prefixed with your username — copy the exact name from
the MySQL Databases page.)

4. Generate the Prisma client (SSH, inside the virtualenv):

```bash
cd ~/fetchly/server
npx prisma generate
```

5. Restart the app. Admin → System should show **Database: Ok (Mysql)**.

## Step 7 — Log in & use

- Site: `https://dl.yourdomain.com`
- Admin: `https://dl.yourdomain.com/admin/login` — wait, admin is part of the
  same SPA, so use the **dl** domain with your `ADMIN_EMAIL/ADMIN_PASSWORD`.
- Paste a link → it analyzes → download works.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| `api` subdomain returns 500/502 | cPanel Node app → check "stderr" log; usually startup file path wrong or `dist/` missing |
| `ENGINE_UNAVAILABLE` | `FFMPEG_PATH`/`YTDLP_PATH` wrong — verify with the exact paths from step 4 (`ls -la ~/bin/ffmpeg`) |
| `Operation not permitted` when running ffmpeg | Host blocks exec in home dir → try `~/fetchly/server/bin/` instead; if still blocked, host can't run this app → VPS |
| Downloads die mid-way on big files | Passenger reaps idle workers on some plans; keep videos short or move to VPS |
| UI says "Could not reach the server" | `VITE_API_ORIGIN` wasn't set at build time → rebuild client with it and re-upload `dist` |
| Login fails | `CLIENT_URL` must exactly match the site origin (https + subdomain) |
| 403 on admin routes | Cookies need HTTPS — ensure AutoSSL finished for the api domain too |

## When to switch to a VPS instead

If your host blocks binary execution, kills long jobs, or lacks Node 18+,
rent a $5–6/mo VPS (Ubuntu 22/24) and run the one-command production stack:

```bash
git clone-or-upload the project
cp .env.example .env   # fill secrets
docker compose up -d --build
```

That gives you Nginx + MySQL + Redis + API + workers exactly as designed, with
none of the shared-hosting compromises. See README → Docker deployment.
