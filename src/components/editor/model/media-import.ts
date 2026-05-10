import { IMAGE_DEFAULT_SECONDS } from './editor-constants'
import type { ClipType } from './editor-types'

export type MediaMetadata = {
  durationInSeconds: number
  width: number | null
  height: number | null
  fps: number | null
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
  file: File,
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
          fps: null,
        })
      }
      img.onerror = () => {
        resolve({
          durationInSeconds: IMAGE_DEFAULT_SECONDS,
          width: null,
          height: null,
          fps: null,
        })
      }
    })
  }

  return probeAudioVideoMetadata(file, type).catch(() =>
    probeAudioVideoMetadataWithElement(src, type),
  )
}

async function probeAudioVideoMetadata(
  file: File,
  type: ClipType,
): Promise<MediaMetadata> {
  const { ALL_FORMATS, BlobSource, Input } = await import('mediabunny')
  const input = new Input({
    formats: ALL_FORMATS,
    source: new BlobSource(file),
  })

  try {
    const videoTrack =
      type === 'video' ? await input.getPrimaryVideoTrack() : null
    const [durationInSeconds, dimensions, packetStats] = await Promise.all([
      input.computeDuration(),
      videoTrack
        ? Promise.all([
            videoTrack.getDisplayWidth(),
            videoTrack.getDisplayHeight(),
          ]).then(([width, height]) => ({
            width: width || null,
            height: height || null,
          }))
        : Promise.resolve({ width: null, height: null }),
      videoTrack ? videoTrack.computePacketStats(50) : Promise.resolve(null),
    ])

    return {
      durationInSeconds: validDuration(durationInSeconds),
      width: dimensions.width,
      height: dimensions.height,
      fps: packetStats?.averagePacketRate ?? null,
    }
  } finally {
    input.dispose()
  }
}

function probeAudioVideoMetadataWithElement(
  src: string,
  type: ClipType,
): Promise<MediaMetadata> {
  return new Promise((resolve) => {
    const el = document.createElement(type) as HTMLMediaElement
    el.preload = 'metadata'
    el.src = src
    el.onloadedmetadata = () => {
      resolve({
        durationInSeconds: validDuration(el.duration),
        width:
          type === 'video' && el instanceof HTMLVideoElement
            ? el.videoWidth || null
            : null,
        height:
          type === 'video' && el instanceof HTMLVideoElement
            ? el.videoHeight || null
            : null,
        fps: null,
      })
    }
    el.onerror = () => {
      resolve({
        durationInSeconds: 5,
        width: null,
        height: null,
        fps: null,
      })
    }
  })
}

function validDuration(durationInSeconds: number) {
  return Number.isFinite(durationInSeconds) && durationInSeconds > 0
    ? durationInSeconds
    : 5
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
      metadata: await probeMediaMetadata(src, file, type),
    })
  }

  return imports
}
