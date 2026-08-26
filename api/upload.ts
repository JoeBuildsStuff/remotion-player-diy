import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'

import { requireCloudUser } from './_identity.js'
import { parseUserScopedPathname } from '../shared/tenant-path.js'

export async function POST(request: Request): Promise<Response> {
  const auth = requireCloudUser(request)
  if (auth instanceof Response) return auth

  const body = (await request.json()) as HandleUploadBody

  try {
    const json = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        const scoped = parseUserScopedPathname(pathname, 'sources')
        if (!scoped || scoped.userId !== auth.userId) {
          throw new Error('Upload pathname is not owned by the current user')
        }
        return {
          allowedContentTypes: [
            'video/*',
            'audio/*',
            'image/*',
          ],
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ pathname, ownerUserId: auth.userId }),
        }
      },
      onUploadCompleted: async () => {
        // No-op for now — the client already has the URL via the upload result.
      },
    })

    return Response.json(json)
  } catch (err) {
    return new Response(
      err instanceof Error ? err.message : 'Upload token error',
      { status: 400 },
    )
  }
}
