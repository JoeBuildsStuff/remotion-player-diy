// HMAC-signed URL helper for the local storage adapter.
//
// When MEDIA_URL_SIGNING_SECRET is set, /api/upload and /api/render return
// URLs of the form
//     /media/sources/<file>?exp=<unix-seconds>&sig=<hex>
// and /media/* refuses access without a valid, non-expired signature.
//
// Threat model: makes UUIDs alone not enough — an attacker who learns the
// pathname still can't fetch the file. Expiry is wall-clock based; clock
// drift between server and client doesn't matter because only the server
// verifies.

import { createHmac, timingSafeEqual } from 'node:crypto'

export function signPathname(
  pathname: string,
  expiresAt: number,
  secret: string,
): string {
  const sig = hmac(`${pathname}:${expiresAt}`, secret)
  return `exp=${expiresAt}&sig=${sig}`
}

export function verifySignature(
  pathname: string,
  exp: string | null,
  sig: string | null,
  secret: string,
): boolean {
  if (!exp || !sig) return false
  const expNum = Number(exp)
  if (!Number.isFinite(expNum)) return false
  if (Date.now() / 1000 > expNum) return false
  const expected = hmac(`${pathname}:${expNum}`, secret)
  // Length-mismatch comparison would throw; guard first.
  if (expected.length !== sig.length) return false
  return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(sig, 'hex'))
}

function hmac(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('hex')
}
