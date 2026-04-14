# Stage 1: Build
FROM oven/bun:alpine AS build

# Build args for env vars needed at build time
ARG DATABASE_URL
ARG JWT_SECRET
ARG PASSWORD_PEPPER
ARG REGISTRATION_KEY
ARG NODE_ENV=production

WORKDIR /build

# Install shared package
COPY shared/ /shared/
RUN cd /shared && bun install --frozen-lockfile && bunx prisma generate && bun link

# Install frontend dependencies, link shared, and build
COPY frontend/ /build/
RUN bun install --frozen-lockfile && bun link shared && bun run build

# Stage 2: Runtime
FROM oven/bun:alpine

WORKDIR /app

# Copy built output (Astro standalone server)
COPY --from=build /build/dist/ /app/

# Copy shared for runtime Prisma client
COPY --from=build /shared/ /shared/

EXPOSE 3000

CMD ["bun", "run", "./server/entry.mjs"]
