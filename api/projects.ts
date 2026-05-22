import { list, put } from '@vercel/blob'
import { randomUUID } from 'node:crypto'

import {
  DEFAULT_PROJECT_NAME,
  ProjectSchema,
  makeEmptyProject,
  summarize,
  type ProjectSummary,
} from '../shared/project-schema.js'

// List + create endpoints for persisted projects. Storage layout mirrors
// /api/sources: each project is a JSON blob at projects/<id>.json. Same
// shared-secret + cloud-enabled gating as the rest of the cloud API.

const SHARED_SECRET = process.env.RENDER_SHARED_SECRET

function unauthorized() {
  return new Response('Unauthorized', { status: 401 })
}

function guards(request: Request): Response | null {
  if (process.env.CLOUD_RENDER_ENABLED !== 'true') {
    return new Response('Cloud uploads are disabled on this deployment.', {
      status: 403,
    })
  }
  if (!SHARED_SECRET) {
    return new Response('Server misconfigured: RENDER_SHARED_SECRET not set', {
      status: 500,
    })
  }
  if (request.headers.get('x-render-secret') !== SHARED_SECRET) {
    return unauthorized()
  }
  return null
}

export async function GET(request: Request): Promise<Response> {
  const denied = guards(request)
  if (denied) return denied

  const summaries: ProjectSummary[] = []
  let cursor: string | undefined
  do {
    const page = await list({ prefix: 'projects/', cursor, limit: 1000 })
    for (const blob of page.blobs) {
      if (!blob.pathname.endsWith('.json')) continue
      try {
        const res = await fetch(blob.url)
        if (!res.ok) continue
        const raw = await res.text()
        const parsed = ProjectSchema.parse(JSON.parse(raw))
        summaries.push(summarize(parsed))
      } catch {
        // Skip projects we can't parse — never block the list.
      }
    }
    cursor = page.cursor
  } while (cursor)

  summaries.sort((a, b) => b.updatedAt - a.updatedAt)
  return Response.json({ projects: summaries })
}

export async function POST(request: Request): Promise<Response> {
  const denied = guards(request)
  if (denied) return denied

  let name: string | undefined
  try {
    const body = (await request.json().catch(() => ({}))) as { name?: unknown }
    if (typeof body.name === 'string' && body.name.trim() !== '') {
      name = body.name.trim()
    }
  } catch {
    // Optional body.
  }

  const project = makeEmptyProject({
    id: randomUUID(),
    name: name ?? DEFAULT_PROJECT_NAME,
  })
  await put(`projects/${project.id}.json`, JSON.stringify(project), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
  })
  return Response.json(project)
}
