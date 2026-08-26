#!/bin/sh
# Production entrypoint: apply Prisma migrations, then start Next.js standalone server.
# Standalone image copies prisma package dirs but not node_modules/.bin — invoke CLI via node.
set -eu

if [ "${RUN_MIGRATE_ON_START:-true}" = "true" ]; then
  echo "[arka-pcr] Running prisma migrate deploy..."
  if [ -x ./node_modules/.bin/prisma ]; then
    ./node_modules/.bin/prisma migrate deploy
  elif [ -f ./node_modules/prisma/build/index.js ]; then
    node ./node_modules/prisma/build/index.js migrate deploy
  else
    echo "[arka-pcr] ERROR: Prisma CLI not found in image (node_modules/prisma)."
    exit 1
  fi
  echo "[arka-pcr] Migrations applied."
else
  echo "[arka-pcr] Skipping migrate (RUN_MIGRATE_ON_START=${RUN_MIGRATE_ON_START})."
fi

mkdir -p "${UPLOAD_DIR:-/app/uploads}"

echo "[arka-pcr] Starting Next.js on ${HOSTNAME:-0.0.0.0}:${PORT:-3000}..."
exec "$@"
