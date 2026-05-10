// Self-hosted Node server.
//
// Single binary that serves the built Vite SPA, exposes /api/upload and
// /api/render with the same shared-secret + SSE contract as the Vercel
// deploy, and serves uploaded sources + rendered output as static files.
//
// Storage: local filesystem under DATA_DIR (sources/, renders/, tmp/).
// Rendering: @remotion/bundler + @remotion/renderer (no Vercel Sandbox).
// Cleanup: an internal 24h interval, mirrored by GET /api/cleanup for parity
//          with the Vercel cron path.

import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { Hono } from 'hono'
import { streamSSE } from 'hono/streaming'
import { bundle } from '@remotion/bundler'
import { renderMedia, selectComposition } from '@remotion/renderer'
import { mkdir, readdir, stat, unlink, writeFile } from 'node:fs/promises'
import { createReadStream } from 'node:fs'
import { Readable } from 'node:stream'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'

import { COMP_NAME } from '../remotion/constants.js'
import { ClipSchema } from '../remotion/schema.js'
import type { RenderProgress } from '../shared/sse.js'

const PORT = Number(process.env.PORT ?? 3000)
const DATA_DIR = process.env.DATA_DIR ?? path.resolve('data')
const DIST_DIR = process.env.DIST_DIR ?? path.resolve('dist')
const REMOTION_ENTRY =
  process.env.REMOTION_ENTRY ?? path.resolve('remotion/index.ts')
const PUBLIC_BASE_URL =
  process.env.PUBLIC_BASE_URL ?? `http://localhost:${PORT}`
const SHARED_SECRET = process.env.RENDER_SHARED_SECRET
const CRON_SECRET = process.env.CRON_SECRET

const SOURCES_DIR = path.join(DATA_DIR, 'sources')
const RENDERS_DIR = path.join(DATA_DIR, 'renders')

await mkdir(SOURCES_DIR, { recursive: true })
await mkdir(RENDERS_DIR, { recursive: true })

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

// ─── /api/upload ──────────────────────────────────────────────────────────
// Self-hosted uploads are a single multipart POST: client sends the File
// directly, server writes it to DATA_DIR/sources, and returns a public URL
// served by /media/sources/<name>. Replaces the Vercel Blob token dance.

app.post('/api/upload', async (c) => {
  const denied = requireSecret(c.req.raw)
  if (denied) return denied

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

  const safeName = file.name.replace(/[^\w.-]+/g, '_') || 'upload.bin'
  const id = randomUUID()
  const filename = `${id}-${safeName}`
  const dest = path.join(SOURCES_DIR, filename)

  // Single-shot. For very large media the editor splits into chunks itself —
  // we trust the OS / disk to handle the buffer.
  const buf = Buffer.from(await file.arrayBuffer())
  await writeFile(dest, buf)

  return c.json({
    url: `${PUBLIC_BASE_URL}/media/sources/${filename}`,
    pathname: `sources/${filename}`,
  })
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
  }),
  exportSettings: ExportSettingsSchema,
})

function qualityToCrf(quality: number) {
  // Match the Vercel handler's mapping so quality slider behaves identically.
  return Math.round(36 - quality * 0.18)
}

app.post('/api/render', async (c) => {
  const denied = requireSecret(c.req.raw)
  if (denied) return denied

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

    let outFile: string | null = null
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
      outFile = path.join(RENDERS_DIR, `${renderId}.mp4`)

      await send({
        type: 'phase',
        phase: 'Rendering video...',
        progress: 0.1,
      })

      await renderMedia({
        composition,
        serveUrl: bundleLocation,
        codec: 'h264',
        outputLocation: outFile,
        inputProps: body.inputProps,
        crf: qualityToCrf(body.exportSettings.quality),
        audioBitrate: `${body.exportSettings.audioBitrateKbps}K`,
        scale: body.exportSettings.resolutionScale / 100,
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

      const stats = await stat(outFile)
      await send({
        type: 'done',
        url: `${PUBLIC_BASE_URL}/media/renders/${renderId}.mp4`,
        size: stats.size,
      })
    } catch (err) {
      console.error('[render] failed:', err)
      await send({
        type: 'error',
        message: err instanceof Error ? err.message : String(err),
      })
      // Best-effort cleanup of a half-written file so the disk doesn't grow.
      if (outFile) {
        await unlink(outFile).catch(() => {})
      }
    } finally {
      renderInFlight = false
    }
  })
})

// ─── /api/cleanup ─────────────────────────────────────────────────────────
// Delete renders >7d, sources >30d. TTLs match api/cleanup.ts so behavior
// stays identical across deploys.

const RENDERS_TTL_DAYS = 7
const SOURCES_TTL_DAYS = 30

async function purgeDir(dir: string, ttlDays: number) {
  const cutoff = Date.now() - ttlDays * 24 * 60 * 60 * 1000
  let scanned = 0
  let deleted = 0
  const entries = await readdir(dir).catch(() => [])
  for (const name of entries) {
    scanned++
    const full = path.join(dir, name)
    const s = await stat(full).catch(() => null)
    if (!s || !s.isFile()) continue
    if (s.mtimeMs < cutoff) {
      await unlink(full).catch(() => {})
      deleted++
    }
  }
  return { dir, scanned, deleted, ttlDays }
}

async function runCleanup() {
  const renders = await purgeDir(RENDERS_DIR, RENDERS_TTL_DAYS)
  const sources = await purgeDir(SOURCES_DIR, SOURCES_TTL_DAYS)
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

// ─── /media/* static media ────────────────────────────────────────────────
// Read-only file server for uploaded sources and rendered output. Path
// traversal is blocked by checking that the resolved path is still inside
// the expected directory.

const MIME: Record<string, string> = {
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
}

async function serveMedia(
  baseDir: string,
  relPath: string,
): Promise<Response> {
  const full = path.resolve(baseDir, relPath)
  if (!full.startsWith(path.resolve(baseDir) + path.sep)) {
    return new Response('Forbidden', { status: 403 })
  }
  const s = await stat(full).catch(() => null)
  if (!s || !s.isFile()) {
    return new Response('Not found', { status: 404 })
  }
  const ext = path.extname(full).toLowerCase()
  const stream = createReadStream(full)
  return new Response(Readable.toWeb(stream) as ReadableStream, {
    headers: {
      'Content-Type': MIME[ext] ?? 'application/octet-stream',
      'Content-Length': String(s.size),
      'Cache-Control': 'public, max-age=3600',
    },
  })
}

app.get('/media/sources/*', (c) => {
  const rel = c.req.path.replace(/^\/media\/sources\//, '')
  return serveMedia(SOURCES_DIR, rel)
})
app.get('/media/renders/*', (c) => {
  const rel = c.req.path.replace(/^\/media\/renders\//, '')
  return serveMedia(RENDERS_DIR, rel)
})

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
  `[server] listening on :${PORT}  data=${DATA_DIR}  dist=${DIST_DIR}  base=${PUBLIC_BASE_URL}`,
)
