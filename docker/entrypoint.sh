#!/bin/sh
# Production entrypoint: apply Prisma migrations, then start Next.js standalone server.
set -eu

if [ "${RUN_MIGRATE_ON_START:-true}" = "true" ]; then
  echo "[arka-pcr] Running prisma migrate deploy..."
  ./node_modules/.bin/prisma migrate deploy
  echo "[arka-pcr] Migrations applied."
else
  echo "[arka-pcr] Skipping migrate (RUN_MIGRATE_ON_START=${RUN_MIGRATE_ON_START})."
fi

mkdir -p "${UPLOAD_DIR:-/app/uploads}"

echo "[arka-pcr] Starting Next.js on ${HOSTNAME:-0.0.0.0}:${PORT:-3000}..."
exec "$@"
