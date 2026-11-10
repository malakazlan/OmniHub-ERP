#!/bin/sh
# Container start: wait for the database, apply pending migrations, seed the
# administrator on first boot (idempotent), then start Next.js.
set -eu

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL is not set" >&2
  exit 1
fi
if [ -z "${JWT_SECRET:-}" ]; then
  echo "JWT_SECRET is not set" >&2
  exit 1
fi

echo "Waiting for database..."
attempt=0
until node scripts/db-check.mjs >/dev/null 2>&1; do
  attempt=$((attempt + 1))
  if [ "$attempt" -ge 30 ]; then
    echo "Database not reachable after 30 attempts" >&2
    node scripts/db-check.mjs || true
    exit 1
  fi
  sleep 2
done

echo "Applying migrations..."
npx prisma migrate deploy

if [ -n "${ADMIN_EMAIL:-}" ] && [ -n "${ADMIN_PASSWORD:-}" ]; then
  echo "Ensuring administrator exists..."
  node prisma/seed.mjs
fi

echo "Starting Omni Hub on port ${PORT:-3000}"
exec npx next start -p "${PORT:-3000}"
