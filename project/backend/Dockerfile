FROM oven/bun:alpine AS base

WORKDIR /app
EXPOSE 3000
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

CMD ["ash", "-c", "cd /shared && bun run init && cd /app && bun run init && bun run dev"]

FROM build as prod

# Set environment variables
ENV NODE_ENV=production

CMD ["ash", "-c", "bun run start"]
