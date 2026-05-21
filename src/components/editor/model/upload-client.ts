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

export type ListedSource = {
  url: string
  pathname: string
  name: string
  size: number
  uploadedAt: number
  contentType?: string
}

/**
 * Lists previously uploaded source media. Hits the same /api/sources endpoint
 * on Vercel and selfhost — both gate it behind the shared secret.
 */
export async function listSources(): Promise<ListedSource[]> {
  if (!RENDERING_AVAILABLE) {
    throw new Error(RENDERING_DISABLED_MESSAGE)
  }
  if (!SHARED_SECRET) {
    throw new Error(
      'VITE_RENDER_SHARED_SECRET is not set — cannot list source media.',
    )
  }
  const res = await fetch('/api/sources', {
    headers: { 'x-render-secret': SHARED_SECRET },
  })
  if (!res.ok) {
    throw new Error(`Failed to list sources (${res.status})`)
  }
  const json = (await res.json()) as { sources: ListedSource[] }
  return json.sources
}

/**
 * Deletes a previously uploaded source. Both deploys accept `pathname`; the
 * Vercel handler additionally prefers `url` since @vercel/blob.del expects the
 * full blob URL.
 */
export async function deleteSource(source: {
  url: string
  pathname: string
}): Promise<void> {
  if (!RENDERING_AVAILABLE) {
    throw new Error(RENDERING_DISABLED_MESSAGE)
  }
  if (!SHARED_SECRET) {
    throw new Error(
      'VITE_RENDER_SHARED_SECRET is not set — cannot delete source media.',
    )
  }
  const res = await fetch('/api/sources', {
    method: 'DELETE',
    headers: {
      'x-render-secret': SHARED_SECRET,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ url: source.url, pathname: source.pathname }),
  })
  if (!res.ok) {
    throw new Error(`Failed to delete source (${res.status})`)
  }
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
