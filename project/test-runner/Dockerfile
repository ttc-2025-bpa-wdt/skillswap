FROM oven/bun:alpine

WORKDIR /project

# Install shared package first (dependency for both backend and frontend)
COPY shared/ /project/shared/
RUN cd /project/shared && bun run init

# Install backend dependencies
COPY backend/ /project/backend/
RUN cd /project/backend && bun run init

# Install frontend dependencies (includes Playwright)
COPY frontend/ /project/frontend/
RUN cd /project/frontend && bun run init && bunx playwright install --with-deps chromium

# Copy test runner script
COPY test-runner/run-tests.sh /project/run-tests.sh
RUN chmod +x /project/run-tests.sh

ENTRYPOINT ["/project/run-tests.sh"]