FROM oven/bun:1 AS deps

WORKDIR /app
COPY package.json bun.lockb* ./
RUN bun install --frozen-lockfile

# ── Runtime image ──────────────────────────────────────────
FROM oven/bun:1

# FFmpeg for audio processing
RUN apt-get update && \
    apt-get install -y --no-install-recommends ffmpeg && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Non-root user for security
RUN addgroup --system worker && adduser --system --ingroup worker worker
USER worker

CMD ["bun", "src/index.ts"]
