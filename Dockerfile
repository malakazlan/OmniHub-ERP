# syntax=docker/dockerfile:1.7
# Omni Hub production image. Built by Coolify (or `docker build -t omnihub .`).
#
# Stage 1 installs all dependencies and builds Next.js.
# Stage 2 keeps only production dependencies, the build output and the Prisma
# schema/migrations, and starts through docker-entrypoint.sh, which applies
# pending migrations before the server accepts traffic.

FROM node:22-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json prisma.config.js ./
COPY prisma ./prisma
# Dependencies only; `prisma generate` runs through postinstall.
RUN npm ci --no-audit --no-fund
COPY . .
# DATABASE_URL is not needed at build time (the Prisma client is lazily created),
# but prisma.config.js reads the variable, so give it a harmless placeholder.
# The Turbopack cache is build-only and must not ship in the image.
RUN DATABASE_URL="mysql://build:build@localhost:3306/build" npm run build \
  && rm -rf .next/cache \
  && sed -i 's/$//' docker-entrypoint.sh

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
RUN addgroup -S omnihub && adduser -S omnihub -G omnihub
COPY --chown=omnihub:omnihub package.json package-lock.json prisma.config.js ./
COPY --chown=omnihub:omnihub prisma ./prisma
# Production dependencies, owned by the runtime user in the same layer so the
# ownership change does not duplicate the layer.
RUN npm ci --omit=dev --no-audit --no-fund \
  && npm cache clean --force \
  && chown -R omnihub:omnihub /app/node_modules
COPY --chown=omnihub:omnihub --from=builder /app/.next ./.next
COPY --chown=omnihub:omnihub --from=builder /app/public ./public
COPY --chown=omnihub:omnihub --from=builder /app/src/lib/dbConfig.mjs ./src/lib/dbConfig.mjs
COPY --chown=omnihub:omnihub scripts/db-check.mjs scripts/reconcile.mjs scripts/demo-data.mjs scripts/purge-tagged.mjs ./scripts/
# Taken from the builder stage, where Windows line endings were normalised.
COPY --chown=omnihub:omnihub --chmod=755 --from=builder /app/docker-entrypoint.sh ./docker-entrypoint.sh
USER omnihub
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health >/dev/null 2>&1 || exit 1
ENTRYPOINT ["./docker-entrypoint.sh"]
