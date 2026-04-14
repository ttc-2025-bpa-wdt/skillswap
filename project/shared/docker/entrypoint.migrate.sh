#!/bin/sh
set -e

echo "[migrate] Installing shared dependencies..."
cd /shared
bun install --no-save

echo "[migrate] Generating Prisma client..."
bunx prisma generate

echo "[migrate] Running database migrations..."
bunx prisma migrate deploy

echo "[migrate] Running seed..."
bun run seed

echo "[migrate] Done."
