#!/bin/sh
# Fetchly API entrypoint.
#
# Applies database migrations before the app accepts traffic, so a fresh
# container is always schema-current. `prisma migrate deploy` is idempotent:
# already-applied migrations are skipped and the history table is created on
# first run. When no DATABASE_URL is configured (ephemeral demo mode) there is
# nothing to migrate, so we start immediately.
set -e

if [ -n "$DATABASE_URL" ]; then
  echo "[entrypoint] DATABASE_URL set — applying schema migrations…"
  npx --no-install prisma migrate deploy
else
  echo "[entrypoint] no DATABASE_URL — skipping migrations (ephemeral mode)."
fi

exec "$@"
