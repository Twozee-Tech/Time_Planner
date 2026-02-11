#!/bin/sh
set -e

echo "Running database migrations..."
npx prisma migrate deploy 2>/dev/null || echo "No migrations to apply or migration failed (DB may not have migrations yet)"

echo "Running database seed..."
npx tsx prisma/seed.ts 2>/dev/null || echo "Seed skipped or already applied"

echo "Starting application..."
exec "$@"
