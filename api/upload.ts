import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'

// Vercel auto-detects /api/*.ts and runs them as Node serverless functions.
// This endpoint hands out short-lived tokens so the browser can upload
// directly to Vercel Blob without streaming through our function.

const SHARED_SECRET = process.env.RENDER_SHARED_SECRET

function unauthorized() {
  return new Response('Unauthorized', { status: 401 })
}

export async function POST(request: Request): Promise<Response> {
  if (!SHARED_SECRET) {
    return new Response('Server misconfigured: RENDER_SHARED_SECRET not set', {
      status: 500,
    })
  }

  if (request.headers.get('x-render-secret') !== SHARED_SECRET) {
    return unauthorized()
  }

  const body = (await request.json()) as HandleUploadBody

  try {
    const json = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        // Whitelist what kinds of files are allowed.
        return {
          allowedContentTypes: [
            'video/*',
            'audio/*',
            'image/*',
          ],
          // Source media uploaded by the editor goes under sources/.
          // Render output goes under renders/ (written from the Sandbox, not here).
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ pathname }),
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
