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
# 1. Use the same render secret that was baked into the GHCR image by
#    .github/workflows/publish-image.yml as VITE_RENDER_SHARED_SECRET.
export RENDER_SHARED_SECRET="same-value-as-github-actions-VITE_RENDER_SHARED_SECRET"
export CRON_SECRET="$(openssl rand -hex 32)"
export PUBLIC_BASE_URL="http://localhost:3000"

# 2. Use the example compose, or copy and edit it.
cp docker-compose.example.yml docker-compose.yml
docker compose up -d
```

Open `http://localhost:3000`, import a clip, click Render. The MP4 will appear under the named volume `data` (`docker volume inspect <project>_data` to find the host path).

> **Important:** `RENDER_SHARED_SECRET` at runtime must equal whatever `VITE_RENDER_SHARED_SECRET` the image was *built* with. The published GHCR image is built with the project's GitHub Actions secret, so a newly generated local value will not work with that image. If you build your own image, pass `--build-arg VITE_RENDER_SHARED_SECRET=...` and use the same value at runtime.

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
| `TRUST_PROXY_USER_ID` | no | Set to `true` to treat `X-User-Id` from the reverse proxy as the tenant. Required for multi-user self-host. |
| `SINGLE_TENANT` | no | Set to `true` for local-only / single-operator deploys with no proxy identity. |
| `SINGLE_TENANT_USER_ID` | no, default `local` | Tenant id used when `SINGLE_TENANT=true`. |
| `DEFAULT_OWNER_USER_ID` | no | One-time owner for migrating unscoped files into `users/<id>/`. |

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

## Security: tenancy and `/media/*` reads

Host-level login (Traefik / SupaGate / Cloudflare Access) only answers “is this person allowed to use the hostname?” It does not isolate files. This app isolates **projects, uploads, and renders per user**.

### How identity is resolved

| Mode | Env | User id |
| --- | --- | --- |
| Reverse-proxy tenancy | `TRUST_PROXY_USER_ID=true` | `X-User-Id` from the proxy (SupaGate / Traefik `authResponseHeaders`). Never taken from the request body. |
| Single-operator | `SINGLE_TENANT=true` | `SINGLE_TENANT_USER_ID` or `local` |
| Neither | — | `/api/*` list/write routes return **401** |

The shared secret (`x-render-secret`) is still required on `/api/*` writes. It is baked into the browser bundle, so it is **not** a tenant. `/api/cleanup` stays an operator job (bearer `CRON_SECRET`) and scans the whole store without returning other people’s files as a user-facing list.

Objects are stored under `users/<userId>/`:

```
/data/sources/users/<userId>/…
/data/renders/users/<userId>/…
/data/projects/users/<userId>/<id>.json
```

`GET /api/projects` and `GET /api/sources` only return that user’s objects. `GET` / `PUT` / `DELETE` of another user’s project id returns **404**. `/media/sources/*` and `/media/renders/*` refuse bytes whose path user id does not match the request user, even when the URL is signed. Browser `<video>` elements cannot send `x-render-secret`; identity for media reads comes from the proxy header or single-tenant mode, plus optional signed-URL query params.

### Migrating existing flat files

If the data directory still has unscoped files (the pre-tenancy layout), set `DEFAULT_OWNER_USER_ID` to the operator’s user id (or use `SINGLE_TENANT=true`). On startup the server moves those files into `users/<id>/` and rewrites `remoteSrc` in saved projects. Changing path prefixes invalidates old media URLs the same way rotating `MEDIA_URL_SIGNING_SECRET` does.

### Extra hardening

1. **Signed URLs.** Set `MEDIA_URL_SIGNING_SECRET`. The server issues `?exp=…&sig=…` URLs. A valid signature is not enough to read another user’s object.
2. **Reverse-proxy auth.** Required for `TRUST_PROXY_USER_ID`. Covers the SPA, API, and `/media`.
3. **S3 with presigned URLs.** Listing is still per-user; the bucket/CDN is responsible for byte access of the returned URL.

On Vercel, Blob objects use the same `users/<userId>/` key prefix for list/upload/delete. Public Blob URLs remain fetchable if leaked — prefer `SINGLE_TENANT=true` or real proxy identity, and do not treat UUID paths as tenancy.

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

Set in `.env.local` (you already need matching `RENDER_SHARED_SECRET` / `VITE_RENDER_SHARED_SECRET`):

```bash
VITE_DEPLOY_MODE=selfhost
PUBLIC_BASE_URL=http://localhost:5173
SINGLE_TENANT=true
```

Then run both processes:

```bash
# Terminal 1: Vite dev server (HMR) — proxies /api and /media to :3000
pnpm dev

# Terminal 2: Node server with the API and rendering (loads .env.local)
pnpm server:dev
```

Open `http://localhost:5173`. In the inspector **Media** section, use the folder icon to open the media library. Upload at least one clip via **Add media** so `/api/sources` has entries under `./data/sources/users/<id>/`.

Vite runs on `:5173`, the server on `:3000`. `vite.config.ts` already proxies `/api` and `/media` to the Node server; you can also hit `:3000` directly after `pnpm build` (it serves `dist/`).

## Reverse-proxy example: Traefik + Watchtower

A typical homelab deployment can run the published GHCR image behind Traefik, with Watchtower pulling updates and external Docker volumes for persistent media. The pattern is:

- use `image: ghcr.io/joebuildsstuff/remotion-player-diy:latest`
- optionally add `com.centurylinklabs.watchtower.enable=true` so Watchtower auto-pulls `:latest`
- route your public hostname to the container internal port `3000`
- mount persistent external Docker volumes for `/data/sources` and `/data/renders`
- set `PUBLIC_BASE_URL` to your public origin

In this repo's live setup, GitHub Actions publishes the image after `main` changes, and the Dell Optiplex deployment lets Watchtower pull that new `:latest` image from GHCR. The container keeps its persistent media on Docker volumes, so replacing the app image does not remove uploaded sources or rendered outputs.

Anyone running their own homelab can copy that pattern from the published GHCR image.
