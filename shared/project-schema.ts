// A Project is the persisted, user-editable subset of EditorState plus
// identity + timestamps. Transient editor fields (currentFrame, isPlaying,
// zoom levels, selection, refs) are intentionally NOT part of a project —
// they're per-session UI state, not part of the composition.
//
// The shape is shared by the self-hosted Hono server, the Vercel API routes,
// and the editor client, so it lives in /shared/ alongside the SSE contract.

import { z } from 'zod'

// Clips are validated permissively at the project layer. The render path
// (remotion/schema.ts) keeps its own strict ClipSchema for what actually
// reaches the renderer; here we just need round-tripping safety.
const ProjectClipSchema = z.record(z.string(), z.unknown())

const ExportSettingsSchema = z.object({
  quality: z.number().min(1).max(100),
  audioBitrateKbps: z.number().int().min(64).max(320),
  resolutionScale: z.number().int().min(25).max(400),
})

export const ProjectSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  createdAt: z.number(),
  updatedAt: z.number(),
  fps: z.number().int().positive(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  volume: z.number().min(0).max(1),
  exportSettings: ExportSettingsSchema,
  clips: z.array(ProjectClipSchema),
  // Stamped by the server from trusted request identity. Optional in the
  // schema so pre-tenancy JSON still parses; save paths always set it.
  ownerUserId: z.string().min(1).optional(),
})

export type Project = z.infer<typeof ProjectSchema>

export const ProjectSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  createdAt: z.number(),
  updatedAt: z.number(),
  clipCount: z.number().int().nonnegative(),
})

export type ProjectSummary = z.infer<typeof ProjectSummarySchema>

export const DEFAULT_PROJECT_NAME = 'Untitled project'

export function makeEmptyProject(input: {
  id: string
  name?: string
  now?: number
  ownerUserId: string
}): Project {
  const now = input.now ?? Date.now()
  return {
    id: input.id,
    name: input.name ?? DEFAULT_PROJECT_NAME,
    createdAt: now,
    updatedAt: now,
    fps: 30,
    width: 1920,
    height: 1080,
    volume: 0.4,
    exportSettings: {
      quality: 70,
      audioBitrateKbps: 128,
      resolutionScale: 100,
    },
    clips: [],
    ownerUserId: input.ownerUserId,
  }
}

export function summarize(p: Project): ProjectSummary {
  return {
    id: p.id,
    name: p.name,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    clipCount: p.clips.length,
  }
}
