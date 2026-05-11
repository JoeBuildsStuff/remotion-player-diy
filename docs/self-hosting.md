# Self-Hosting

Companion to the [Vercel deploy in the README](../README.md). The same code runs as a single Docker container on any Linux box (homelab, VPS, laptop). The container ships:

- the built Vite SPA,
- a small Node server (`server/index.ts`) that exposes `/api/upload`, `/api/render`, `/api/cleanup`, and `/media/*`,
- `@remotion/renderer` + Chromium + ffmpeg, so renders run in-process instead of in a Vercel Sandbox.

There is no Vercel Blob and no Vercel Sandbox in this path. Sources and renders live on a local Docker volume.

## Architecture

```
HTTP request ─► Node (Hono) on :3000
                ├── /                 → Vite SPA from /app/dist
                ├── /api/upload       → multipart write to /data/sources
                ├── /api/render       → @remotion/renderer, SSE progress,
                │                       writes to /data/renders
                ├── /api/cleanup      → bearer-auth, prunes by mtime
                └── /media/...        → read-only static for sources/renders

           Volume: /data  →  /data/sources, /data/renders
```

## Quickstart with the prebuilt image

The `main` branch publishes to GHCR as `ghcr.io/joebuildsstuff/remotion-player-diy:latest` (plus an immutable `sha-<commit>` tag).

```bash
# 1. Pick two long random strings.
export RENDER_SHARED_SECRET="$(openssl rand -hex 32)"
export CRON_SECRET="$(openssl rand -hex 32)"
export PUBLIC_BASE_URL="http://localhost:3000"

# 2. Use the example compose, or copy and edit it.
cp docker-compose.example.yml docker-compose.yml
docker compose up -d
```

Open `http://localhost:3000`, import a clip, click Render. The MP4 will appear under the named volume `data` (`docker volume inspect <project>_data` to find the host path).

> **Important:** `RENDER_SHARED_SECRET` at runtime must equal whatever `VITE_RENDER_SHARED_SECRET` the image was *built* with. The published GHCR image is built with the project's GitHub Actions secret. If you build your own image, pass `--build-arg VITE_RENDER_SHARED_SECRET=...` and use the same value at runtime.

## Building your own image

```bash
docker build \
  --build-arg VITE_RENDER_SHARED_SECRET="$RENDER_SHARED_SECRET" \
  --build-arg VITE_DEPLOY_MODE=selfhost \
  -t remotion-player-diy:dev .
```

Then in `docker-compose.yml`, replace `image:` with `build: .` (the example file already has the block, just uncomment).

## Required environment

| Variable | Required | Purpose |
| --- | --- | --- |
| `RENDER_SHARED_SECRET` | yes | Server-side check for the `x-render-secret` header on `/api/upload` and `/api/render`. **Must equal the build-time `VITE_RENDER_SHARED_SECRET`.** |
| `CRON_SECRET` | yes | Bearer token for `GET /api/cleanup`. |
| `PUBLIC_BASE_URL` | yes | Public origin without trailing slash. URLs returned by `/api/upload` and `/api/render` are prefixed with this. Behind a reverse proxy, set to the public hostname. |
| `PORT` | no, default `3000` | Internal listen port. |
| `DATA_DIR` | no, default `/data` | Where `sources/` and `renders/` live (local storage only). Mount a volume here. |
| `SOURCES_DIR` | no, default `${DATA_DIR}/sources` | Override just the sources path — useful when you want bulk storage for uploads and SSD for renders. |
| `RENDERS_DIR` | no, default `${DATA_DIR}/renders` | Override just the renders path. |
| `DISABLE_BUNDLE_CACHE` | no | Set to `true` to re-bundle the Remotion project on every render (debugging only). |

### Retention

| Variable | Default | Purpose |
| --- | --- | --- |
| `RENDERS_TTL_DAYS` | `7` | Renders older than this are deleted by `/api/cleanup`. Set to `0` to disable. |
| `SOURCES_TTL_DAYS` | `30` | Same, for uploaded sources. |

### Signed `/media` URLs (local storage)

