// Local-filesystem storage adapter — the default. Sources land in SOURCES_DIR,
// renders in RENDERS_DIR. Bytes are served by /media/* on the same Hono app.

import { mkdir, readdir, stat, unlink, writeFile } from 'node:fs/promises'
import { createReadStream } from 'node:fs'
import { Readable } from 'node:stream'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import type { Hono } from 'hono'

import { signPathname, verifySignature } from './sign.js'
import type {
  PurgeResult,
  StorageAdapter,
  StoredObject,
} from './types.js'

export interface LocalAdapterConfig {
  sourcesDir: string
  rendersDir: string
  publicBaseUrl: string
  signingSecret?: string
  sourcesTtlDays: number
  rendersTtlDays: number
}

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

export class LocalStorageAdapter implements StorageAdapter {
  readonly kind = 'local' as const
  constructor(private readonly cfg: LocalAdapterConfig) {}

  async init() {
    await mkdir(this.cfg.sourcesDir, { recursive: true })
    await mkdir(this.cfg.rendersDir, { recursive: true })
  }

  async uploadSource(input: {
    name: string
    data: Buffer
  }): Promise<StoredObject> {
    const safeName = input.name.replace(/[^\w.-]+/g, '_') || 'upload.bin'
    const id = randomUUID()
    const filename = `${id}-${safeName}`
    const dest = path.join(this.cfg.sourcesDir, filename)
    await writeFile(dest, input.data)
    const pathname = `sources/${filename}`
    return {
      url: this.buildUrl(pathname, this.cfg.sourcesTtlDays),
      pathname,
    }
  }

  renderTempPath(renderId: string): string {
    return path.join(this.cfg.rendersDir, `${renderId}.mp4`)
  }

  async finalizeRender(
    localTempPath: string,
    renderId: string,
  ): Promise<StoredObject> {
    // For local storage the temp path *is* the final path — renderer wrote
    // straight into RENDERS_DIR. Just stat to confirm and build the URL.
    await stat(localTempPath)
    const pathname = `renders/${renderId}.mp4`
    return {
      url: this.buildUrl(pathname, this.cfg.rendersTtlDays),
      pathname,
    }
  }

  async abortRender(localTempPath: string): Promise<void> {
    await unlink(localTempPath).catch(() => {})
  }

  registerRoutes(app: Hono): void {
    app.get('/media/sources/*', (c) => {
      const rel = c.req.path.replace(/^\/media\/sources\//, '')
      return this.serveMedia('sources', this.cfg.sourcesDir, rel, c.req.raw)
    })
    app.get('/media/renders/*', (c) => {
      const rel = c.req.path.replace(/^\/media\/renders\//, '')
      return this.serveMedia('renders', this.cfg.rendersDir, rel, c.req.raw)
    })
  }

  async purgeSources(ttlDays: number): Promise<PurgeResult> {
    return this.purge('sources', this.cfg.sourcesDir, ttlDays)
  }

  async purgeRenders(ttlDays: number): Promise<PurgeResult> {
    return this.purge('renders', this.cfg.rendersDir, ttlDays)
  }

  private async purge(
    scope: 'sources' | 'renders',
    dir: string,
    ttlDays: number,
  ): Promise<PurgeResult> {
    if (ttlDays <= 0) return { scope, scanned: 0, deleted: 0, ttlDays }
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
    return { scope, scanned, deleted, ttlDays }
  }

  private buildUrl(pathname: string, ttlDays: number): string {
    const base = `${this.cfg.publicBaseUrl}/media/${pathname}`
    if (!this.cfg.signingSecret) return base
    // Signed URLs need to outlive the file itself, otherwise the editor breaks
    // before cleanup runs. Use the TTL with a small buffer; never less than 1d.
    const ttlSeconds = Math.max(ttlDays, 1) * 24 * 60 * 60
    const expiresAt = Math.floor(Date.now() / 1000) + ttlSeconds
    const query = signPathname(pathname, expiresAt, this.cfg.signingSecret)
    return `${base}?${query}`
  }

  private async serveMedia(
    scope: 'sources' | 'renders',
    baseDir: string,
    relPath: string,
    req: Request,
  ): Promise<Response> {
    // Path-traversal guard.
    const full = path.resolve(baseDir, relPath)
    if (!full.startsWith(path.resolve(baseDir) + path.sep)) {
      return new Response('Forbidden', { status: 403 })
    }

    if (this.cfg.signingSecret) {
      const url = new URL(req.url)
      const pathname = `${scope}/${relPath}`
      const ok = verifySignature(
        pathname,
        url.searchParams.get('exp'),
        url.searchParams.get('sig'),
        this.cfg.signingSecret,
      )
      if (!ok) return new Response('Forbidden', { status: 403 })
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
}
