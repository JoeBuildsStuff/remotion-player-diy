import { del, head, list, put } from '@vercel/blob'

import { ProjectSchema } from '../../shared/project-schema.js'
import { requireCloudUser } from '../_identity.js'
import { migrationOwnerUserId } from '../../shared/identity.js'

function extractId(request: Request): string | null {
  const url = new URL(request.url)
  const m = url.pathname.match(/\/api\/projects\/([^/]+)/)
  if (!m) return null
  const id = decodeURIComponent(m[1])
  if (!/^[A-Za-z0-9._-]+$/.test(id)) return null
  return id
}

async function findOwnedBlobUrl(
  id: string,
  userId: string,
): Promise<string | null> {
  const candidates = [`projects/users/${userId}/${id}.json`]
  if (migrationOwnerUserId() === userId) {
    candidates.push(`projects/${id}.json`)
  }
  for (const pathname of candidates) {
    try {
      const meta = await head(pathname)
      return meta.url
    } catch {
      const page = await list({ prefix: pathname })
      const found = page.blobs.find((b) => b.pathname === pathname)
      if (found) return found.url
    }
  }
  return null
}

export async function GET(request: Request): Promise<Response> {
  const auth = requireCloudUser(request)
  if (auth instanceof Response) return auth
  const id = extractId(request)
  if (!id) return new Response('Invalid project id', { status: 400 })

  const url = await findOwnedBlobUrl(id, auth.userId)
  if (!url) return new Response('Not found', { status: 404 })
  const res = await fetch(url)
  if (!res.ok) return new Response('Not found', { status: 404 })
  const raw = await res.text()
  const parsed = ProjectSchema.safeParse(JSON.parse(raw))
  if (!parsed.success) return new Response('Corrupt project', { status: 500 })
  if (parsed.data.ownerUserId && parsed.data.ownerUserId !== auth.userId) {
    return new Response('Not found', { status: 404 })
  }
  return Response.json(parsed.data)
}

export async function PUT(request: Request): Promise<Response> {
  const auth = requireCloudUser(request)
  if (auth instanceof Response) return auth
  const id = extractId(request)
  if (!id) return new Response('Invalid project id', { status: 400 })

  const existingUrl = await findOwnedBlobUrl(id, auth.userId)
  if (!existingUrl) return new Response('Not found', { status: 404 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return new Response('Invalid JSON body', { status: 400 })
  }
  const parsed = ProjectSchema.safeParse(body)
  if (!parsed.success) {
    return new Response(`Invalid project: ${parsed.error.message}`, { status: 400 })
  }
  if (parsed.data.id !== id) {
    return new Response('Project id in body does not match URL', { status: 400 })
  }

  const next = {
    ...parsed.data,
    updatedAt: Date.now(),
    ownerUserId: auth.userId,
  }
  await put(`projects/users/${auth.userId}/${id}.json`, JSON.stringify(next), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
  })
  return Response.json(next)
}

export async function DELETE(request: Request): Promise<Response> {
  const auth = requireCloudUser(request)
  if (auth instanceof Response) return auth
  const id = extractId(request)
  if (!id) return new Response('Invalid project id', { status: 400 })

  const url = await findOwnedBlobUrl(id, auth.userId)
  if (!url) return new Response('Not found', { status: 404 })
  try {
    await del(url)
  } catch {
    // Ignore — caller treats delete as idempotent after a 404 check.
  }
  return new Response(null, { status: 204 })
}
