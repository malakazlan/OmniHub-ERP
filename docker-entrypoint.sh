#!/bin/sh
# Container start: wait for the database, apply pending migrations, seed the
# administrator on first boot (idempotent), then start Next.js.
set -eu

# Some env-file loaders keep surrounding quotes; strip them so the URL parses.
strip_quotes() { printf '%s' "$1" | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//"; }
DATABASE_URL=$(strip_quotes "${DATABASE_URL:-}")
JWT_SECRET=$(strip_quotes "${JWT_SECRET:-}")
ADMIN_EMAIL=$(strip_quotes "${ADMIN_EMAIL:-}")
ADMIN_PASSWORD=$(strip_quotes "${ADMIN_PASSWORD:-}")
export DATABASE_URL JWT_SECRET ADMIN_EMAIL ADMIN_PASSWORD

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
until node scripts/db-check.mjs > /tmp/db-check.log 2>&1; do
  attempt=$((attempt + 1))
  # Surface the real reason every few attempts so deploy logs explain the wait.
  if [ $((attempt % 5)) -eq 1 ]; then
    echo "Database not ready (attempt $attempt):"
    grep -vE "injected env|^$" /tmp/db-check.log | tail -3 | sed 's/^/  /'
  fi
  if [ "$attempt" -ge 30 ]; then
    echo "Database not reachable after 30 attempts, giving up." >&2
    exit 1
  fi
  sleep 2
done
grep -E "Database connection OK" /tmp/db-check.log || true

echo "Applying migrations..."
npx prisma migrate deploy

if [ -n "${ADMIN_EMAIL:-}" ] && [ -n "${ADMIN_PASSWORD:-}" ]; then
  echo "Ensuring administrator exists..."
  node prisma/seed.mjs
fi

echo "Starting Omni Hub on port ${PORT:-3000}"
exec npx next start -p "${PORT:-3000}"
