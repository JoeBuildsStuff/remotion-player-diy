import { useEffect, useMemo, useState } from 'react'

import type { Clip } from '../model/editor-types'

const THUMBNAIL_WIDTH = 56
const MAX_THUMBNAILS = 80
const THUMBNAIL_HEIGHT = 28
const SEEK_TIMEOUT_MS = 3000
const GENERATION_DEBOUNCE_MS = 120

type VideoStill = {
  src: string
  timeInSeconds: number
}

const stillStripCache = new Map<string, Promise<VideoStill[]>>()

type VideoStillRequest = {
  src: string
  fps: number
  count: number
  sourceDurationInFrames: number
}

type VideoStillState = {
  cacheKey: string
  stills: VideoStill[]
  isRefreshing: boolean
}

function abortError() {
  return new DOMException('Video still generation was cancelled', 'AbortError')
}

function waitForMetadata(video: HTMLVideoElement, signal: AbortSignal) {
  if (video.readyState >= 1) return Promise.resolve()
  if (signal.aborted) return Promise.reject(abortError())

  return new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      video.removeEventListener('loadedmetadata', handleLoaded)
      video.removeEventListener('error', handleError)
      signal.removeEventListener('abort', handleAbort)
    }
    const handleLoaded = () => {
      cleanup()
      resolve()
    }
    const handleError = () => {
      cleanup()
      reject(new Error('Unable to load video metadata'))
    }
    const handleAbort = () => {
      cleanup()
      reject(abortError())
    }

    video.addEventListener('loadedmetadata', handleLoaded, { once: true })
    video.addEventListener('error', handleError, { once: true })
    signal.addEventListener('abort', handleAbort, { once: true })
  })
}

function seekTo(
  video: HTMLVideoElement,
  timeInSeconds: number,
  signal: AbortSignal,
) {
  if (signal.aborted) return Promise.reject(abortError())
  if (Math.abs(video.currentTime - timeInSeconds) < 0.001 && video.readyState >= 2) {
    return Promise.resolve()
  }

  return new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      window.clearTimeout(timeout)
      video.removeEventListener('loadeddata', handleSeeked)
      video.removeEventListener('seeked', handleSeeked)
      video.removeEventListener('error', handleError)
      signal.removeEventListener('abort', handleAbort)
    }
    const handleSeeked = () => {
      cleanup()
      resolve()
    }
    const handleError = () => {
      cleanup()
      reject(new Error('Unable to seek video'))
    }
    const handleAbort = () => {
      cleanup()
      reject(abortError())
    }
    const timeout = window.setTimeout(() => {
      cleanup()
      reject(new Error('Timed out while seeking video'))
    }, SEEK_TIMEOUT_MS)

    video.addEventListener('loadeddata', handleSeeked, { once: true })
    video.addEventListener('seeked', handleSeeked, { once: true })
    video.addEventListener('error', handleError, { once: true })
    signal.addEventListener('abort', handleAbort, { once: true })
    video.currentTime = timeInSeconds
  })
}

function drawVideoFrame(video: HTMLVideoElement) {
  const canvas = document.createElement('canvas')
  canvas.width = THUMBNAIL_WIDTH * 2
  canvas.height = THUMBNAIL_HEIGHT * 2

  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  const sourceWidth = video.videoWidth || canvas.width
  const sourceHeight = video.videoHeight || canvas.height
  const scale = Math.max(
    canvas.width / sourceWidth,
    canvas.height / sourceHeight,
  )
  const width = sourceWidth * scale
  const height = sourceHeight * scale
  const x = (canvas.width - width) / 2
  const y = (canvas.height - height) / 2

  ctx.drawImage(video, x, y, width, height)
  return canvas.toDataURL('image/jpeg', 0.72)
}

function sourceFrameAt(request: VideoStillRequest, index: number) {
  return Math.min(
    Math.max(0, ((index + 0.5) / request.count) * request.sourceDurationInFrames),
    Math.max(0, request.sourceDurationInFrames - 1),
  )
}

function stillStripCacheKey(request: VideoStillRequest) {
  return [
    request.src,
    request.fps,
    request.count,
    request.sourceDurationInFrames,
  ].join(':')
}

