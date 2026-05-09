FROM oven/bun:alpine AS base

WORKDIR /app
EXPOSE 3001

FROM base AS build

# Install source code
COPY backend/ /app/
COPY shared/ /shared/

# Install dependencies
RUN cd /shared && bun run init
RUN cd /app && bun run init

FROM base as dev

# Use volume for development
VOLUME /app
VOLUME /shared

# Set environment variables
ENV NODE_ENV=development
ENV HOST=0.0.0.0

CMD ["ash", "-c", "cd /shared && bun run init && cd /shared && bunx prisma migrate deploy && cd /shared && bun src/seed.ts && cd /app && bun install --frozen-lockfile && bun link shared && bun run dev"]

FROM build as prod

# Set environment variables
ENV NODE_ENV=production

CMD ["ash", "-c", "cd /shared && bunx prisma migrate deploy && bun src/seed.ts && cd /app && bun run start"]
