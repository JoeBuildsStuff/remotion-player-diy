// Local-filesystem storage adapter — the default. Sources land in SOURCES_DIR,
// renders in RENDERS_DIR. Bytes are served by /media/* on the same Hono app.
//
// On-disk layout (per user):
//   {sources,renders,projects}/users/<userId>/<file>
// Legacy flat files are moved once at init when a migration owner is known.

import {
  mkdir,
  readdir,
  readFile,
  rename,
  stat,
  unlink,
  writeFile,
} from 'node:fs/promises'
import { createReadStream, mkdirSync } from 'node:fs'
import { Readable } from 'node:stream'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import type { Hono } from 'hono'

import {
  migrationOwnerUserId,
  resolveRequestUserId,
} from '../../shared/identity.js'
import {
  isSafeFilename,
  parseMediaRelPath,
  parseUserScopedPathname,
  projectObjectRel,
  renderPathname,
  rewriteLegacyMediaUrl,
  sourcePathname,
  userDirName,
} from '../../shared/tenant-path.js'
import { signPathname, verifySignature } from './sign.js'
import type {
  ListedSource,
  PurgeResult,
  StorageAdapter,
  StoredObject,
} from './types.js'
import {
  ProjectSchema,
  summarize,
  type Project,
  type ProjectSummary,
} from '../../shared/project-schema.js'