| Variable | Default | Purpose |
| --- | --- | --- |
| `MEDIA_URL_SIGNING_SECRET` | _unset_ | When set, `/api/upload` and `/api/render` return URLs with `?exp=…&sig=…` and `/media/*` refuses access without a valid signature. Without it, reads rely on UUIDv4 unguessability. |

Signed-URL expiry tracks the matching TTL, so a clip uploaded today is valid until cleanup would delete it anyway. Changing the secret invalidates every URL in existing projects — treat it as a one-way switch.

### S3-compatible storage

Set `STORAGE_BACKEND=s3` and provide bucket credentials. Works with AWS S3, Cloudflare R2, MinIO, Backblaze B2, DigitalOcean Spaces, Wasabi — anything that speaks the S3 API.

| Variable | Required | Purpose |
| --- | --- | --- |
| `STORAGE_BACKEND` | yes (`s3`) | Switches off local-disk storage. |
| `S3_BUCKET` | yes | Bucket name. |
| `S3_REGION` | yes | Region (e.g. `us-east-1`, `auto` for R2). |
| `S3_ENDPOINT` | for non-AWS | Custom endpoint, e.g. `https://<acct>.r2.cloudflarestorage.com`, `http://minio:9000`. |
| `S3_FORCE_PATH_STYLE` | for MinIO | Set to `true` for MinIO and some self-hosted gateways. Usually `false` for AWS / R2. |
| `S3_ACCESS_KEY_ID` | usually | Omit to use the default credential chain (IAM role, env, profile, …). |
| `S3_SECRET_ACCESS_KEY` | usually | Same — pair with the access key. |
| `S3_SOURCES_PREFIX` | no, default `sources` | Key prefix for uploaded source media. |
| `S3_RENDERS_PREFIX` | no, default `renders` | Key prefix for rendered MP4s. |
| `S3_PUBLIC_BASE_URL` | no | If set, the editor receives `${url}/${key}` (public bucket / CDN). If unset, returns AWS SigV4 presigned URLs capped at 7 days. |
| `S3_TMP_DIR` | no | Local scratch dir for render output before upload. Defaults to OS tmpdir. |

`@remotion/renderer` always writes the MP4 to a local file first; the S3 adapter uploads it after the render completes and deletes the temp file. So the container still needs a small amount of writable disk even in S3 mode.

`VITE_RENDER_SHARED_SECRET` and `VITE_DEPLOY_MODE` are **build-time** args, not runtime env. They are baked into the SPA bundle.

## What differs from the Vercel deploy

| | Vercel | Self-hosted |
| --- | --- | --- |
| Render runtime | Vercel Sandbox + `@remotion/vercel` | `@remotion/renderer` in this container |
| Source/render storage | Vercel Blob | local filesystem under `DATA_DIR` |
| Upload protocol | token + direct PUT to Blob | single multipart POST to `/api/upload` |
| Cleanup trigger | Vercel cron at 03:00 UTC | in-process 24h `setInterval` (also `GET /api/cleanup`) |
| Concurrency | per-invocation, scales | **one render at a time** (in-process mutex) |
| Cold start | snapshot warms node_modules | first render bundles the Remotion project once, then caches |

## Operational notes

**Disk budget.** Renders, the `node_modules`, and the cached Remotion bundle each take real space. Watch the host with `docker system df` and `df -h` periodically. The bundled cleanup deletes:

- renders older than **7 days**, and
- sources older than **30 days**

You can also trigger it manually:

```bash
curl -fsS -H "Authorization: Bearer $CRON_SECRET" \
  http://localhost:3000/api/cleanup
```

**Concurrency.** The server returns `429` if a second `/api/render` arrives while one is in progress. Personal-deploy compromise; queueing is out of scope for v1.

**Reverse proxy.** Any proxy works (Caddy, nginx, Traefik). Make sure it does **not** buffer the `/api/render` response — it's a Server-Sent Events stream and the editor's progress UI expects flushes as they arrive. For nginx, set `proxy_buffering off` for that location. For Traefik no extra config is needed.

**Backups.** Back up the `/data` volume. Nothing else is stateful.

## Security: `/media/*` reads

