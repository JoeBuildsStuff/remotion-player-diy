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

FROM node:22-bookworm AS builder
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


FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    DATA_DIR=/data \
    DIST_DIR=/app/dist \
    REMOTION_ENTRY=/app/remotion/index.ts

# tini for signal handling, ffmpeg for muxing, ca-certs for HTTPS, plus the
# Chromium runtime libs. `npx remotion browser ensure` downloads the Chrome
# binary but NOT its system .so dependencies, so the slim base needs these
# apt packages or chrome-headless-shell errors with `libnspr4.so: cannot
# open shared object file`. List taken from
# https://www.remotion.dev/docs/docker.
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      ffmpeg ca-certificates tini \
      libnss3 libnspr4 libdbus-1-3 libatk1.0-0 libatk-bridge2.0-0 \
      libcups2 libxkbcommon0 libxcomposite1 libxdamage1 libxrandr2 \
      libxfixes3 libgbm1 libpango-1.0-0 libcairo2 libasound2 \
      fonts-liberation \
 && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server-dist ./server
COPY --from=builder /app/remotion ./remotion
COPY --from=builder /app/shared ./shared
# @remotion/bundler runs at *render time* inside this container and
# webpack-bundles `remotion/index.ts` plus all its transitive imports.
# remotion/Root.tsx pulls components out of src/, so the entire src tree,
# the tsconfigs, the public/ folder, and remotion.config.ts must be
# present at runtime — this matches the canonical Remotion Dockerfile
# at https://www.remotion.dev/docs/docker.
COPY --from=builder /app/src ./src
COPY --from=builder /app/public ./public
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/tsconfig.app.json ./tsconfig.app.json
COPY --from=builder /app/tsconfig.node.json ./tsconfig.node.json
COPY --from=builder /app/remotion.config.ts ./remotion.config.ts
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
