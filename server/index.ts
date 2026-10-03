import './load-env.js'

// Self-hosted Node server.
//
// Single binary that serves the built Vite SPA, exposes /api/upload and
// /api/render with the same shared-secret + SSE contract as the Vercel
// deploy, and serves uploaded sources + rendered output through a pluggable
// storage adapter (local filesystem or S3-compatible bucket).
//
// Storage: local (default) under DATA_DIR/{sources,renders}, or s3
//          (STORAGE_BACKEND=s3) against any S3-compatible bucket.
// Rendering: @remotion/bundler + @remotion/renderer (no Vercel Sandbox).
// Cleanup: an internal 24h interval, mirrored by GET /api/cleanup for parity
//          with the Vercel cron path. TTLs are configurable.

import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { Hono } from 'hono'
import { streamSSE } from 'hono/streaming'
import { bundle } from '@remotion/bundler'
import { renderMedia, selectComposition } from '@remotion/renderer'
import { stat } from 'node:fs/promises'
import { createReadStream } from 'node:fs'
import { Readable } from 'node:stream'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'

import { COMP_NAME } from '../remotion/constants.js'
import { ClipSchema } from '../remotion/schema.js'
import {
  ProjectSchema,
  makeEmptyProject,
  DEFAULT_PROJECT_NAME,
} from '../shared/project-schema.js'
import { normalizeRenderScalePercent } from '../shared/render-scale.js'
import type { RenderProgress } from '../shared/sse.js'
import { createStorageAdapter, type StorageAdapter } from './storage/index.js'
import {
  resolveRequestUserId,
  userResponse,
} from '../shared/identity.js'
import { pathnameOwnedBy } from '../shared/tenant-path.js'

const PORT = Number(process.env.PORT ?? 3000)
const DIST_DIR = process.env.DIST_DIR ?? path.resolve('dist')
const REMOTION_ENTRY =
  process.env.REMOTION_ENTRY ?? path.resolve('remotion/index.ts')
const PUBLIC_BASE_URL =
  process.env.PUBLIC_BASE_URL ?? `http://localhost:${PORT}`
const SHARED_SECRET = process.env.RENDER_SHARED_SECRET
const CRON_SECRET = process.env.CRON_SECRET

// Retention. `0` disables cleanup for that scope. Defaults match the prior
// hardcoded values and the Vercel cron path (api/cleanup.ts).
const RENDERS_TTL_DAYS = numberFromEnv('RENDERS_TTL_DAYS', 7)
const SOURCES_TTL_DAYS = numberFromEnv('SOURCES_TTL_DAYS', 30)

const storage: StorageAdapter = await createStorageAdapter({
  STORAGE_BACKEND: process.env.STORAGE_BACKEND,
  DATA_DIR: process.env.DATA_DIR,
  SOURCES_DIR: process.env.SOURCES_DIR,
  RENDERS_DIR: process.env.RENDERS_DIR,
  PROJECTS_DIR: process.env.PROJECTS_DIR,
  PUBLIC_BASE_URL,
  MEDIA_URL_SIGNING_SECRET: process.env.MEDIA_URL_SIGNING_SECRET,
  SOURCES_TTL_DAYS,
  RENDERS_TTL_DAYS,
  S3_BUCKET: process.env.S3_BUCKET,
  S3_REGION: process.env.S3_REGION,
  S3_ENDPOINT: process.env.S3_ENDPOINT,
  S3_FORCE_PATH_STYLE: process.env.S3_FORCE_PATH_STYLE,
  S3_ACCESS_KEY_ID: process.env.S3_ACCESS_KEY_ID,
  S3_SECRET_ACCESS_KEY: process.env.S3_SECRET_ACCESS_KEY,
  S3_SOURCES_PREFIX: process.env.S3_SOURCES_PREFIX,
  S3_RENDERS_PREFIX: process.env.S3_RENDERS_PREFIX,
  S3_PROJECTS_PREFIX: process.env.S3_PROJECTS_PREFIX,
  S3_PUBLIC_BASE_URL: process.env.S3_PUBLIC_BASE_URL,
  S3_TMP_DIR: process.env.S3_TMP_DIR,
})

// Single-render concurrency cap. Bundling + headless Chrome is heavy on the
// homelab box and a queue is out of scope for v1.
let renderInFlight = false

const app = new Hono()

function unauthorized() {
  return new Response('Unauthorized', { status: 401 })
}

