// User-scoped object layout.
//
// Logical pathnames (and local /media URLs) look like:
//   sources/users/<userId>/<filename>
//   renders/users/<userId>/<filename>
//   projects/users/<userId>/<projectId>.json
//
// The user segment is taken from trusted request identity, never from the
// client. Media serving refuses bytes whose path userId does not match.

import { sanitizeUserId } from './identity.js'

const FILENAME_UNSAFE = /[\\/]/

export function userDirName(userId: string): string {
  const id = sanitizeUserId(userId)
  if (!id) throw new Error(`Invalid user id: ${userId}`)
  return id
}

export function sourcePathname(userId: string, filename: string): string {
  assertSafeFilename(filename)
  return `sources/users/${userDirName(userId)}/${filename}`
}

export function renderPathname(userId: string, filename: string): string {
  assertSafeFilename(filename)
  return `renders/users/${userDirName(userId)}/${filename}`
}

export function projectObjectRel(userId: string, projectId: string): string {
  assertSafeFilename(`${projectId}.json`)
  return `users/${userDirName(userId)}/${projectId}.json`
}

export function parseUserScopedPathname(
  pathname: string,
  kind: 'sources' | 'renders',
): { userId: string; filename: string } | null {
  const prefix = `${kind}/users/`
  if (!pathname.startsWith(prefix)) return null
  const rest = pathname.slice(prefix.length)
  const slash = rest.indexOf('/')
  if (slash <= 0) return null
  const userId = sanitizeUserId(rest.slice(0, slash))
  const filename = rest.slice(slash + 1)
  if (!userId || !isSafeFilename(filename)) return null
  return { userId, filename }
}

export function parseMediaRelPath(
  relPath: string,
): { userId: string; filename: string } | null {
  // relPath is the portion after /media/sources/ or /media/renders/.
  const parts = relPath.split('/').filter((p) => p.length > 0)
  if (parts.length !== 3 || parts[0] !== 'users') return null
  const userId = sanitizeUserId(parts[1])
  const filename = parts[2]
  if (!userId || !isSafeFilename(filename)) return null
  return { userId, filename }
}

export function pathnameOwnedBy(
  pathname: string,
  userId: string,
  kind: 'sources' | 'renders' = 'sources',
): boolean {
  const parsed = parseUserScopedPathname(pathname, kind)
  return parsed?.userId === userId
}

export function isSafeFilename(filename: string): boolean {
  if (!filename || filename === '.' || filename === '..') return false
  if (FILENAME_UNSAFE.test(filename) || filename.includes('..')) return false
  return true
}

export function assertSafeFilename(filename: string): void {
  if (!isSafeFilename(filename)) {
    throw new Error(`Invalid filename: ${filename}`)
  }
}

const LEGACY_MEDIA_PATH =
  /^\/media\/(sources|renders)\/([^/]+)$/

/**
 * Rewrite a stored clip URL that still points at a flat /media/{scope}/{file}
 * path onto the owner-prefixed path. Already-scoped URLs are left alone.
 * Query strings (old signatures) are dropped — callers re-sign if needed.
 */
export function rewriteLegacyMediaUrl(
  url: string,
  ownerUserId: string,
): string {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return url
  }
  const match = parsed.pathname.match(LEGACY_MEDIA_PATH)
  if (!match) return url
  const owner = sanitizeUserId(ownerUserId)
  if (!owner || !isSafeFilename(match[2])) return url
  parsed.pathname = `/media/${match[1]}/users/${owner}/${match[2]}`
  parsed.search = ''
  return parsed.toString()
}

export function legacyMediaPathnameFromUrl(
  url: string,
): { kind: 'sources' | 'renders'; filename: string } | null {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return null
  }
  const match = parsed.pathname.match(LEGACY_MEDIA_PATH)
  if (!match) return null
  if (!isSafeFilename(match[2])) return null
  return { kind: match[1] as 'sources' | 'renders', filename: match[2] }
}
