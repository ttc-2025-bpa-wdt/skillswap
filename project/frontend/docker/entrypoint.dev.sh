#!/bin/sh
set -e

echo "[frontend] Installing shared dependencies..."
cd /shared
bun install --no-save
bun link

echo "[frontend] Installing frontend dependencies..."
cd /app
bun install --no-save
bun link shared

echo "[frontend] Starting dev server..."
exec bun run dev:docker
