import type { VideoSample } from 'mediabunny'
import { useEffect, useMemo, useState } from 'react'

import type { Clip } from '../model/editor-types'
import { useIsTimelineInteracting } from './timeline-interaction'

const THUMBNAIL_WIDTH = 56
const MAX_THUMBNAILS = 80
const THUMBNAIL_HEIGHT = 28
const THUMBNAIL_COUNT_STEP = 4
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

function canvasToObjectUrl(canvas: HTMLCanvasElement) {
  return new Promise<string | null>((resolve) => {
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

function drawVideoSample(sample: VideoSample): Promise<string | null> {
  const canvas = document.createElement('canvas')
  canvas.width = THUMBNAIL_WIDTH * 2
  canvas.height = THUMBNAIL_HEIGHT * 2

  const ctx = canvas.getContext('2d')
  if (!ctx) return Promise.resolve(null)

  const sourceWidth = sample.displayWidth || canvas.width
  const sourceHeight = sample.displayHeight || canvas.height
  const scale = Math.max(
    canvas.width / sourceWidth,
    canvas.height / sourceHeight,
  )
  const width = sourceWidth * scale
  const height = sourceHeight * scale
  const x = (canvas.width - width) / 2
  const y = (canvas.height - height) / 2

  sample.draw(ctx, x, y, width, height)

  return canvasToObjectUrl(canvas)
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
): Promise<VideoStill[]> {
  const stills: VideoStill[] = []
  const fallbackDurationInSeconds = Math.max(
    0,
    request.sourceDurationInFrames / request.fps,
  )
  if (signal.aborted) throw abortError()

  const { ALL_FORMATS, Input, UrlSource, VideoSampleSink } =
    await import('mediabunny')
  const input = new Input({
    formats: ALL_FORMATS,
    source: new UrlSource(request.src),
  })

  try {
    const [durationInSeconds, videoTrack] = await Promise.all([
      input.computeDuration().catch(() => fallbackDurationInSeconds),
      input.getPrimaryVideoTrack(),
    ])
    if (!videoTrack) {
      throw new Error('No video track found in the input')
    }
    if (signal.aborted) throw abortError()

    const canDecode = await videoTrack.canDecode()
    if (!canDecode) {
      throw new Error('This video track cannot be decoded by this browser')
    }

    const maxTime = Math.max(
      0,
      (Number.isFinite(durationInSeconds)
        ? durationInSeconds
        : fallbackDurationInSeconds) - 0.05,
    )
    const timestamps = Array.from({ length: request.count }, (_, index) => {
      const frame = sourceFrameAt(request, index)
      return Math.min(maxTime, Math.max(0, frame / request.fps))
    })

    const sink = new VideoSampleSink(videoTrack)
    for await (const sample of sink.samplesAtTimestamps(timestamps)) {
      if (signal.aborted) {
        sample?.close()
        throw abortError()
      }
      if (!sample) continue

      let src: string | null = null
      const timeInSeconds = sample.timestamp
      try {
        src = await drawVideoSample(sample)
      } finally {
        sample.close()
      }

      if (signal.aborted) {
        if (src) URL.revokeObjectURL(src)
        throw abortError()
      }

      if (src) stills.push({ src, timeInSeconds })
    }

    return stills
  } catch (error) {
    revokeStills(stills)
    throw error
  } finally {
    input.dispose()
  }
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
