import { del, head, list, put } from '@vercel/blob'

import { ProjectSchema } from '../../shared/project-schema.js'

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

function extractId(request: Request): string | null {
  const url = new URL(request.url)
  const m = url.pathname.match(/\/api\/projects\/([^/]+)/)
  if (!m) return null
  const id = decodeURIComponent(m[1])
  if (!/^[A-Za-z0-9._-]+$/.test(id)) return null
  return id
}

async function findBlobUrl(id: string): Promise<string | null> {
  // @vercel/blob.head() is the cheapest way to look up by pathname.
  const pathname = `projects/${id}.json`
  try {
    const meta = await head(pathname)
    return meta.url
  } catch {
    // Fall back to listing in case the pathname-keyed lookup mode isn't
    // available on the runtime — `head()` requires the full URL there.
    const page = await list({ prefix: pathname })
    const found = page.blobs.find((b) => b.pathname === pathname)
    return found?.url ?? null
  }
}

export async function GET(request: Request): Promise<Response> {
  const denied = guards(request)
  if (denied) return denied
  const id = extractId(request)
  if (!id) return new Response('Invalid project id', { status: 400 })

  const url = await findBlobUrl(id)
  if (!url) return new Response('Not found', { status: 404 })
  const res = await fetch(url)
  if (!res.ok) return new Response('Not found', { status: 404 })
  const raw = await res.text()
  const parsed = ProjectSchema.safeParse(JSON.parse(raw))
  if (!parsed.success) return new Response('Corrupt project', { status: 500 })
  return Response.json(parsed.data)
}

export async function PUT(request: Request): Promise<Response> {
  const denied = guards(request)
  if (denied) return denied
  const id = extractId(request)
  if (!id) return new Response('Invalid project id', { status: 400 })

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

  const next = { ...parsed.data, updatedAt: Date.now() }
  await put(`projects/${id}.json`, JSON.stringify(next), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
  })
  return Response.json(next)
}

export async function DELETE(request: Request): Promise<Response> {
  const denied = guards(request)
  if (denied) return denied
  const id = extractId(request)
  if (!id) return new Response('Invalid project id', { status: 400 })

  const url = await findBlobUrl(id)
  if (url) {
    try {
      await del(url)
    } catch {
      // Ignore — caller treats delete as idempotent.
    }
  }
  return new Response(null, { status: 204 })
}
