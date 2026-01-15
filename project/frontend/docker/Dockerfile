FROM oven/bun:alpine

WORKDIR /app

# Copy application files
COPY . /build/
COPY ../shared/ /shared/

# Install dependencies for both frontend and shared code
RUN cd /build/ && bun install --no-save
RUN cd /shared/ && bun install --no-save

# Build application and copy dist to /app
RUN cd /build/ && bun run build
COPY /build/dist/ /app/

# Delete the build directory to save space
RUN rm -rf /build/

# Expose port 3000
EXPOSE 3000

CMD ["/bin/sh", "-c", "bun run entry.mjs"]
