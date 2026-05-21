import { del, list } from '@vercel/blob'

// Lists previously uploaded source media so the editor can re-attach a clip
// without re-uploading. Same shape as the selfhost server's /api/sources.

const SHARED_SECRET = process.env.RENDER_SHARED_SECRET

const FILENAME_UUID_PREFIX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-/i

function unauthorized() {
  return new Response('Unauthorized', { status: 401 })
}

export async function GET(request: Request): Promise<Response> {
  if (process.env.CLOUD_RENDER_ENABLED !== 'true') {
    return new Response(
      'Cloud uploads are disabled on this deployment.',
      { status: 403 },
    )
  }
  if (!SHARED_SECRET) {
    return new Response('Server misconfigured: RENDER_SHARED_SECRET not set', {
      status: 500,
    })
  }
  if (request.headers.get('x-render-secret') !== SHARED_SECRET) {
    return unauthorized()
  }

  const sources: Array<{
    url: string
    pathname: string
    name: string
    size: number
    uploadedAt: number
  }> = []

  let cursor: string | undefined
  do {
    const page = await list({ prefix: 'sources/', cursor, limit: 1000 })
    for (const blob of page.blobs) {
      // pathname looks like "sources/uuid-original-name.ext" because the upload
      // route sets addRandomSuffix: true; @vercel/blob keeps the suffix style
      // but in either case we want just the leaf for display.
      const leaf = blob.pathname.replace(/^sources\//, '')
      const displayName = leaf.replace(FILENAME_UUID_PREFIX, '')
      sources.push({
        url: blob.url,
        pathname: blob.pathname,
        name: displayName || leaf,
        size: blob.size,
        uploadedAt: blob.uploadedAt.getTime(),
      })
    }
    cursor = page.cursor
  } while (cursor)

  sources.sort((a, b) => b.uploadedAt - a.uploadedAt)
  return Response.json({ sources })
}

export async function DELETE(request: Request): Promise<Response> {
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

  let body: { url?: unknown; pathname?: unknown }
  try {
    body = (await request.json()) as { url?: unknown; pathname?: unknown }
  } catch {
    return new Response('Invalid JSON body', { status: 400 })
  }

  // @vercel/blob.del takes the full URL — list() returns it as blob.url. The
  // client sends both so we can fall back gracefully.
  const target =
    typeof body.url === 'string' && body.url
      ? body.url
      : typeof body.pathname === 'string' && body.pathname.startsWith('sources/')
        ? body.pathname
        : null
  if (!target) {
    return new Response('Missing url or pathname', { status: 400 })
  }

  try {
    await del(target)
  } catch (err) {
    return new Response(
      err instanceof Error ? err.message : 'Delete failed',
      { status: 400 },
    )
  }
  return Response.json({ ok: true })
}
