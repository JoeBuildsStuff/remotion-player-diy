# Remotion Player DIY

A browser-based Remotion editor for arranging media and text clips, previewing the composition, and rendering finished videos.

![Remotion Player DIY screenshot](./public/remotion-player-editor-screenshot.png)

The editor can be used locally without Vercel if you only want to build and preview content in the browser. Exporting/rendering videos is server-side because browser/client-side rendering has practical limits: long videos can be slow, memory-constrained, blocked by local `blob:` URLs, and unreliable across devices.

Three deployment modes are supported. See [Deployment Modes](#deployment-modes) for which to pick.

- **Public OSS demo on Vercel (default).** Editing/preview only. Cloud rendering is gated off so a fork at, e.g., `your-fork.vercel.app` doesn't burn Vercel Sandbox/Blob/Cron quota when strangers visit.
- **Vercel with cloud rendering enabled.** Same Vercel project, but with `CLOUD_RENDER_ENABLED=true` plus the secrets below. Uses Vercel Blob + Vercel Sandbox + Vercel Cron.
- **Self-hosted (Docker).** Single container, local filesystem storage, `@remotion/renderer` for rendering. See [docs/self-hosting.md](./docs/self-hosting.md) and the prebuilt image at `ghcr.io/joebuildsstuff/remotion-player-diy:latest`.

## Documentation

Start with [docs/README.md](./docs/README.md) for app-level documentation:

- What the editor is and what users can do.
- How the toolbar, preview, inspector, transport, and timeline work.
- How the React and Remotion modules are organized.
- What the commit history says about how the app evolved.
- Which visible controls are placeholders today.

## Local Editing Only

Install dependencies and start the Vite dev server:

```bash
pnpm install
pnpm dev
```

This is enough to open the editor, import media, arrange clips, preview playback, and create content locally.

Without the Vercel render environment variables, source media uploads to Vercel Blob will fail in the background and the Render button will not be able to export a server-rendered video. Local editing still works from the browser's local object URLs.

## Server-Side Rendering on Vercel

Video rendering requires these Vercel resources:

- A Vercel project for the app.
- Vercel Blob storage connected to the project. It stores uploaded source media, rendered videos, and the Sandbox snapshot pointer.
- Vercel Sandbox compute available for the project. The render endpoint restores a Sandbox snapshot (a deps-only image — `node_modules` already installed) and renders the Remotion composition there.
- Vercel environment variables configured for Production, Preview, and Development as needed.

The render flow is:

1. The browser uploads imported media to Vercel Blob through `/api/upload`.
2. The browser calls `/api/render` with a shared-secret header.
3. `/api/render` restores a Vercel Sandbox snapshot if one exists for the current environment, otherwise creates a fresh sandbox. It then bundles the current Remotion project and pushes that bundle into the sandbox before rendering, so renders never run against stale code. The rendered video is uploaded to Vercel Blob.
4. Vercel Cron calls `/api/cleanup` daily to delete old Blob files.

### Sandbox snapshot lifecycle

Snapshot creation is decoupled from app deploys. Run `pnpm create-snapshot` manually when the deps image needs a refresh (e.g. lockfile changes, dependency upgrades).

- The snapshot contains only the installed `node_modules`. The Remotion bundle is pushed fresh on every render.
- The pointer is stored in Vercel Blob at `snapshot-cache/<VERCEL_ENV>.json` (`production`, `preview`, or `development`) as `{ snapshotId, createdAt }`. Run `pnpm create-snapshot` once per environment that should benefit from the warm start.
- New snapshots expire after 30 days. The script also deletes the previous snapshot via the `@vercel/sandbox` SDK so storage does not accumulate.
- If the pointer is missing or stale, `/api/render` logs a warning and falls back to a cold sandbox build — renders still succeed, just slower.

## Deployment Modes

Cloud rendering is opt-in via two env vars — one server-side, one client-side. They must agree.

| Mode | `CLOUD_RENDER_ENABLED` (server) | `VITE_CLOUD_RENDER_ENABLED` (client) | `VITE_DEPLOY_MODE` | What works |
| --- | --- | --- | --- | --- |
| **Public OSS demo** (default) | unset / `false` | unset / `false` | `vercel` | Editing, preview. Export button shows a "self-host to render" message. `/api/render`, `/api/upload`, `/api/cleanup` return 403. |
| **Vercel cloud rendering** | `true` | `true` | `vercel` | Full pipeline: Blob upload → Sandbox render → Blob output → daily Cron cleanup. |
| **Self-hosted Docker** | n/a (different server) | n/a | `selfhost` | Local rendering with `@remotion/renderer`, files on local disk. |

The gate matters because the Vercel deploy is public — without it, any visitor could trigger Sandbox renders and Blob uploads against your account. The client check hides the UI; the server check is the actual enforcement.

If you enable cloud rendering on a public deploy, also:

- Set a [Vercel Spend Management](https://vercel.com/docs/spend-management) cap.
- Consider [Vercel Deployment Protection](https://vercel.com/docs/deployment-protection) so only your accounts can hit the app at all.
- Treat `VITE_RENDER_SHARED_SECRET` as a soft gate, not real auth — anything `VITE_*` is shipped to the browser bundle. Add real authentication before opening rendering to untrusted users.

## Environment Variables

Create a local `.env.local` for development and add the same values in the Vercel project settings for deployed rendering. See [.env.example](./.env.example) for a starter file.

```bash
# Cloud-rendering gate. Public OSS demos leave both unset (or "false").
CLOUD_RENDER_ENABLED=true
VITE_CLOUD_RENDER_ENABLED=true

# Required when CLOUD_RENDER_ENABLED=true.
RENDER_SHARED_SECRET=replace-with-a-long-random-secret
VITE_RENDER_SHARED_SECRET=replace-with-the-same-secret
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_replace-with-your-token
CRON_SECRET=replace-with-a-different-long-random-secret
```

Do not commit real secrets. The two render shared-secret values must match because one is read by Vercel server functions and the other is embedded into the Vite browser bundle.

| Variable | Used by | Purpose |
| --- | --- | --- |
| `CLOUD_RENDER_ENABLED` | `/api/render`, `/api/upload`, `/api/cleanup` | Master switch. Must be `"true"` for any of the cloud-render API routes to do anything. Anything else → 403 (cleanup returns a no-op success). |
| `VITE_CLOUD_RENDER_ENABLED` | Browser client | Mirror of the above. Hides the upload/export UI when not `"true"`. The editor still works for local browsing/preview. |
| `RENDER_SHARED_SECRET` | `/api/upload` and `/api/render` | Server-side expected value for the `x-render-secret` header. Soft gate against drive-by calls; not real auth. |
| `VITE_RENDER_SHARED_SECRET` | Browser client | Client-side copy of the same shared secret. Vite only exposes env vars prefixed with `VITE_`, so the editor uses this value when calling `/api/upload` and `/api/render`. |
| `BLOB_READ_WRITE_TOKEN` | Server functions, snapshot script | Vercel Blob read/write token. Required to upload rendered videos, read/write Sandbox snapshot pointers, and clean up old Blob files. |
| `CRON_SECRET` | `/api/cleanup` | Bearer token required by the cleanup endpoint so only Vercel Cron, or someone with the secret, can delete old Blob objects. |
| `VITE_DEPLOY_MODE` | Browser client | `vercel` (default) or `selfhost`. Selfhost mode routes uploads to the Docker container's local server instead of Vercel Blob. |

## Vercel Deployment Notes

`package.json` defines a `vercel-build` script:

```bash
pnpm vercel-build
```

That script runs TypeScript and builds the Vite app. It does not create the Sandbox snapshot — snapshot creation is decoupled and run manually via `pnpm create-snapshot` when the deps image needs to be refreshed.

`vercel.json` configures:

- `/api/render` with a 300 second max duration for long renders.
- `/api/upload` for Vercel Blob client-upload token generation.
- `/api/cleanup` plus a daily cron schedule at `0 3 * * *`.

If `/api/render` logs `No sandbox snapshot pointer found at snapshot-cache/<env>.json`, run `pnpm create-snapshot` for that environment with `BLOB_READ_WRITE_TOKEN` set. Renders still work without a snapshot — they just fall back to cold sandbox builds.

## Useful Commands

```bash
pnpm dev              # Run the editor locally
pnpm build            # Type-check and build the Vite app
pnpm vercel-build     # TypeScript and Vite build (no snapshot step)
pnpm create-snapshot  # Refresh the Sandbox deps snapshot for the current environment
pnpm lint             # Run ESLint
pnpm remotion         # Open Remotion Studio
```

## Releases

Releases are automated from pushes to `main` with semantic-release.

Use Conventional Commits:

| Prefix | Version bump | Example |
| --- | --- | --- |
| `fix:` | patch | `fix: volume slider not persisting` |
| `feat:` | minor | `feat: add timeline scrubbing` |
| `feat!:` or `BREAKING CHANGE:` | major | `feat!: rename clip API` |
| `chore:`, `refactor:`, `docs:`, `test:`, `style:`, `ci:` | no release | `chore: bump deps` |
