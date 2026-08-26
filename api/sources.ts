import { del, list } from '@vercel/blob'

import { requireCloudUser } from './_identity.js'
import { migrationOwnerUserId } from '../shared/identity.js'
import { parseUserScopedPathname } from '../shared/tenant-path.js'

const FILENAME_UUID_PREFIX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-/i

export async function GET(request: Request): Promise<Response> {
  const auth = requireCloudUser(request)
  if (auth instanceof Response) return auth

  const sources: Array<{
    url: string
    pathname: string
    name: string
    size: number
    uploadedAt: number
  }> = []

  const prefixes = [`sources/users/${auth.userId}/`]
  if (migrationOwnerUserId() === auth.userId) {
    prefixes.push('sources/')
  }

  for (const prefix of prefixes) {
    let cursor: string | undefined
    do {
      const page = await list({ prefix, cursor, limit: 1000 })
      for (const blob of page.blobs) {
        if (prefix === 'sources/' && blob.pathname.startsWith('sources/users/')) {
          continue
        }
        const leaf = blob.pathname.split('/').pop() ?? blob.pathname
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
  }

  sources.sort((a, b) => b.uploadedAt - a.uploadedAt)
  return Response.json({ sources })
}

export async function DELETE(request: Request): Promise<Response> {
  const auth = requireCloudUser(request)
  if (auth instanceof Response) return auth

  let body: { url?: unknown; pathname?: unknown }
  try {
    body = (await request.json()) as { url?: unknown; pathname?: unknown }
  } catch {
    return new Response('Invalid JSON body', { status: 400 })
  }

  const pathname =
    typeof body.pathname === 'string' && body.pathname.startsWith('sources/')
      ? body.pathname
      : null
  if (!pathname) {
    return new Response('Missing url or pathname', { status: 400 })
  }

  const scoped = parseUserScopedPathname(pathname, 'sources')
  const isLegacyFlat =
    migrationOwnerUserId() === auth.userId &&
    /^sources\/[^/]+$/.test(pathname)
  if ((!scoped || scoped.userId !== auth.userId) && !isLegacyFlat) {
    return new Response('Not found', { status: 404 })
  }

  const target =
    typeof body.url === 'string' && body.url ? body.url : pathname

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
