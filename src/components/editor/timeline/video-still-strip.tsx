import { useEffect, useMemo, useState } from 'react'

import type { Clip } from '../model/editor-types'
import { useIsTimelineInteracting } from './timeline-interaction'

const THUMBNAIL_WIDTH = 56
const MAX_THUMBNAILS = 80
const THUMBNAIL_HEIGHT = 28
const THUMBNAIL_COUNT_STEP = 4
const SEEK_TIMEOUT_MS = 3000
const GENERATION_DEBOUNCE_MS = 120
const STILL_CACHE_MAX_ENTRIES = 24

type VideoStill = {
  src: string
  timeInSeconds: number
}

type StillCacheEntry = {
  promise: Promise<VideoStill[]>
  stills: VideoStill[] | null
}

function revokeStills(stills: VideoStill[] | null) {
  if (!stills) return
  for (const still of stills) {
    URL.revokeObjectURL(still.src)
  }
}

class StillStripCache {
  private map = new Map<string, StillCacheEntry>()
  private readonly max: number

  constructor(max: number) {
    this.max = max
  }

  get(key: string): StillCacheEntry | undefined {
    const entry = this.map.get(key)
    if (!entry) return undefined
    this.map.delete(key)
    this.map.set(key, entry)
    return entry
  }

  set(key: string, entry: StillCacheEntry) {
    if (this.map.has(key)) {
      this.map.delete(key)
    } else if (this.map.size >= this.max) {
      const oldestKey = this.map.keys().next().value
      if (oldestKey !== undefined) {
        const oldest = this.map.get(oldestKey)
        this.map.delete(oldestKey)
        revokeStills(oldest?.stills ?? null)
      }
    }
    this.map.set(key, entry)
  }

  delete(key: string) {
    const entry = this.map.get(key)
    if (!entry) return
    this.map.delete(key)
    revokeStills(entry.stills)
  }
}

const stillStripCache = new StillStripCache(STILL_CACHE_MAX_ENTRIES)

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

function drawVideoFrame(video: HTMLVideoElement): Promise<string | null> {
  const canvas = document.createElement('canvas')
  canvas.width = THUMBNAIL_WIDTH * 2
  canvas.height = THUMBNAIL_HEIGHT * 2

  const ctx = canvas.getContext('2d')
  if (!ctx) return Promise.resolve(null)

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

  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          resolve(null)
          return
        }
        resolve(URL.createObjectURL(blob))
      },
      'image/jpeg',
      0.72,
    )
  })
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

const SOURCE_POOL_IDLE_TEARDOWN_MS = 5000

type StillsJob = {
  request: VideoStillRequest
  signal: AbortSignal
  resolve: (stills: VideoStill[]) => void
  reject: (error: unknown) => void
}

type SourcePool = {
  src: string
  video: HTMLVideoElement | null
  queue: StillsJob[]
  busy: boolean
  idleTimer: number | null
}

const sourcePools = new Map<string, SourcePool>()

function cancelPoolTeardown(pool: SourcePool) {
  if (pool.idleTimer != null) {
    window.clearTimeout(pool.idleTimer)
    pool.idleTimer = null
  }
}

function getOrCreatePool(src: string): SourcePool {
  let pool = sourcePools.get(src)
  if (!pool) {
    pool = { src, video: null, queue: [], busy: false, idleTimer: null }
    sourcePools.set(src, pool)
  }
  cancelPoolTeardown(pool)
  return pool
}

function teardownPool(pool: SourcePool) {
  if (pool.video) {
    pool.video.removeAttribute('src')
    pool.video.load()
    pool.video = null
  }
  if (pool.queue.length === 0 && !pool.busy) {
    sourcePools.delete(pool.src)
  }
}

function schedulePoolTeardown(pool: SourcePool) {
  cancelPoolTeardown(pool)
  pool.idleTimer = window.setTimeout(() => {
    pool.idleTimer = null
    if (pool.busy || pool.queue.length > 0) return
    teardownPool(pool)
  }, SOURCE_POOL_IDLE_TEARDOWN_MS)
}

