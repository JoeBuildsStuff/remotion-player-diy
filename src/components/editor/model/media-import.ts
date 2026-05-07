import { IMAGE_DEFAULT_SECONDS } from './editor-constants'
import type { ClipType } from './editor-types'

export type MediaMetadata = {
  durationInSeconds: number
  width: number | null
  height: number | null
}

export type ImportedMedia = {
  file: File
  type: ClipType
  src: string
  metadata: MediaMetadata
}

function fileTypeOf(file: File): ClipType | null {
  if (file.type.startsWith('video/')) return 'video'
  if (file.type.startsWith('audio/')) return 'audio'
  if (file.type.startsWith('image/')) return 'image'
  return null
}

function probeMediaMetadata(
  src: string,
  type: ClipType,
): Promise<MediaMetadata> {
  if (type === 'image') {
    return new Promise((resolve) => {
      const img = new Image()
      img.src = src
      img.onload = () => {
        resolve({
          durationInSeconds: IMAGE_DEFAULT_SECONDS,
          width: img.naturalWidth || null,
          height: img.naturalHeight || null,
        })
      }
      img.onerror = () => {
        resolve({
          durationInSeconds: IMAGE_DEFAULT_SECONDS,
          width: null,
          height: null,
        })
      }
    })
  }

  return new Promise((resolve) => {
    const el = document.createElement(type) as HTMLMediaElement
    el.preload = 'metadata'
    el.src = src
    el.onloadedmetadata = () => {
      const d = Number.isFinite(el.duration) && el.duration > 0 ? el.duration : 5
      resolve({
        durationInSeconds: d,
        width:
          type === 'video' && el instanceof HTMLVideoElement
            ? el.videoWidth || null
            : null,
        height:
          type === 'video' && el instanceof HTMLVideoElement
            ? el.videoHeight || null
            : null,
      })
    }
    el.onerror = () => {
      resolve({
        durationInSeconds: 5,
        width: null,
        height: null,
      })
    }
  })
}

export async function importMediaFiles(
  files: FileList | File[],
): Promise<ImportedMedia[]> {
  const imports: ImportedMedia[] = []

  for (const file of Array.from(files)) {
    const type = fileTypeOf(file)
    if (!type) continue

    const src = URL.createObjectURL(file)
    imports.push({
      file,
      type,
      src,
      metadata: await probeMediaMetadata(src, type),
    })
  }

  return imports
}