function requireSecret(req: Request) {
  if (!SHARED_SECRET) {
    return new Response(
      'Server misconfigured: RENDER_SHARED_SECRET not set',
      { status: 500 },
    )
  }
  if (req.headers.get('x-render-secret') !== SHARED_SECRET) {
    return unauthorized()
  }
  return null
}

function requireUser(req: Request): { userId: string } | Response {
  const denied = requireSecret(req)
  if (denied) return denied
  const identity = resolveRequestUserId(req.headers)
  if (!identity.ok) return userResponse(identity)
  return { userId: identity.userId }
}

// Bundle the Remotion project once at first render and cache. This trades
// memory for warmer starts on subsequent renders. Set DISABLE_BUNDLE_CACHE=true
// to force a re-bundle on every request (useful when iterating on /remotion
// during local server dev).
let cachedBundle: string | null = null
async function getBundle(): Promise<string> {
  if (cachedBundle && process.env.DISABLE_BUNDLE_CACHE !== 'true') {
    return cachedBundle
  }
  cachedBundle = await bundle({
    entryPoint: REMOTION_ENTRY,
    onProgress: () => {},
  })
  return cachedBundle
}

app.get('/api/me', (c) => {
  const auth = requireUser(c.req.raw)
  if (auth instanceof Response) return auth
  return c.json({ userId: auth.userId })
})

// Client sends the File in a multipart POST; the adapter persists it and
// returns a public URL the editor can render the clip from.

app.post('/api/upload', async (c) => {
  const auth = requireUser(c.req.raw)
  if (auth instanceof Response) return auth

  let form: FormData
  try {
    form = await c.req.formData()
  } catch (err) {
    return c.text(
      err instanceof Error ? err.message : 'Failed to parse multipart body',
      400,
    )
  }

  const file = form.get('file')
  if (!(file instanceof File)) {
    return c.text('Missing "file" field in multipart body', 400)
  }

  const stored = await storage.uploadSource({
    name: file.name,
    data: Buffer.from(await file.arrayBuffer()),
    contentType: file.type || undefined,
    ownerUserId: auth.userId,
  })

  return c.json({ url: stored.url, pathname: stored.pathname })
})

// ─── /api/sources ─────────────────────────────────────────────────────────
// Lists everything currently sitting in the sources bucket/dir, so the editor
// can show a "Previous Uploads" panel and re-attach a clip without re-uploading.

app.get('/api/sources', async (c) => {
  const auth = requireUser(c.req.raw)
  if (auth instanceof Response) return auth
  return c.json({ sources: await storage.listSources(auth.userId) })
})

app.delete('/api/sources', async (c) => {
  const auth = requireUser(c.req.raw)
  if (auth instanceof Response) return auth
  let body: { pathname?: unknown }
  try {
    body = (await c.req.json()) as { pathname?: unknown }
  } catch {
    return c.text('Invalid JSON body', 400)
  }
  if (typeof body.pathname !== 'string' || !pathnameOwnedBy(body.pathname, auth.userId, 'sources')) {
    return c.text('Missing or invalid pathname', 400)
  }
  try {
    await storage.deleteSource(body.pathname, auth.userId)
  } catch (err) {
    return c.text(err instanceof Error ? err.message : 'Delete failed', 400)
  }
  return c.json({ ok: true })
})

// ─── /api/projects ────────────────────────────────────────────────────────
// Persistent project documents (timeline + canvas state). Same shared-secret
// auth as /api/sources. Media referenced by a project still lives under
// sources/ and is governed by the existing TTL — deleting a project does not
// delete its media.

app.get('/api/projects', async (c) => {
  const auth = requireUser(c.req.raw)
  if (auth instanceof Response) return auth
  return c.json({ projects: await storage.listProjects(auth.userId) })
})

app.post('/api/projects', async (c) => {
  const auth = requireUser(c.req.raw)
  if (auth instanceof Response) return auth
  let name: string | undefined
  try {
    const body = (await c.req.json().catch(() => ({}))) as { name?: unknown }
    if (typeof body.name === 'string' && body.name.trim() !== '') {
      name = body.name.trim()
    }
  } catch {
    // Empty / invalid body is fine — we'll create with the default name.
  }
  const project = makeEmptyProject({
    id: randomUUID(),
    name: name ?? DEFAULT_PROJECT_NAME,
    ownerUserId: auth.userId,
  })
  await storage.saveProject(project)
  return c.json(project)
})