function ensurePoolVideo(pool: SourcePool): HTMLVideoElement {
  if (pool.video) return pool.video
  const video = document.createElement('video')
  video.preload = 'metadata'
  video.muted = true
  video.playsInline = true
  video.crossOrigin = 'anonymous'
  video.src = pool.src
  pool.video = video
  return video
}

async function runJob(pool: SourcePool, job: StillsJob) {
  const stills: VideoStill[] = []
  try {
    if (job.signal.aborted) throw abortError()
    const video = ensurePoolVideo(pool)
    await waitForMetadata(video, job.signal)

    const maxTime = Number.isFinite(video.duration)
      ? Math.max(0, video.duration - 0.05)
      : Math.max(0, job.request.sourceDurationInFrames / job.request.fps)

    for (let index = 0; index < job.request.count; index += 1) {
      if (job.signal.aborted) throw abortError()

      const frame = sourceFrameAt(job.request, index)
      const timeInSeconds = Math.min(
        maxTime,
        Math.max(0, frame / job.request.fps),
      )
      await seekTo(video, timeInSeconds, job.signal)
      const src = await drawVideoFrame(video)
      if (job.signal.aborted) {
        if (src) URL.revokeObjectURL(src)
        throw abortError()
      }
      if (src) stills.push({ src, timeInSeconds })
    }

    job.resolve(stills)
  } catch (error) {
    revokeStills(stills)
    job.reject(error)
  }
}

async function drainPool(pool: SourcePool) {
  if (pool.busy) return
  pool.busy = true
  cancelPoolTeardown(pool)
  try {
    while (pool.queue.length > 0) {
      const job = pool.queue.shift()
      if (!job) break
      if (job.signal.aborted) {
        job.reject(abortError())
        continue
      }
      await runJob(pool, job)
    }
  } finally {
    pool.busy = false
    if (pool.queue.length === 0) schedulePoolTeardown(pool)
  }
}

function generateVideoStills(
  request: VideoStillRequest,
  signal: AbortSignal,
): Promise<VideoStill[]> {
  return new Promise((resolve, reject) => {
    const pool = getOrCreatePool(request.src)
    pool.queue.push({ request, signal, resolve, reject })
    void drainPool(pool)
  })
}

function loadVideoStills(
  request: VideoStillRequest,
  cacheKey: string,
  signal: AbortSignal,
) {
  const cached = stillStripCache.get(cacheKey)
  if (cached) return cached.promise

  const entry: StillCacheEntry = {
    promise: Promise.resolve([]),
    stills: null,
  }
  entry.promise = generateVideoStills(request, signal).then(
    (stills) => {
      entry.stills = stills
      return stills
    },
    (error) => {
      stillStripCache.delete(cacheKey)
      throw error
    },
  )
  stillStripCache.set(cacheKey, entry)
  return entry.promise
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
  const isInteracting = useIsTimelineInteracting()
  const timelinePxPerFrame = width / Math.max(1, clip.durationInFrames)
  const playbackRate = Math.max(0.01, clip.playbackRate)
  const sourceStripWidth = Math.max(
    width,
    (clip.sourceDurationInFrames / playbackRate) * timelinePxPerFrame,
  )
  const sourceStripLeft =
    -(clip.trimBeforeFrames / playbackRate) * timelinePxPerFrame
  const thumbnailCount = useMemo(() => {
    const raw = Math.ceil(sourceStripWidth / THUMBNAIL_WIDTH)
    const stepped = Math.ceil(raw / THUMBNAIL_COUNT_STEP) * THUMBNAIL_COUNT_STEP
    return Math.min(MAX_THUMBNAILS, Math.max(1, stepped))
  }, [sourceStripWidth])
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
    } else if (!isInteracting) {
      timeout = window.setTimeout(load, GENERATION_DEBOUNCE_MS)
    }

    return () => {
      cancelled = true
      if (timeout != null) window.clearTimeout(timeout)
      controller.abort()
    }
  }, [cacheKey, request, isInteracting])

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
