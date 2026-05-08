import { del, list } from '@vercel/blob'

const CRON_SECRET = process.env.CRON_SECRET
const RENDERS_TTL_DAYS = 7
const SOURCES_TTL_DAYS = 30

const PREFIXES = [
  { prefix: 'renders/', ttlDays: RENDERS_TTL_DAYS },
  { prefix: 'sources/', ttlDays: SOURCES_TTL_DAYS },
]

async function purgePrefix(prefix: string, ttlDays: number) {
  const cutoff = Date.now() - ttlDays * 24 * 60 * 60 * 1000

  let cursor: string | undefined
  let scanned = 0
  let deleted = 0

  do {
    const page = await list({ prefix, cursor, limit: 1000 })
    scanned += page.blobs.length
    const stale = page.blobs.filter((b) => b.uploadedAt.getTime() < cutoff)
    if (stale.length) {
      await del(stale.map((b) => b.url))
      deleted += stale.length
    }
    cursor = page.cursor
  } while (cursor)

  return { prefix, scanned, deleted, ttlDays }
}

export async function GET(request: Request): Promise<Response> {
  if (!CRON_SECRET) {
    return new Response('Server misconfigured: CRON_SECRET not set', {
      status: 500,
    })
  }
  if (request.headers.get('authorization') !== `Bearer ${CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const results = await Promise.all(
    PREFIXES.map(({ prefix, ttlDays }) => purgePrefix(prefix, ttlDays)),
  )

  return Response.json({ ok: true, results })
}
