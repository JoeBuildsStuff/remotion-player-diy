import {
  resolveRequestUserId,
  userResponse,
} from '../shared/identity.js'

const SHARED_SECRET = process.env.RENDER_SHARED_SECRET

export function unauthorized() {
  return new Response('Unauthorized', { status: 401 })
}

export function requireCloud(): Response | null {
  if (process.env.CLOUD_RENDER_ENABLED !== 'true') {
    return new Response('Cloud APIs are disabled on this deployment.', {
      status: 403,
    })
  }
  return null
}

export function requireSecret(request: Request): Response | null {
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

export function requireCloudUser(
  request: Request,
): { userId: string } | Response {
  const cloud = requireCloud()
  if (cloud) return cloud
  const secret = requireSecret(request)
  if (secret) return secret
  const identity = resolveRequestUserId(request.headers)
  if (!identity.ok) return userResponse(identity)
  return { userId: identity.userId }
}
