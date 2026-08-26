// S3-compatible storage adapter. Works with AWS S3, Cloudflare R2, MinIO,
// Backblaze B2, DigitalOcean Spaces, Wasabi — anything that speaks the S3 API.
//
// URLs returned to the editor are presigned GetObject URLs by default. If a
// CDN / public bucket is preferred, set S3_PUBLIC_BASE_URL and we return
// `${publicBase}/${key}` instead — the bucket policy is then responsible for
// gating reads.
//
// Renders are written to a local tmp file by @remotion/renderer, then
// uploaded here in finalizeRender.

import { readFile, stat, unlink, mkdir } from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { randomUUID } from 'node:crypto'
import type { Hono } from 'hono'

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  DeleteObjectCommand,
  DeleteObjectsCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

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
import {
  parseUserScopedPathname,
  renderPathname,
  sourcePathname,
  userDirName,
} from '../../shared/tenant-path.js'

export interface S3AdapterConfig {
  bucket: string
  region: string
  endpoint?: string
  forcePathStyle?: boolean
  accessKeyId?: string
  secretAccessKey?: string
  sourcesPrefix: string
  rendersPrefix: string
  projectsPrefix: string
  /** When set, returned URLs are `${publicBaseUrl}/${key}` instead of presigned. */
  publicBaseUrl?: string
  sourcesTtlDays: number
  rendersTtlDays: number
  tmpDir: string
}

