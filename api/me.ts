import { requireCloudUser } from './_identity.js'

export async function GET(request: Request): Promise<Response> {
  const auth = requireCloudUser(request)
  if (auth instanceof Response) return auth
  return Response.json({ userId: auth.userId })
}
