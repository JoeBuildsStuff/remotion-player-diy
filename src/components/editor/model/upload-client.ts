import { upload } from '@vercel/blob/client'

const SHARED_SECRET = import.meta.env.VITE_RENDER_SHARED_SECRET as
  | string
  | undefined

export type UploadProgress = {
  loaded: number
  total: number
  percentage: number
}

export type UploadResult = {
  url: string
  pathname: string
}

/**
 * Uploads a File directly to Vercel Blob using a token issued by /api/upload.
 *
 * Returns the public https:// URL of the uploaded asset on success. Throws on
 * failure — callers are expected to surface the error in editor state.
 */
export async function uploadSourceFile(
  file: File,
  options?: { onProgress?: (progress: UploadProgress) => void },
): Promise<UploadResult> {
  if (!SHARED_SECRET) {
    throw new Error(
      'VITE_RENDER_SHARED_SECRET is not set — cannot upload to Vercel Blob.',
    )
  }

  // Pathname under the Blob store. addRandomSuffix on the server prevents
  // collisions, so we don't need to slugify aggressively here.
  const pathname = `sources/${file.name}`

  const result = await upload(pathname, file, {
    access: 'public',
    handleUploadUrl: '/api/upload',
    // multipart=true splits big files into parallel chunks with retries —
    // matters for video. The SDK falls back to single-shot for small files.
    multipart: true,
    onUploadProgress: options?.onProgress,
    // Inject our shared-secret on the token-fetch request to /api/upload.
    headers: {
      'x-render-secret': SHARED_SECRET,
    },
  })

  return { url: result.url, pathname: result.pathname }
}
