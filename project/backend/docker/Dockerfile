FROM oven/bun:alpine

WORKDIR /app

# Copy application files
COPY . .
COPY ../shared/ ../shared/

# Install dependencies for both frontend and shared code
RUN bun install --no-save
RUN cd ../shared/ && bun install --no-save

# Expose port 80
EXPOSE 80

CMD ["bun", "run", "start"]