export interface LocalAdapterConfig {
  sourcesDir: string
  rendersDir: string
  projectsDir: string
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
    await mkdir(this.cfg.projectsDir, { recursive: true })
    await this.migrateLegacyLayout()
  }

  async listProjects(ownerUserId: string): Promise<ProjectSummary[]> {
    const dir = this.userProjectsDir(ownerUserId)
    const entries = await readdir(dir).catch(() => [])
    const out: ProjectSummary[] = []
    for (const filename of entries) {
      if (!filename.endsWith('.json')) continue
      const full = path.join(dir, filename)
      try {
        const raw = await readFile(full, 'utf8')
        const parsed = ProjectSchema.parse(JSON.parse(raw))
        if (parsed.ownerUserId && parsed.ownerUserId !== ownerUserId) continue
        out.push(summarize(parsed))
      } catch (err) {
        console.warn(`[storage] skipping unreadable project ${filename}:`, err)
      }
    }
    out.sort((a, b) => b.updatedAt - a.updatedAt)
    return out
  }

  async getProject(id: string, ownerUserId: string): Promise<Project | null> {
    if (!isSafeProjectId(id)) {
      throw new Error(`Invalid project id: ${id}`)
    }
    const full = path.join(this.userProjectsDir(ownerUserId), `${id}.json`)
    const raw = await readFile(full, 'utf8').catch(() => null)
    if (raw == null) return null
    const parsed = ProjectSchema.parse(JSON.parse(raw))
    if (parsed.ownerUserId && parsed.ownerUserId !== ownerUserId) return null
    return parsed
  }

  async saveProject(project: Project): Promise<void> {
    if (!isSafeProjectId(project.id)) {
      throw new Error(`Invalid project id: ${project.id}`)
    }
    if (!project.ownerUserId) {
      throw new Error('Project is missing ownerUserId')
    }
    const dir = this.userProjectsDir(project.ownerUserId)
    await mkdir(dir, { recursive: true })
    const full = path.join(dir, `${project.id}.json`)
    await writeFile(full, JSON.stringify(project, null, 2), 'utf8')
  }

  async deleteProject(id: string, ownerUserId: string): Promise<void> {
    if (!isSafeProjectId(id)) {
      throw new Error(`Invalid project id: ${id}`)
    }
    const full = path.join(this.userProjectsDir(ownerUserId), `${id}.json`)
    await unlink(full).catch(() => {})
  }

  async uploadSource(input: {
    name: string
    data: Buffer
    ownerUserId: string
  }): Promise<StoredObject> {
    const safeName = input.name.replace(/[^\w.-]+/g, '_') || 'upload.bin'
    const filename = `${randomUUID()}-${safeName}`
    const dir = this.userSourcesDir(input.ownerUserId)
    await mkdir(dir, { recursive: true })
    await writeFile(path.join(dir, filename), input.data)
    const pathname = sourcePathname(input.ownerUserId, filename)
    return {
      url: this.buildUrl(pathname, this.cfg.sourcesTtlDays),
      pathname,
    }
  }

  renderTempPath(renderId: string, ownerUserId: string): string {
    const dir = this.userRendersDir(ownerUserId)
    mkdirSync(dir, { recursive: true })
    return path.join(dir, `${renderId}.mp4`)
  }

  async finalizeRender(
    localTempPath: string,
    renderId: string,
    ownerUserId: string,
  ): Promise<StoredObject> {
    await mkdir(this.userRendersDir(ownerUserId), { recursive: true })
    await stat(localTempPath)
    const pathname = renderPathname(ownerUserId, `${renderId}.mp4`)
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

  async listSources(ownerUserId: string): Promise<ListedSource[]> {
    const dir = this.userSourcesDir(ownerUserId)
    const entries = await readdir(dir).catch(() => [])
    const out: ListedSource[] = []
    for (const filename of entries) {
      const full = path.join(dir, filename)
      const s = await stat(full).catch(() => null)
      if (!s || !s.isFile()) continue
      const pathname = sourcePathname(ownerUserId, filename)
      const displayName = filename.replace(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-/i,
        '',
      )
      out.push({
        url: this.buildUrl(pathname, this.cfg.sourcesTtlDays),
        pathname,
        name: displayName || filename,
        size: s.size,
        uploadedAt: s.mtimeMs,
        contentType: MIME[path.extname(filename).toLowerCase()],
      })
    }
    out.sort((a, b) => b.uploadedAt - a.uploadedAt)
    return out
  }

  async deleteSource(pathname: string, ownerUserId: string): Promise<void> {
    const parsed = parseUserScopedPathname(pathname, 'sources')
    if (!parsed || parsed.userId !== ownerUserId) {
      throw new Error(`Invalid source pathname: ${pathname}`)
    }
    const full = path.join(this.userSourcesDir(ownerUserId), parsed.filename)
    await unlink(full)
  }

  async purgeSources(ttlDays: number): Promise<PurgeResult> {
    return this.purge('sources', this.cfg.sourcesDir, ttlDays)
  }

  async purgeRenders(ttlDays: number): Promise<PurgeResult> {
    return this.purge('renders', this.cfg.rendersDir, ttlDays)
  }

  private userSourcesDir(userId: string): string {
    return path.join(this.cfg.sourcesDir, 'users', userDirName(userId))
  }

  private userRendersDir(userId: string): string {
    return path.join(this.cfg.rendersDir, 'users', userDirName(userId))
  }

  private userProjectsDir(userId: string): string {
    return path.join(this.cfg.projectsDir, 'users', userDirName(userId))
  }

  private async migrateLegacyLayout(): Promise<void> {
    const owner = migrationOwnerUserId()
    const legacySources = await listLegacyFiles(this.cfg.sourcesDir)
    const legacyRenders = await listLegacyFiles(this.cfg.rendersDir)
    const legacyProjects = await listLegacyFiles(this.cfg.projectsDir, '.json')
    if (
      legacySources.length === 0 &&
      legacyRenders.length === 0 &&
      legacyProjects.length === 0
    ) {
      return
    }
    if (!owner) {
      console.warn(
        `[storage] ${legacySources.length + legacyRenders.length + legacyProjects.length} unscoped object(s) found; set DEFAULT_OWNER_USER_ID or SINGLE_TENANT=true to migrate them`,
      )
      return
    }

    await mkdir(this.userSourcesDir(owner), { recursive: true })
    await mkdir(this.userRendersDir(owner), { recursive: true })
    await mkdir(this.userProjectsDir(owner), { recursive: true })

    for (const filename of legacySources) {
      await rename(
        path.join(this.cfg.sourcesDir, filename),
        path.join(this.userSourcesDir(owner), filename),
      )
    }
    for (const filename of legacyRenders) {
      await rename(
        path.join(this.cfg.rendersDir, filename),
        path.join(this.userRendersDir(owner), filename),
      )
    }
    for (const filename of legacyProjects) {
      const src = path.join(this.cfg.projectsDir, filename)
      try {
        const raw = await readFile(src, 'utf8')
        const parsed = ProjectSchema.parse(JSON.parse(raw))
        const rewritten = this.rewriteProjectMedia(parsed, owner)
        rewritten.ownerUserId = owner
        const dest = path.join(
          this.cfg.projectsDir,
          projectObjectRel(owner, rewritten.id),
        )
        await writeFile(dest, JSON.stringify(rewritten, null, 2), 'utf8')
        await unlink(src)
      } catch (err) {
        console.warn(`[storage] failed to migrate project ${filename}:`, err)
      }
    }

    console.log(
      `[storage] migrated unscoped objects to users/${owner}/ (sources=${legacySources.length} renders=${legacyRenders.length} projects=${legacyProjects.length})`,
    )
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
    for await (const full of walkFiles(dir)) {
      scanned++
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
    const scoped = parseMediaRelPath(relPath)
    if (!scoped) return new Response('Not found', { status: 404 })

    const identity = resolveRequestUserId(req.headers)
    if (!identity.ok) return new Response(identity.message, { status: 401 })
    if (scoped.userId !== identity.userId) {
      return new Response('Not found', { status: 404 })
    }

    const full = path.resolve(baseDir, 'users', scoped.userId, scoped.filename)
    const allowedRoot = path.resolve(baseDir, 'users', scoped.userId) + path.sep
    if (!full.startsWith(allowedRoot)) {
      return new Response('Forbidden', { status: 403 })
    }

    if (this.cfg.signingSecret) {
      const url = new URL(req.url)
      const pathname = `${scope}/users/${scoped.userId}/${scoped.filename}`
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
        'Cache-Control': 'private, max-age=3600',
      },
    })
  }

  private rewriteProjectMedia(project: Project, ownerUserId: string): Project {
    const clips = project.clips.map((clip) => {
      const remoteSrc = clip.remoteSrc
      if (typeof remoteSrc !== 'string' || remoteSrc === '') return clip
      const rewritten = rewriteLegacyMediaUrl(remoteSrc, ownerUserId)
      if (rewritten === remoteSrc) return { ...clip }
      try {
        const u = new URL(rewritten)
        const pathname = u.pathname.replace(/^\/media\//, '')
        const ttlDays = pathname.startsWith('renders/')
          ? this.cfg.rendersTtlDays
          : this.cfg.sourcesTtlDays
        return { ...clip, remoteSrc: this.buildUrl(pathname, ttlDays) }
      } catch {
        return { ...clip, remoteSrc: rewritten }
      }
    })
    return { ...project, ownerUserId, clips }
  }
}


async function listLegacyFiles(
  dir: string,
  suffix?: string,
): Promise<string[]> {
  const entries = await readdir(dir).catch(() => [])
  const out: string[] = []
  for (const name of entries) {
    if (name === 'users') continue
    if (suffix && !name.endsWith(suffix)) continue
    if (!isSafeFilename(name)) continue
    const full = path.join(dir, name)
    const s = await stat(full).catch(() => null)
    if (!s || !s.isFile()) continue
    out.push(name)
  }
  return out
}

async function* walkFiles(dir: string): AsyncGenerator<string> {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => [])
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      yield* walkFiles(full)
    } else if (entry.isFile()) {
      yield full
    }
  }
}

function isSafeProjectId(id: string): boolean {
  return /^[A-Za-z0-9._-]+$/.test(id) && !id.includes('..')
}
