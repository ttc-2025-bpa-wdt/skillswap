FROM oven/bun:alpine

WORKDIR /app

# Install dependencies
COPY package.json bun.lock ./
RUN bun install --no-save

# Expose port 80
EXPOSE 80
