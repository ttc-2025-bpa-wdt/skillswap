FROM oven/bun:alpine

WORKDIR /build

# Install shared package
COPY shared/ /shared/
RUN cd /shared && bun install --frozen-lockfile && bunx prisma generate && bun link

# Install backend dependencies and link shared
COPY backend/ /build/
RUN bun install --frozen-lockfile && bun link shared

WORKDIR /build

EXPOSE 3001

CMD ["bun", "run", "start"]
