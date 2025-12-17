FROM oven/bun:alpine

WORKDIR /app

# Copy application files and install dependencies
COPY . .
RUN bun install --no-save

# Expose port 80
EXPOSE 80

CMD ["bun", "run", "start"]
