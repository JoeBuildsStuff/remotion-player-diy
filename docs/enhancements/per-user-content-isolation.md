# Enhancement: Per-user content isolation

**Status:** implemented  
**Date:** 2026-08-25  
**Priority:** security / multi-user correctness  
**Applies to:** self-hosted homelab (`video-editor.joe-taylor.me`) and the Vercel OSS deploy

## Problem

Any caller who can use the editor can list and open **every** project, uploaded source, and render. There is no owner on stored objects. Login at the reverse proxy (SupaGate on the homelab) only answers “is this person allowed to use the hostname?” It does not answer “whose files are these?”

Observed on the Dell OptiPlex self-host:

- Traefik `supagate-forward-auth@file` redirects anonymous internet traffic to login. That is host access, not tenancy.
- Traefik already forwards `X-User-Id` from SupaGate. This app ignores it.
- `GET /api/projects` and `GET /api/sources` return the full store for anyone who presents `x-render-secret` (that header is baked into the browser bundle as `VITE_RENDER_SHARED_SECRET`).
- Projects are JSON files with no `ownerUserId`. Sources and renders are flat UUID filenames under `/data/sources` and `/data/renders`.
- `MEDIA_URL_SIGNING_SECRET` (when set) stops unsigned `/media/*` guesses. It does not hide another user’s files from a logged-in editor session.

The same list/get/delete APIs on Vercel use the same shared-secret gate and public Blob layout.

## Desired behavior

A user must only see, play, edit, download, and delete **their own** projects, uploads, and renders.

- Listing projects / sources returns only objects owned by the current user.
- `GET` / `PUT` / `DELETE` of a project by id returns 404 (or 403) if another user owns it. Do not leak existence to other tenants.
- `/media/sources/*` and `/media/renders/*` refuse bytes that belong to another user, even when the URL is signed or UUID-guessed.
- Direct editor URLs such as `/editor/<project-id>` must not load another user’s timeline.
- Cleanup (`/api/cleanup`) may still scan the whole store as an operator job. It must not become a user-facing list of other people’s files.

Unauthenticated public internet access should stay denied where a proxy already denies it. This request is about **cross-user** isolation after login.

## Suggested approach

1. **Resolve a trusted user id on every mutating and listing request.**
   - Self-host: prefer `X-User-Id` from the reverse proxy (SupaGate / Traefik `authResponseHeaders`). Do not trust a client-supplied user id.
   - Vercel / no proxy: add real auth (or keep a documented single-tenant mode). The shared secret alone is not an identity.
   - If no user id is present, either reject with 401 or run in an explicit `SINGLE_TENANT=true` mode for local-only deploys.

2. **Persist owner on every object.**
   - Add `ownerUserId` to the project JSON schema (`shared/project-schema.ts`) and to source/render metadata (sidecar JSON, path prefix `users/<userId>/…`, or an index file). Path prefix is easiest to enforce on `/media/*`.
   - New uploads and renders inherit the authenticated user. New projects set `ownerUserId` at create time.

3. **Enforce owner on every read/write path.**
   - Self-host: `server/index.ts` plus `server/storage/local.ts` (`listSources`, `listProjects`, `getProject`, `deleteSource`, `serveMedia`).
   - Vercel: `api/projects.ts`, `api/projects/[id].ts`, `api/sources.ts`, `api/upload.ts`, `api/render.ts`.
   - Filter list endpoints in the adapter, not only in the UI.

4. **Migrate existing data.**
   - Homelab currently has a single live project and a small sources dir. Assign those objects to the known operator user id from SupaGate, or to a one-time `DEFAULT_OWNER_USER_ID` env used only during migration.
   - Changing `MEDIA_URL_SIGNING_SECRET` already invalidates stored URLs; a path-prefix migration will too. Plan to rewrite `remoteSrc` in saved projects.

5. **Homelab overlay follow-up** (`remotion-player-homelab`): confirm Traefik still forwards `X-User-Id`, and document that `video-editor.joe-taylor.me` must stay a **restricted** SupaGate app until identity is wired. Overlay-only changes cannot fix tenancy.

## Acceptance criteria

- Two distinct authenticated users cannot list or open each other’s projects.
- User A cannot fetch User B’s `/media/sources/…` or `/media/renders/…` bytes (signed or unsigned).
- User A cannot overwrite or delete User B’s project JSON by id.
- Anonymous requests remain unauthorized on protected deploys.
- Single-user homelab data remains reachable by the original operator after migration.
- Docs (`docs/self-hosting.md` security section, README auth notes) describe tenancy instead of “UUID unguessability + shared secret.”

## Implementation notes (2026-08-25)

Shipped in the OSS app (`shared/identity.ts`, user-prefixed storage, `/media` owner checks) and the homelab overlay (`TRUST_PROXY_USER_ID`, `DEFAULT_OWNER_USER_ID`, projects volume).

- Self-host: trust `X-User-Id` only when `TRUST_PROXY_USER_ID=true`.
- Local / Vercel without a proxy: `SINGLE_TENANT=true`.
- Unscoped files migrate into `users/<DEFAULT_OWNER_USER_ID>/` (or the single-tenant id) on server start.
- `video-editor.joe-taylor.me` stays a restricted SupaGate app; Traefik already forwards `X-User-Id`.

Deploy overlay env **before** (or with) the new GHCR image. If the image rolls out first, APIs return 401 until `TRUST_PROXY_USER_ID` is set.

## Out of scope

- Sharing a project with another user (optional later: explicit share list).
- Replacing SupaGate / Better Auth with a new identity provider.
- Changing render quality, TTL defaults, or storage backend (local vs S3).

## Related files

- `server/index.ts` — API auth and project/source routes
- `server/storage/local.ts` — list/serve media
- `shared/project-schema.ts` — persisted project shape
- `api/projects.ts`, `api/projects/[id].ts`, `api/sources.ts`, `api/upload.ts`
- `docs/self-hosting.md` — current `/media/*` security model
