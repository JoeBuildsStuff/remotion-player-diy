// Storage adapter contract used by /api/upload, /api/render, and /api/cleanup.
//
// Two implementations ship in-tree:
//   - local: writes to DATA_DIR/{sources,renders}, served via /media/*
//   - s3:    writes to an S3-compatible bucket (AWS, R2, MinIO, Spaces, …)
//
// The server is unaware of which is active — it asks the adapter for URLs,
// temp paths, and cleanup, and the adapter handles the rest.

import type { Hono } from 'hono'

export interface StoredObject {
  url: string // public URL the browser/editor will load
  pathname: string // logical key, e.g. "sources/abc-clip.mp4"
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
  }): Promise<StoredObject>

  // Renderer writes the MP4 to this path. For local this is the final
  // destination; for S3 it's a tmp file we upload + delete in finalize.
  renderTempPath(renderId: string): string

  finalizeRender(
    localTempPath: string,
    renderId: string,
  ): Promise<StoredObject>

  // Best-effort cleanup of a half-written render after a failure.
  abortRender(localTempPath: string): Promise<void>

  // Adapters that need to serve their own bytes (local) add routes here.
  // S3 is a no-op — URLs point directly at the bucket / CDN.
  registerRoutes(app: Hono): void

  purgeSources(ttlDays: number): Promise<PurgeResult>
  purgeRenders(ttlDays: number): Promise<PurgeResult>
}