const CONTENT_TYPE_BY_EXT: Record<string, string> = {
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

// S3 presigned URLs with SigV4 max out at 7 days. We cap the requested expiry
// here so the SDK doesn't throw when a TTL of e.g. 30d is configured. If you
// need longer-lived URLs, point at a public bucket / CDN via S3_PUBLIC_BASE_URL.
const MAX_PRESIGN_SECONDS = 7 * 24 * 60 * 60

export class S3StorageAdapter implements StorageAdapter {
  readonly kind = 's3' as const
  private readonly client: S3Client

  constructor(private readonly cfg: S3AdapterConfig) {
    this.client = new S3Client({
      region: cfg.region,
      endpoint: cfg.endpoint,
      forcePathStyle: cfg.forcePathStyle,
      credentials:
        cfg.accessKeyId && cfg.secretAccessKey
          ? {
              accessKeyId: cfg.accessKeyId,
              secretAccessKey: cfg.secretAccessKey,
            }
          : undefined,
    })
  }

  async init() {
    await mkdir(this.cfg.tmpDir, { recursive: true })
  }

  async listProjects(ownerUserId: string): Promise<ProjectSummary[]> {
    const prefix = this.userProjectsPrefix(ownerUserId)
    const out: ProjectSummary[] = []
    let token: string | undefined
    do {
      const page = await this.client.send(
        new ListObjectsV2Command({
          Bucket: this.cfg.bucket,
          Prefix: prefix,
          ContinuationToken: token,
        }),
      )
      for (const obj of page.Contents ?? []) {
        if (!obj.Key || !obj.Key.endsWith('.json')) continue
        try {
          const got = await this.client.send(
            new GetObjectCommand({ Bucket: this.cfg.bucket, Key: obj.Key }),
          )
          const raw = await got.Body?.transformToString('utf-8')
          if (!raw) continue
          const parsed = ProjectSchema.parse(JSON.parse(raw))
          if (parsed.ownerUserId && parsed.ownerUserId !== ownerUserId) continue
          out.push(summarize(parsed))
        } catch (err) {
          console.warn(`[storage] skipping unreadable project ${obj.Key}:`, err)
        }
      }
      token = page.IsTruncated ? page.NextContinuationToken : undefined
    } while (token)
    out.sort((a, b) => b.updatedAt - a.updatedAt)
    return out
  }

  async getProject(id: string, ownerUserId: string): Promise<Project | null> {
    if (!isSafeProjectId(id)) throw new Error(`Invalid project id: ${id}`)
    const key = this.projectKey(ownerUserId, id)
    try {
      const got = await this.client.send(
        new GetObjectCommand({ Bucket: this.cfg.bucket, Key: key }),
      )
      const raw = await got.Body?.transformToString('utf-8')
      if (!raw) return null
      const parsed = ProjectSchema.parse(JSON.parse(raw))
      if (parsed.ownerUserId && parsed.ownerUserId !== ownerUserId) return null
      return parsed
    } catch (err: unknown) {
      if (
        err &&
        typeof err === 'object' &&
        'name' in err &&
        (err.name === 'NoSuchKey' || err.name === 'NotFound')
      ) {
        return null
      }
      throw err
    }
  }

  async saveProject(project: Project): Promise<void> {
    if (!isSafeProjectId(project.id)) {
      throw new Error(`Invalid project id: ${project.id}`)
    }
    if (!project.ownerUserId) {
      throw new Error('Project is missing ownerUserId')
    }
    const key = this.projectKey(project.ownerUserId, project.id)
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.cfg.bucket,
        Key: key,
        Body: JSON.stringify(project),
        ContentType: 'application/json',
      }),
    )
  }

  async deleteProject(id: string, ownerUserId: string): Promise<void> {
    if (!isSafeProjectId(id)) throw new Error(`Invalid project id: ${id}`)
    const key = this.projectKey(ownerUserId, id)
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.cfg.bucket, Key: key }),
    )
  }

  async uploadSource(input: {
    name: string
    data: Buffer
    contentType?: string
    ownerUserId: string
  }): Promise<StoredObject> {
    const safeName = input.name.replace(/[^\w.-]+/g, '_') || 'upload.bin'
    const filename = `${randomUUID()}-${safeName}`
    const key = this.sourceKey(input.ownerUserId, filename)
    const contentType =
      input.contentType ?? CONTENT_TYPE_BY_EXT[path.extname(filename).toLowerCase()]
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.cfg.bucket,
        Key: key,
        Body: input.data,
        ContentType: contentType,
      }),
    )
    return {
      url: await this.publicUrl(key, this.cfg.sourcesTtlDays),
      pathname: sourcePathname(input.ownerUserId, filename),
    }
  }

  renderTempPath(renderId: string, _ownerUserId: string): string {
    return path.join(this.cfg.tmpDir, `${renderId}.mp4`)
  }

  async finalizeRender(
    localTempPath: string,
    renderId: string,
    ownerUserId: string,
  ): Promise<StoredObject> {
    const filename = `${renderId}.mp4`
    const key = this.renderKey(ownerUserId, filename)
    const body = await readFile(localTempPath)
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.cfg.bucket,
        Key: key,
        Body: body,
        ContentType: 'video/mp4',
      }),
    )
    // Local tmp file is no longer needed.
    await unlink(localTempPath).catch(() => {})
    return {
      url: await this.publicUrl(key, this.cfg.rendersTtlDays),
      pathname: renderPathname(ownerUserId, filename),
    }
  }

  async abortRender(localTempPath: string): Promise<void> {
    await unlink(localTempPath).catch(() => {})
  }

  registerRoutes(_app: Hono): void {
    // No-op — URLs go straight to S3 / CDN.
  }

  async listSources(ownerUserId: string): Promise<ListedSource[]> {
    const prefix = this.userSourcesPrefix(ownerUserId)
    const out: ListedSource[] = []
    let token: string | undefined
    do {
      const page = await this.client.send(
        new ListObjectsV2Command({
          Bucket: this.cfg.bucket,
          Prefix: prefix,
          ContinuationToken: token,
        }),
      )
      for (const obj of page.Contents ?? []) {
        if (!obj.Key) continue
        const filename = obj.Key.slice(prefix.length)
        if (!filename || filename.includes('/')) continue
        const displayName = filename.replace(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-/i,
          '',
        )
        out.push({
          url: await this.publicUrl(obj.Key, this.cfg.sourcesTtlDays),
          pathname: sourcePathname(ownerUserId, filename),
          name: displayName || filename,
          size: obj.Size ?? 0,
          uploadedAt: obj.LastModified?.getTime() ?? 0,
          contentType: CONTENT_TYPE_BY_EXT[path.extname(filename).toLowerCase()],
        })
      }
      token = page.IsTruncated ? page.NextContinuationToken : undefined
    } while (token)
    out.sort((a, b) => b.uploadedAt - a.uploadedAt)
    return out
  }

  async deleteSource(pathname: string, ownerUserId: string): Promise<void> {
    const parsed = parseUserScopedPathname(pathname, 'sources')
    if (!parsed || parsed.userId !== ownerUserId) {
      throw new Error(`Invalid source pathname: ${pathname}`)
    }
    const key = this.sourceKey(ownerUserId, parsed.filename)
    await this.client.send(
      new DeleteObjectsCommand({
        Bucket: this.cfg.bucket,
        Delete: { Objects: [{ Key: key }], Quiet: true },
      }),
    )
  }

  async purgeSources(ttlDays: number): Promise<PurgeResult> {
    return this.purge('sources', this.cfg.sourcesPrefix, ttlDays)
  }

  async purgeRenders(ttlDays: number): Promise<PurgeResult> {
    return this.purge('renders', this.cfg.rendersPrefix, ttlDays)
  }

  private async purge(
    scope: 'sources' | 'renders',
    prefix: string,
    ttlDays: number,
  ): Promise<PurgeResult> {
    if (ttlDays <= 0) return { scope, scanned: 0, deleted: 0, ttlDays }
    const cutoff = Date.now() - ttlDays * 24 * 60 * 60 * 1000
    let scanned = 0
    let deleted = 0
    let token: string | undefined
    do {
      const page = await this.client.send(
        new ListObjectsV2Command({
          Bucket: this.cfg.bucket,
          Prefix: prefix.endsWith('/') ? prefix : `${prefix}/`,
          ContinuationToken: token,
        }),
      )
      const toDelete: { Key: string }[] = []
      for (const obj of page.Contents ?? []) {
        scanned++
        if (!obj.Key) continue
        if (obj.LastModified && obj.LastModified.getTime() < cutoff) {
          toDelete.push({ Key: obj.Key })
        }
      }
      if (toDelete.length > 0) {
        await this.client.send(
          new DeleteObjectsCommand({
            Bucket: this.cfg.bucket,
            Delete: { Objects: toDelete, Quiet: true },
          }),
        )
        deleted += toDelete.length
      }
      token = page.IsTruncated ? page.NextContinuationToken : undefined
    } while (token)
    return { scope, scanned, deleted, ttlDays }
  }

  private async publicUrl(key: string, ttlDays: number): Promise<string> {
    if (this.cfg.publicBaseUrl) {
      return `${stripTrailingSlash(this.cfg.publicBaseUrl)}/${key}`
    }
    const expiresIn = Math.min(
      Math.max(ttlDays, 1) * 24 * 60 * 60,
      MAX_PRESIGN_SECONDS,
    )
    return getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: this.cfg.bucket, Key: key }),
      { expiresIn },
    )
  }

  private userSourcesPrefix(ownerUserId: string): string {
    return `${joinKey(this.cfg.sourcesPrefix, `users/${userDirName(ownerUserId)}`)}/`
  }

  private userProjectsPrefix(ownerUserId: string): string {
    return `${joinKey(this.cfg.projectsPrefix, `users/${userDirName(ownerUserId)}`)}/`
  }

  private sourceKey(ownerUserId: string, filename: string): string {
    return joinKey(this.cfg.sourcesPrefix, `users/${userDirName(ownerUserId)}/${filename}`)
  }

  private renderKey(ownerUserId: string, filename: string): string {
    return joinKey(this.cfg.rendersPrefix, `users/${userDirName(ownerUserId)}/${filename}`)
  }

  private projectKey(ownerUserId: string, projectId: string): string {
    return joinKey(
      this.cfg.projectsPrefix,
      `users/${userDirName(ownerUserId)}/${projectId}.json`,
    )
  }
}

function joinKey(prefix: string, name: string): string {
  const p = prefix.replace(/^\/+|\/+$/g, '')
  return p ? `${p}/${name}` : name
}

function stripTrailingSlash(s: string): string {
  return s.replace(/\/+$/, '')
}

function isSafeProjectId(id: string): boolean {
  return /^[A-Za-z0-9._-]+$/.test(id) && !id.includes('..')
}

export function defaultTmpDir(): string {
  return path.join(os.tmpdir(), 'remotion-player-renders')
}
