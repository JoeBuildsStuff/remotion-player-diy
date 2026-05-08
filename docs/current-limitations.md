# Current Limitations

This file documents the current app honestly so user-facing docs do not imply finished features that are only partially wired.

## Placeholder Toolbar Controls

These controls are visible but do not currently perform a full action:

- Rectangle tool.
- Dedicated image, video, and audio tool buttons.
- Undo.
- Redo.
- Save.

Media import currently works through drag-and-drop and the import media button.

## Placeholder Transport Controls

These controls are visible but not fully wired:

- Snap toggle.
- Global volume button.

Timeline zoom, split, delete selected item, seek, play/pause, jump to start/end, loop, and fullscreen playback are wired.

## Project Persistence

The editor state is currently in React state. There is no durable project save/load format wired to the Save button.

Imported media uses local object URLs for browser preview. Server-renderable media also needs uploaded `remoteSrc` values, but project persistence is separate from that upload state.

## Undo and Redo

Undo and redo buttons exist in the toolbar, but there is no history stack yet.

## Shape Tools

The clip model supports media and text clips. The rectangle button is present in the toolbar, but shape clip creation is not implemented in the current `ClipType` union.

## Captions

The video clip inspector has a Captions section placeholder. Caption import, editing, timing, and rendering are not implemented yet.

## Export Requirements

The editor can be used for local editing and preview without export setup. Rendering a final video depends on the server-side render path and its environment configuration.

## Sandbox Snapshot Pipeline

The render path uses a Vercel Sandbox snapshot to skip `npm install` on cold renders. This works, but a few rough edges are intentionally left for later:

### Known issues we fixed

- **Code drift**: a previous version baked the Remotion bundle into the snapshot. Any deploy without re-running `create-snapshot` rendered against stale code. The snapshot now contains only `node_modules`, and the bundle is pushed fresh on every render.
- **Broken Blob key**: the pointer was keyed by `VERCEL_DEPLOYMENT_ID`, which mismatched between the manual snapshot job and the running function. The pointer is now keyed by `VERCEL_ENV`.
- **Snapshot storage leak**: previous snapshots were never deleted (only the Blob pointer was cleaned up). `create-snapshot` now calls `Snapshot.delete()` on the prior snapshot via the `@vercel/sandbox` SDK and sets a 30-day expiration as a safety net.

### Left undone — revisit if this becomes painful

- **No automatic snapshot refresh**. `pnpm create-snapshot` is run manually. If lockfile changes ship without a snapshot refresh, renders still work but pay a one-time cold-build cost on the next render — they don't fail. A pre-deploy CI step (e.g. a workflow that runs `create-snapshot` when `pnpm-lock.yaml` changes) would make this fully hands-off.
- **No warm pool for parallel renders**. Each render spawns its own sandbox from the snapshot. Concurrent renders are independent VMs, which is correct but not optimized for high request rates.
- **Persistent sandboxes (beta) not adopted**. Vercel's persistent-sandbox beta would automate snapshot lifecycle and replace most of `create-snapshot.ts`, but the one-active-session-per-sandbox model does not fit a multi-tenant render endpoint without a sandbox pool. Worth revisiting once the product is GA and a fan-out story is documented.
- **Per-environment seeding is manual**. After the key change to `VERCEL_ENV`, each environment (`production`, `preview`, `development`) needs its own `pnpm create-snapshot` run to seed its pointer.
