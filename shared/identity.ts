// Request identity for per-user content isolation.
//
// The shared secret proves "this client may call the editor APIs". It is
// baked into the browser bundle, so it is not a tenant. Tenant identity is:
//
//   1. X-User-Id from a trusted reverse proxy (Traefik / SupaGate), when
//      TRUST_PROXY_USER_ID=true. Never taken from the request body or query.
//   2. Explicit SINGLE_TENANT=true for local-only / single-operator deploys
//      that have no proxy identity. Uses SINGLE_TENANT_USER_ID or "local".
//
// If neither is available, mutating and listing APIs return 401.

export const USER_ID_PATTERN = /^[A-Za-z0-9._-]{1,128}$/

export type IdentityEnv = {
  SINGLE_TENANT?: string
  SINGLE_TENANT_USER_ID?: string
  TRUST_PROXY_USER_ID?: string
  DEFAULT_OWNER_USER_ID?: string
}

export type ResolvedUser =
  | { ok: true; userId: string; source: 'header' | 'single-tenant' }
  | { ok: false; status: 401; message: string }

export function sanitizeUserId(raw: string | null | undefined): string | null {
  if (raw == null) return null
  const trimmed = raw.trim()
  if (!USER_ID_PATTERN.test(trimmed)) return null
  if (trimmed.includes('..')) return null
  return trimmed
}

export function envFlag(value: string | undefined): boolean {
  if (value == null) return false
  const v = value.trim().toLowerCase()
  return v === 'true' || v === '1' || v === 'yes'
}

export function isSingleTenantMode(env: IdentityEnv = process.env): boolean {
  return envFlag(env.SINGLE_TENANT)
}

export function isTrustProxyUserId(env: IdentityEnv = process.env): boolean {
  return envFlag(env.TRUST_PROXY_USER_ID)
}

export function singleTenantUserId(env: IdentityEnv = process.env): string {
  return sanitizeUserId(env.SINGLE_TENANT_USER_ID) ?? 'local'
}

export function defaultOwnerUserId(env: IdentityEnv = process.env): string | null {
  return sanitizeUserId(env.DEFAULT_OWNER_USER_ID)
}

/**
 * User id that unscoped legacy objects are assigned to during migration.
 * Prefers DEFAULT_OWNER_USER_ID; in single-tenant mode falls back to that
 * tenant id so local deploys migrate without extra env.
 */
export function migrationOwnerUserId(
  env: IdentityEnv = process.env,
): string | null {
  return defaultOwnerUserId(env) ?? (isSingleTenantMode(env) ? singleTenantUserId(env) : null)
}

export function resolveRequestUserId(
  headers: Headers,
  env: IdentityEnv = process.env,
): ResolvedUser {
  if (isTrustProxyUserId(env)) {
    const fromHeader = sanitizeUserId(headers.get('x-user-id'))
    if (fromHeader) {
      return { ok: true, userId: fromHeader, source: 'header' }
    }
  }

  if (isSingleTenantMode(env)) {
    return {
      ok: true,
      userId: singleTenantUserId(env),
      source: 'single-tenant',
    }
  }

  return {
    ok: false,
    status: 401,
    message:
      'Unauthorized: missing user identity. Set TRUST_PROXY_USER_ID=true behind a proxy that sends X-User-Id, or SINGLE_TENANT=true for a single-operator deploy.',
  }
}

export function userResponse(resolved: Extract<ResolvedUser, { ok: false }>): Response {
  return new Response(resolved.message, { status: resolved.status })
}
