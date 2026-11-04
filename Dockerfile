# APMS / ARKA Plant Management System (Next.js 13 + Prisma) — Docker Compose image.
# Pattern: multi-stage build → standalone Next.js on Node 24.22.1 (Debian bookworm).
# Pinned to the 21 Oct 2026 security release (Brotli CVE-2026-111497, undici 7.30.1).
# Node 20 is EOL and does not receive that fix.
#
# Use the full bookworm tag (not -slim): Prisma schema engine needs OpenSSL CLI /
# libssl detection. apt-get from deb.debian.org fails on some hosts (NOSPLIT / 133 B),
# so we cannot install openssl at build time — the full bookworm image already has it.

FROM node:24.22.1-bookworm AS deps
WORKDIR /app

COPY package.json package-lock.json .npmrc ./
COPY prisma ./prisma

RUN npm ci

FROM node:24.22.1-bookworm AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
# Prisma generate needs a URL shape only — no live DB during image build.
ENV DATABASE_URL="mysql://build:build@127.0.0.1:3306/build"
# Subpath deploy: build dengan --build-arg NEXT_PUBLIC_BASE_PATH=/apms
ARG NEXT_PUBLIC_BASE_PATH=
ENV NEXT_PUBLIC_BASE_PATH=${NEXT_PUBLIC_BASE_PATH}

RUN npx prisma generate
RUN npm run build

# Optional one-off image: seed, fleet:sync, legacy migration scripts (profile "tools")
FROM builder AS tools
WORKDIR /app
ENV NODE_ENV=production
CMD ["bash"]

FROM node:24.22.1-bookworm AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV UPLOAD_DIR=/app/uploads

RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs \
  && mkdir -p /app/uploads \
  && chown -R nextjs:nodejs /app

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma

# Keep public basePath available at runtime (SSR / SessionProvider); value also baked at build.
ARG NEXT_PUBLIC_BASE_PATH=
ENV NEXT_PUBLIC_BASE_PATH=${NEXT_PUBLIC_BASE_PATH}

COPY --chown=nextjs:nodejs docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

USER nextjs

EXPOSE 3000

ENTRYPOINT ["/entrypoint.sh"]
CMD ["node", "server.js"]