By default, uploaded source media and rendered output are served unauthenticated at `/media/sources/<id>` and `/media/renders/<id>`. The shared-secret gate only protects the *write* paths (`/api/upload`, `/api/render`). Reads rely on UUIDv4 (~122 bits of entropy) for unguessability — the same security model as a Vercel Blob with `addRandomSuffix`.

This is a deliberate trade-off: browser `<video>` elements can't attach a custom auth header to source-clip preview requests, so gating `/media/*` with `x-render-secret` would break the editor's preview.

Three ways to harden this:

1. **Signed URLs.** Set `MEDIA_URL_SIGNING_SECRET` to any long random string. The server then issues `?exp=…&sig=…` URLs and refuses unsigned `/media/*` requests. The signature travels in the query string so `<video>` elements still work. Expiry tracks the TTL.
2. **Reverse-proxy auth.** Put the whole hostname behind Traefik basic-auth, Authelia, Authentik, or Cloudflare Access. Covers the SPA, API, and `/media` in one place.
3. **S3 with presigned URLs.** Switch storage to `STORAGE_BACKEND=s3` against a private bucket. The editor receives short-lived presigned GetObject URLs.

## Common deploy gotchas

These are worth knowing if you build your own image:

- **Build-time secret must equal runtime secret.** `VITE_RENDER_SHARED_SECRET` is baked into the SPA bundle at `docker build` time; the browser sends it in `x-render-secret`. The server checks against `RENDER_SHARED_SECRET` from runtime env. They are the same conceptual value living in two places. If they disagree, every request returns `401`. Rotating the value means rebuilding the image *and* restarting the container.
- **Recreate the container after changing runtime env.** Watchtower (and any other image-update tool) preserves the original container's env when it pulls a new image. So if you set `RENDER_SHARED_SECRET` after the container first started, the running container still has the old (or empty) value. Recreate with `docker compose up -d --force-recreate` to reload `.env`.
- **The bundler runs at render time, not at build time.** `@remotion/bundler` webpacks `remotion/index.ts` and *all* transitive imports the first time `/api/render` is called. Anything `Root.tsx` reaches (typically files under `src/`) must be present in the runtime image, not just in the SPA `dist/`. Our Dockerfile copies `src/`, `public/`, `tsconfig*.json`, and `remotion.config.ts` into the runtime stage for this reason.
- **`npx remotion browser ensure` does not install Chromium's system libs.** It downloads the binary, but the slim Debian base needs `libnss3 libnspr4 libdbus-1-3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libxkbcommon0 libxcomposite1 libxdamage1 libxrandr2 libxfixes3 libgbm1 libpango-1.0-0 libcairo2 libasound2 fonts-liberation` via apt or chrome-headless-shell errors with `libnspr4.so: cannot open shared object file`. Our Dockerfile installs them; the canonical list is mirrored from [the Remotion docs](https://www.remotion.dev/docs/docker).
- **Disk fills faster than you'd think.** Each upload retry creates a fresh UUID-prefixed copy in `sources/` — three failed renders of the same 30 MB clip means 90 MB on disk, not 30. Cleanup runs every 24h and only catches sources older than 30 days. To free space immediately:
  ```bash
  docker exec <container> sh -c 'rm -rf /data/sources/* /data/renders/*'
  ```

## Local development against the server

```bash
# Terminal 1: Vite dev server (HMR)
pnpm dev

# Terminal 2: Node server with the API and rendering
pnpm server:dev
```

Vite runs on `:5173`, the server on `:3000`. The simplest way to wire them together is to add a proxy entry to `vite.config.ts` while you iterate, or hit `:3000` directly (it serves a `dist/` from a previous `pnpm build`).

## Reverse-proxy example: Traefik + Watchtower

A typical homelab deployment can run the published GHCR image behind Traefik, with Watchtower pulling updates and external Docker volumes for persistent media. The pattern is:

- use `image: ghcr.io/joebuildsstuff/remotion-player-diy:latest`
- optionally add `com.centurylinklabs.watchtower.enable=true` so Watchtower auto-pulls `:latest`
- route your public hostname to the container internal port `3000`
- mount persistent external Docker volumes for `/data/sources` and `/data/renders`
- set `PUBLIC_BASE_URL` to your public origin

Anyone running their own homelab can copy that pattern from the published GHCR image.
