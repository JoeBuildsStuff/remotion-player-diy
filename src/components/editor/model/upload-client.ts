import { upload } from '@vercel/blob/client'

import {
  DEPLOY_MODE,
  RENDERING_AVAILABLE,
  RENDERING_DISABLED_MESSAGE,
} from '@/components/editor/model/render-mode'

// DEPLOY_MODE controls *how* uploads are sent:
//   'vercel'   → @vercel/blob/client (token + direct PUT).
//   'selfhost' → single multipart POST to /api/upload, server writes the
//                file to its DATA_DIR/sources and returns { url, pathname }.

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
 * Uploads a File and returns its public URL.
 *
 * On Vercel: token from /api/upload, then direct PUT to Vercel Blob.
 * Self-hosted: single multipart POST to /api/upload; the server stores the
 * file under DATA_DIR/sources/ and returns the public URL it serves it from.
 */
export async function uploadSourceFile(
  file: File,
  options?: { onProgress?: (progress: UploadProgress) => void },
): Promise<UploadResult> {
  if (!RENDERING_AVAILABLE) {
    throw new Error(RENDERING_DISABLED_MESSAGE)
  }
  if (!SHARED_SECRET) {
    throw new Error(
      'VITE_RENDER_SHARED_SECRET is not set — cannot upload source media.',
    )
  }

  if (DEPLOY_MODE === 'selfhost') {
    return uploadViaSelfhost(file, SHARED_SECRET, options)
  }
  return uploadViaVercelBlob(file, SHARED_SECRET, options)
}

async function uploadViaVercelBlob(
  file: File,
  secret: string,
  options?: { onProgress?: (progress: UploadProgress) => void },
): Promise<UploadResult> {
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
    headers: {
      'x-render-secret': secret,
    },
  })

  return { url: result.url, pathname: result.pathname }
}

function uploadViaSelfhost(
  file: File,
  secret: string,
  options?: { onProgress?: (progress: UploadProgress) => void },
): Promise<UploadResult> {
  // XHR rather than fetch because fetch lacks an upload-progress hook.
  return new Promise((resolve, reject) => {
    const form = new FormData()
    form.append('file', file, file.name)

    const xhr = new XMLHttpRequest()
    xhr.open('POST', '/api/upload')
    xhr.setRequestHeader('x-render-secret', secret)

    if (options?.onProgress) {
      xhr.upload.addEventListener('progress', (event) => {
        if (!event.lengthComputable) return
        options.onProgress!({
          loaded: event.loaded,
          total: event.total,
          percentage: event.total === 0 ? 0 : (event.loaded / event.total) * 100,
        })
      })
    }

    xhr.addEventListener('error', () => reject(new Error('Upload failed')))
    xhr.addEventListener('abort', () => reject(new Error('Upload aborted')))
    xhr.addEventListener('load', () => {
      if (xhr.status < 200 || xhr.status >= 300) {
        reject(
          new Error(
            `Upload failed (${xhr.status}) ${xhr.responseText || xhr.statusText}`,
          ),
        )
        return
      }
      try {
        const json = JSON.parse(xhr.responseText) as UploadResult
        resolve({ url: json.url, pathname: json.pathname })
      } catch (err) {
        reject(
          new Error(
            err instanceof Error ? err.message : 'Invalid upload response',
          ),
        )
      }
    })

    xhr.send(form)
  })
}