app.get('/api/projects/:id', async (c) => {
  const auth = requireUser(c.req.raw)
  if (auth instanceof Response) return auth
  const project = await storage.getProject(c.req.param('id'), auth.userId)
  if (!project) return c.text('Not found', 404)
  return c.json(project)
})

app.put('/api/projects/:id', async (c) => {
  const auth = requireUser(c.req.raw)
  if (auth instanceof Response) return auth
  const id = c.req.param('id')
  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return c.text('Invalid JSON body', 400)
  }
  const parsed = ProjectSchema.safeParse(body)
  if (!parsed.success) {
    return c.text(`Invalid project: ${parsed.error.message}`, 400)
  }
  if (parsed.data.id !== id) {
    return c.text('Project id in body does not match URL', 400)
  }
  const existing = await storage.getProject(id, auth.userId)
  if (!existing) return c.text('Not found', 404)
  const next = {
    ...parsed.data,
    updatedAt: Date.now(),
    ownerUserId: auth.userId,
  }
  await storage.saveProject(next)
  return c.json(next)
})

app.delete('/api/projects/:id', async (c) => {
  const auth = requireUser(c.req.raw)
  if (auth instanceof Response) return auth
  const existing = await storage.getProject(c.req.param('id'), auth.userId)
  if (!existing) return c.text('Not found', 404)
  await storage.deleteProject(c.req.param('id'), auth.userId)
  return new Response(null, { status: 204 })
})

// ─── /api/render ──────────────────────────────────────────────────────────

const ExportSettingsSchema = z.object({
  quality: z.number().min(1).max(100),
  audioBitrateKbps: z.number().int().min(64).max(320),
  resolutionScale: z.number().int().min(25).max(400),
})

const RenderRequestSchema = z.object({
  inputProps: z.object({
    clips: z.array(ClipSchema),
    fps: z.number().int().positive(),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    durationInFrames: z.number().int().positive(),
    backgroundColor: z.string().optional(),
  }),
  exportSettings: ExportSettingsSchema,
})

function qualityToCrf(quality: number) {
  // Match the Vercel handler's mapping so the slider behaves identically.
  return Math.round(36 - quality * 0.18)
}

app.post('/api/render', async (c) => {
  const auth = requireUser(c.req.raw)
  if (auth instanceof Response) return auth

  let body: z.infer<typeof RenderRequestSchema>
  try {
    body = RenderRequestSchema.parse(await c.req.json())
  } catch (err) {
    return c.text(
      err instanceof Error ? err.message : 'Invalid request body',
      400,
    )
  }

  if (renderInFlight) {
    return c.text(
      'Another render is already in progress; this server runs one at a time.',
      429,
    )
  }
  renderInFlight = true

  return streamSSE(c, async (stream) => {
    const send = (m: RenderProgress) =>
      stream.writeSSE({ data: JSON.stringify(m) })

    let tempPath: string | null = null
    try {
      await send({
        type: 'phase',
        phase: 'Bundling Remotion project...',
        progress: 0,
        subtitle: cachedBundle ? 'Using cached bundle.' : 'First render — this can take a minute.',
      })
      const bundleLocation = await getBundle()

      await send({
        type: 'phase',
        phase: 'Selecting composition...',
        progress: 0.05,
      })
      const composition = await selectComposition({
        serveUrl: bundleLocation,
        id: COMP_NAME,
        inputProps: body.inputProps,
      })

      const renderId = randomUUID()
      tempPath = storage.renderTempPath(renderId, auth.userId)

      await send({
        type: 'phase',
        phase: 'Rendering video...',
        progress: 0.1,
      })

      const normalizedScale = normalizeRenderScalePercent({
        width: body.inputProps.width,
        height: body.inputProps.height,
        requestedPercent: body.exportSettings.resolutionScale,
      })
      if (normalizedScale.adjusted) {
        await send({
          type: 'phase',
          phase: 'Rendering video...',
          progress: 0.1,
          subtitle: `Adjusted output scale from ${normalizedScale.requestedPercent}% to ${normalizedScale.percent}% for codec-safe integer dimensions (${normalizedScale.outputWidth}x${normalizedScale.outputHeight}).`,
        })
      }

      await renderMedia({
        composition,
        serveUrl: bundleLocation,
        codec: 'h264',
        outputLocation: tempPath,
        inputProps: body.inputProps,
        crf: qualityToCrf(body.exportSettings.quality),
        audioBitrate: `${body.exportSettings.audioBitrateKbps}K`,
        scale: normalizedScale.scale,
        chromiumOptions: {
          // Recommended for Docker per
          // https://www.remotion.dev/docs/miscellaneous/linux-single-process
          // — faster + more memory-stable than the default sandboxed mode
          // when running headless under Linux.
          enableMultiProcessOnLinux: true,
        },
        onProgress: ({ progress }) => {
          // Hono's writeSSE returns a promise; the renderer doesn't await us,
          // so just queue the write and let any ordering shake out via SSE.
          void send({
            type: 'phase',
            phase: 'Rendering video...',
            progress: 0.1 + progress * 0.85,
          })
        },
      })

      if (storage.kind === 's3') {
        await send({
          type: 'phase',
          phase: 'Uploading to storage...',
          progress: 0.96,
        })
      }

      const stats = await stat(tempPath)
      const stored = await storage.finalizeRender(tempPath, renderId, auth.userId)
      await send({ type: 'done', url: stored.url, size: stats.size })
    } catch (err) {
      console.error('[render] failed:', err)
      await send({
        type: 'error',
        message: err instanceof Error ? err.message : String(err),
      })
      if (tempPath) await storage.abortRender(tempPath)
    } finally {
      renderInFlight = false
    }
  })
})