async function generateVideoStills(
  request: VideoStillRequest,
  signal: AbortSignal,
) {
  const video = document.createElement('video')
  video.preload = 'metadata'
  video.muted = true
  video.playsInline = true
  video.crossOrigin = 'anonymous'
  video.src = request.src

  try {
    await waitForMetadata(video, signal)

    const maxTime = Number.isFinite(video.duration)
      ? Math.max(0, video.duration - 0.05)
      : Math.max(0, request.sourceDurationInFrames / request.fps)

    const stills: VideoStill[] = []

    for (let index = 0; index < request.count; index += 1) {
      if (signal.aborted) throw abortError()

      const frame = sourceFrameAt(request, index)
      const timeInSeconds = Math.min(
        maxTime,
        Math.max(0, frame / request.fps),
      )
      await seekTo(video, timeInSeconds, signal)
      const src = drawVideoFrame(video)
      if (src) stills.push({ src, timeInSeconds })
    }

    return stills
  } finally {
    video.removeAttribute('src')
    video.load()
  }
}

function loadVideoStills(
  request: VideoStillRequest,
  cacheKey: string,
  signal: AbortSignal,
) {
  const cached = stillStripCache.get(cacheKey)
  if (cached) return cached

  const promise = generateVideoStills(request, signal)
  stillStripCache.set(cacheKey, promise)
  promise.catch((error) => {
    stillStripCache.delete(cacheKey)
    if (error instanceof DOMException && error.name === 'AbortError') return
  })
  return promise
}

export function VideoStillStrip({
  clip,
  fps,
  width,
}: {
  clip: Clip
  fps: number
  width: number
}) {
  const [state, setState] = useState<VideoStillState | null>(null)
  const timelinePxPerFrame = width / Math.max(1, clip.durationInFrames)
  const playbackRate = Math.max(0.01, clip.playbackRate)
  const sourceStripWidth = Math.max(
    width,
    (clip.sourceDurationInFrames / playbackRate) * timelinePxPerFrame,
  )
  const sourceStripLeft =
    -(clip.trimBeforeFrames / playbackRate) * timelinePxPerFrame
  const thumbnailCount = useMemo(
    () =>
      Math.min(
        MAX_THUMBNAILS,
        Math.max(1, Math.ceil(sourceStripWidth / THUMBNAIL_WIDTH)),
      ),
    [sourceStripWidth],
  )
  const request = useMemo<VideoStillRequest>(
    () => ({
      src: clip.src,
      fps,
      count: thumbnailCount,
      sourceDurationInFrames: clip.sourceDurationInFrames,
    }),
    [
      clip.src,
      clip.sourceDurationInFrames,
      fps,
      thumbnailCount,
    ],
  )
  const cacheKey = useMemo(
    () => stillStripCacheKey(request),
    [request],
  )

  useEffect(() => {
    let cancelled = false
    const controller = new AbortController()
    const cached = stillStripCache.get(cacheKey)
    let timeout: number | null = null

    const load = () => {
      setState((current) =>
        current && current.stills.length > 0
          ? { ...current, isRefreshing: current.cacheKey !== cacheKey }
          : current,
      )
      loadVideoStills(request, cacheKey, controller.signal)
        .then((nextStills) => {
          if (!cancelled) {
            setState({ cacheKey, stills: nextStills, isRefreshing: false })
          }
        })
        .catch((error) => {
          if (controller.signal.aborted) return
          if (error instanceof DOMException && error.name === 'AbortError') return
          if (!cancelled) {
            setState((current) =>
              current && current.stills.length > 0
                ? { ...current, isRefreshing: false }
                : { cacheKey, stills: [], isRefreshing: false },
            )
          }
        })
    }

    if (cached) {
      load()
    } else {
      timeout = window.setTimeout(load, GENERATION_DEBOUNCE_MS)
    }

    return () => {
      cancelled = true
      if (timeout != null) window.clearTimeout(timeout)
      controller.abort()
    }
  }, [cacheKey, request])

  const stills = state?.stills ?? null

  if (!stills || stills.length === 0) {
    return (
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-secondary/60"
      />
    )
  }

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-y-0 flex ${
        state?.isRefreshing ? 'opacity-70' : ''
      }`}
      style={{
        left: sourceStripLeft,
        width: sourceStripWidth,
      }}
    >
      {stills.map((still, index) => (
        <img
          key={`${still.timeInSeconds}-${index}`}
          src={still.src}
          alt=""
          className="h-full min-w-0 flex-1 object-cover"
          draggable={false}
        />
      ))}
    </div>
  )
}
