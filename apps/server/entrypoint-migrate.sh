#!/bin/sh
set -e

echo "Running database migration bootstrap..."
# Wait for PostgreSQL to be ready
RETRY=0
MAX_RETRY="${MAX_RETRY:-120}"
SLEEP_INTERVAL="${SLEEP_INTERVAL:-2}"
DB_HOST="${DB_HOST:-db}"
DB_PORT="${DB_PORT:-5432}"
echo "Waiting for PostgreSQL (host=${DB_HOST}, port=${DB_PORT}) up to ${MAX_RETRY} attempts..."
until pg_isready -h"${DB_HOST}" -p"${DB_PORT}" -q 2>/dev/null || [ "$RETRY" -ge "$MAX_RETRY" ]; do
  echo "Waiting for PostgreSQL... ($RETRY)"
  RETRY=$((RETRY+1))
  sleep "$SLEEP_INTERVAL"
done

if ! pg_isready -h"${DB_HOST}" -p"${DB_PORT}" -q 2>/dev/null; then
  echo "PostgreSQL did not become ready after ${MAX_RETRY} attempts. Aborting." >&2
  exit 1
fi

echo "Applying Prisma schema..."
npx prisma db push --schema=prisma/schema.prisma
npx prisma generate --schema=prisma/schema.prisma

echo "Seeding database..."
node dist/prisma/seed.js || npx ts-node prisma/seed.ts

echo "Migration bootstrap finished."
