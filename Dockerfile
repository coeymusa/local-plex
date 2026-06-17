# ---- Build stage ----
FROM node:24-bookworm-slim AS builder
WORKDIR /app

# Install deps. Use `npm install` (not `npm ci`) so Linux-specific native
# bindings resolve correctly even though the lockfile was generated on Windows.
COPY package.json package-lock.json ./
RUN npm install --no-audit --no-fund

# Build the Next.js standalone server.
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---- Runtime stage ----
FROM node:24-bookworm-slim AS runner
WORKDIR /app

# ffmpeg + ffprobe for transcoding, plus the Intel iHD VAAPI driver so the
# Synology's QuickSync (Gemini Lake) can hardware-decode HEVC and encode H.264.
RUN set -eux; \
  sed -i 's/Components: main/Components: main contrib non-free non-free-firmware/' /etc/apt/sources.list.d/debian.sources; \
  apt-get update; \
  apt-get install -y --no-install-recommends ffmpeg intel-media-va-driver-non-free libva2 vainfo; \
  rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    MEDIA_DIR=/media \
    LIBVA_DRIVER_NAME=iHD

# Standalone server + static assets + public files.
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Persisted SQLite (metadata + resume positions) lives here.
RUN mkdir -p /app/.data
VOLUME ["/app/.data"]

EXPOSE 3000
CMD ["node", "server.js"]