// ─── /api/cleanup ─────────────────────────────────────────────────────────
// Mirrors api/cleanup.ts on the Vercel deploy. TTLs come from env so each
// installation can set its own retention; `0` disables that scope.

async function runCleanup() {
  const renders = await storage.purgeRenders(RENDERS_TTL_DAYS)
  const sources = await storage.purgeSources(SOURCES_TTL_DAYS)
  return { renders, sources }
}

app.get('/api/cleanup', async (c) => {
  if (!CRON_SECRET) {
    return c.text('Server misconfigured: CRON_SECRET not set', 500)
  }
  if (c.req.header('authorization') !== `Bearer ${CRON_SECRET}`) {
    return unauthorized()
  }
  return c.json({ ok: true, results: await runCleanup() })
})

// In-process scheduler (every 24h). Vercel uses an external cron; here we
// just tick from inside the long-running container.
const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000
setInterval(() => {
  runCleanup().catch((err) => console.error('[cleanup] failed:', err))
}, CLEANUP_INTERVAL_MS)

// ─── Adapter-owned routes ─────────────────────────────────────────────────
// Local storage mounts /media/* here; S3 is a no-op (URLs go straight to the
// bucket / CDN).

storage.registerRoutes(app)

// ─── SPA static ───────────────────────────────────────────────────────────
// Serve the Vite-built dist/ as the rest of the app. The wildcard fall-back
// returns index.html so client-side routes (none today, but cheap insurance)
// keep working.

const distRoot = path.relative(process.cwd(), DIST_DIR) || '.'
app.use(
  '/*',
  serveStatic({
    root: distRoot,
    rewriteRequestPath: (p) => (p === '/' ? '/index.html' : p),
  }),
)
app.notFound(async () => {
  const indexPath = path.join(DIST_DIR, 'index.html')
  const s = await stat(indexPath).catch(() => null)
  if (!s) return new Response('Not found', { status: 404 })
  const stream = createReadStream(indexPath)
  return new Response(Readable.toWeb(stream) as ReadableStream, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
})

serve({ fetch: app.fetch, port: PORT })
console.log(
  `[server] listening on :${PORT}  storage=${storage.kind}  dist=${DIST_DIR}  base=${PUBLIC_BASE_URL}  ` +
    `ttl=renders:${RENDERS_TTL_DAYS}d/sources:${SOURCES_TTL_DAYS}d  ` +
    `identity=${process.env.TRUST_PROXY_USER_ID === 'true' ? 'proxy-x-user-id' : process.env.SINGLE_TENANT === 'true' ? 'single-tenant' : 'required'}`,
)

function numberFromEnv(name: string, fallback: number): number {
  const raw = process.env[name]
  if (raw === undefined || raw === '') return fallback
  const n = Number(raw)
  if (!Number.isFinite(n) || n < 0) {
    console.warn(`[server] ignoring invalid ${name}="${raw}", using ${fallback}`)
    return fallback
  }
  return n
}
