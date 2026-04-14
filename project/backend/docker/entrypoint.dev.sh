#!/bin/sh
set -e

echo "[backend] Installing shared dependencies..."
cd /shared
bun install --no-save
bun link

echo "[backend] Installing backend dependencies..."
cd /app
bun install --no-save
bun link shared

echo "[backend] Starting dev server..."
exec bun run dev
