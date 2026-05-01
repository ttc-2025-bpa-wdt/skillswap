#!/bin/sh
set -e

echo "=== Waiting for PostgreSQL ==="
until bun -e "
const { Client } = require('pg');
const c = new Client(process.env.DATABASE_URL);
c.connect().then(() => c.end()).catch(() => process.exit(1));
" 2>/dev/null; do
    sleep 1
done

echo "=== Running database migrations ==="
cd /project/shared
bunx prisma migrate deploy

echo "=== Seeding database ==="
bun run seed

echo "=== Running backend tests ==="
cd /project/backend
bun test 2>&1 | tee /results/backend.txt
BACKEND_EXIT=$?

echo "=== Running frontend E2E tests ==="
cd /project/frontend

# Start frontend dev server in background
PORT=3000 bun run dev &
FRONTEND_PID=$!

# Wait for frontend to be ready
echo "Waiting for frontend dev server..."
for i in $(seq 1 30); do
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        echo "Frontend dev server ready"
        break
    fi
    sleep 1
done

# Run Playwright tests
bun run test:e2e 2>&1 | tee /results/frontend.txt
FRONTEND_EXIT=$?

# Stop frontend dev server
kill $FRONTEND_PID 2>/dev/null || true

echo "=== Test Results ==="
echo "Backend exit code: $BACKEND_EXIT"
echo "Frontend exit code: $FRONTEND_EXIT"

if [ $BACKEND_EXIT -ne 0 ] || [ $FRONTEND_EXIT -ne 0 ]; then
    exit 1
fi
exit 0