import { list, put } from '@vercel/blob'
import { randomUUID } from 'node:crypto'

import {
  DEFAULT_PROJECT_NAME,
  ProjectSchema,
  makeEmptyProject,
  summarize,
  type ProjectSummary,
} from '../shared/project-schema.js'
import { requireCloudUser } from './_identity.js'
import { migrationOwnerUserId } from '../shared/identity.js'

export async function GET(request: Request): Promise<Response> {
  const auth = requireCloudUser(request)
  if (auth instanceof Response) return auth

  const summaries: ProjectSummary[] = []
  const prefixes = [`projects/users/${auth.userId}/`]
  if (migrationOwnerUserId() === auth.userId) {
    prefixes.push('projects/')
  }

  for (const prefix of prefixes) {
    let cursor: string | undefined
    do {
      const page = await list({ prefix, cursor, limit: 1000 })
      for (const blob of page.blobs) {
        if (!blob.pathname.endsWith('.json')) continue
        if (
          prefix === 'projects/' &&
          blob.pathname.startsWith('projects/users/')
        ) {
          continue
        }
        try {
          const res = await fetch(blob.url)
          if (!res.ok) continue
          const raw = await res.text()
          const parsed = ProjectSchema.parse(JSON.parse(raw))
          if (parsed.ownerUserId && parsed.ownerUserId !== auth.userId) continue
          summaries.push(summarize(parsed))
        } catch {
          // Skip projects we can't parse — never block the list.
        }
      }
      cursor = page.cursor
    } while (cursor)
  }

  summaries.sort((a, b) => b.updatedAt - a.updatedAt)
  return Response.json({ projects: summaries })
}

export async function POST(request: Request): Promise<Response> {
  const auth = requireCloudUser(request)
  if (auth instanceof Response) return auth

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
    ownerUserId: auth.userId,
  })
  await put(
    `projects/users/${auth.userId}/${project.id}.json`,
    JSON.stringify(project),
    {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
      allowOverwrite: true,
    },
  )
  return Response.json(project)
}
