// Storage adapter contract used by /api/upload, /api/render, and /api/cleanup.
//
// Two implementations ship in-tree:
//   - local: writes to DATA_DIR/{sources,renders,projects}, served via /media/*
//   - s3:    writes to an S3-compatible bucket (AWS, R2, MinIO, Spaces, …)
//
// Objects are stored under users/<userId>/ so listing and /media/* can enforce
// ownership in the adapter, not only in the UI.

import type { Hono } from 'hono'

import type { Project, ProjectSummary } from '../../shared/project-schema.js'

export interface StoredObject {
  url: string // public URL the browser/editor will load
  pathname: string // logical key, e.g. "sources/users/<id>/abc-clip.mp4"
}

export interface ListedSource {
  url: string
  pathname: string
  name: string // user-visible filename (suffix after the random id)
  size: number
  uploadedAt: number // ms since epoch
  contentType?: string
}

export interface PurgeResult {
  scope: 'sources' | 'renders'
  scanned: number
  deleted: number
  ttlDays: number
}

export interface StorageAdapter {
  readonly kind: 'local' | 's3'

  uploadSource(input: {
    name: string
    data: Buffer
    contentType?: string
    ownerUserId: string
  }): Promise<StoredObject>

  // Renderer writes the MP4 to this path. For local this is the final
  // destination; for S3 it's a tmp file we upload + delete in finalize.
  renderTempPath(renderId: string, ownerUserId: string): string

  finalizeRender(
    localTempPath: string,
    renderId: string,
    ownerUserId: string,
  ): Promise<StoredObject>

  // Best-effort cleanup of a half-written render after a failure.
  abortRender(localTempPath: string): Promise<void>

  // Adapters that need to serve their own bytes (local) add routes here.
  // S3 is a no-op — URLs point directly at the bucket / CDN.
  registerRoutes(app: Hono): void

  purgeSources(ttlDays: number): Promise<PurgeResult>
  purgeRenders(ttlDays: number): Promise<PurgeResult>

  listSources(ownerUserId: string): Promise<ListedSource[]>

  /** Delete a single source by its logical pathname (e.g. "sources/users/<id>/abc.mp4"). */
  deleteSource(pathname: string, ownerUserId: string): Promise<void>

  // Project persistence — JSON blobs keyed by project id under
  // projects/users/<ownerUserId>/.
  listProjects(ownerUserId: string): Promise<ProjectSummary[]>
  getProject(id: string, ownerUserId: string): Promise<Project | null>
  saveProject(project: Project): Promise<void>
  deleteProject(id: string, ownerUserId: string): Promise<void>
}
