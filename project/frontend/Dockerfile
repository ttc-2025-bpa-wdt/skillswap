FROM oven/bun:alpine AS base

WORKDIR /app
EXPOSE 3000

FROM base AS build

# Install source code
COPY frontend/ /tmp/app/
COPY shared/ /shared/

# Install dependencies
RUN cd /shared && bun run init
RUN cd /tmp/app && bun run init

FROM base as dev

# Use volume for development
VOLUME /app
VOLUME /shared

# Set environment variables
ENV NODE_ENV=development
ENV HOST=0.0.0.0

CMD ["ash", "-c", "cd /shared && bun run init && cd /app && bun run init && bun run dev:docker"]

FROM build as prod

# Set environment variables
ENV NODE_ENV=production
ENV HOST=0.0.0.0

# Build Astro SSR application in /tmp/app using Vite
RUN cd /tmp/app && DATABASE_URL=postgresql://dummy:dummy@localhost:5432/dummy bun run build

# Copy built application to /app and remove build source
RUN cp -r /tmp/app/dist /app/dist && \
    cp -r /tmp/app/node_modules /app/node_modules && \
    cp /tmp/app/package.json /app/package.json && \
    rm -rf /tmp/app

# Start the Astro SSR server
CMD ["ash", "-c", "bun /app/dist/server/entry.mjs"]
