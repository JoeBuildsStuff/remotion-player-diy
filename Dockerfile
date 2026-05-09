# syntax=docker/dockerfile:1.7
#
# Self-hosted image for remotion-player-diy. Multi-stage:
#   1. builder — installs deps, builds the Vite SPA + compiles server/
#   2. runner  — slim Node + ffmpeg, runs `npx remotion browser ensure` to
#                pull the matching Chromium build, then starts server/index.js.
#
# Build:    docker build -t remotion-player-diy:dev --build-arg VITE_RENDER_SHARED_SECRET=devsecret .
# Run:      docker run --rm -p 3000:3000 -v "$PWD/data:/data" \
#             -e RENDER_SHARED_SECRET=devsecret \
#             -e CRON_SECRET=devcron \
#             -e PUBLIC_BASE_URL=http://localhost:3000 \
#             remotion-player-diy:dev

FROM node:20-bookworm AS builder
WORKDIR /app
RUN corepack enable

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

# VITE_RENDER_SHARED_SECRET and VITE_DEPLOY_MODE are baked into the SPA at
# build time. Rotating either requires a new image build.
ARG VITE_RENDER_SHARED_SECRET=changeme
ARG VITE_DEPLOY_MODE=selfhost
ENV VITE_RENDER_SHARED_SECRET=${VITE_RENDER_SHARED_SECRET} \
    VITE_DEPLOY_MODE=${VITE_DEPLOY_MODE}

RUN pnpm build \
 && pnpm exec tsc -p server


FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    DATA_DIR=/data \
    DIST_DIR=/app/dist \
    REMOTION_ENTRY=/app/remotion/index.ts

# tini for proper signal handling, ffmpeg for muxing, ca-certs for HTTPS.
# Chromium and its system libs are installed by `remotion browser ensure`
# below — that command is the canonical Remotion path and survives base
# image bumps without us hand-curating libnss3/libatk-bridge2.0-0/etc.
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      ffmpeg ca-certificates tini \
 && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server-dist ./server
COPY --from=builder /app/remotion ./remotion
COPY --from=builder /app/shared ./shared
COPY --from=builder /app/package.json ./package.json

# Pull the right Chromium for this Remotion version. Done at image-build time
# so first render isn't slowed by a 200 MB download.
RUN npx --yes remotion browser ensure

# Storage volume — sources/, renders/ live here. Mount a named volume in
# docker-compose to persist across container restarts.
VOLUME ["/data"]

EXPOSE 3000
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "server/server/index.js"]
