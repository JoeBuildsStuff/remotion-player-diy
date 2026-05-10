import { useEffect, useMemo, useRef, useState } from 'react'
import { getAudioData, getWaveformPortion, type MediaUtilsAudioData } from '@remotion/media-utils'

const audioDataCache = new Map<string, Promise<MediaUtilsAudioData>>()
const WAVEFORM_BAR_WIDTH = 1
const WAVEFORM_BAR_GAP = 2
const WAVEFORM_BAR_RADIUS = 2
const WAVEFORM_BAR_HEIGHT_SCALE = 1.2
const CSS_VAR_PATTERN = /^var\((--[^,\s)]+)(?:,\s*([^)]+))?\)$/

function loadAudioData(src: string): Promise<MediaUtilsAudioData> {
  const cached = audioDataCache.get(src)
  if (cached) return cached
  const promise = getAudioData(src)
  audioDataCache.set(src, promise)
  promise.catch(() => audioDataCache.delete(src))
  return promise
}

function resolveCanvasColor(color: string) {
  const match = color.match(CSS_VAR_PATTERN)
  if (!match) return color

  return (
    getComputedStyle(document.documentElement)
      .getPropertyValue(match[1])
      .trim() ||
    match[2]?.trim() ||
    color
  )
}

export function AudioWaveform({
  src,
  width,
  height,
  color = '#22c55e',
}: {
  src: string
  width: number
  height: number
  color?: string
}) {
  const [audioDataState, setAudioDataState] = useState<{
    src: string
    data: MediaUtilsAudioData
  } | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    let cancelled = false
    loadAudioData(src)
      .then((data) => {
        if (!cancelled) setAudioDataState({ src, data })
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [src])

  const barStep = WAVEFORM_BAR_WIDTH + WAVEFORM_BAR_GAP
  const bucketCount = Math.max(1, Math.ceil(width / barStep))
  const audioData =
    audioDataState?.src === src ? audioDataState.data : null

  const peaks = useMemo(() => {
    if (!audioData) return null
    return getWaveformPortion({
      audioData,
      startTimeInSeconds: 0,
      durationInSeconds: audioData.durationInSeconds,
      numberOfSamples: bucketCount,
      outputRange: 'zero-to-one',
      normalize: true,
    })
  }, [audioData, bucketCount])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    canvas.width = Math.max(1, Math.floor(width * dpr))
    canvas.height = Math.max(1, Math.floor(height * dpr))
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, width, height)
    if (!peaks) return
    ctx.fillStyle = resolveCanvasColor(color)
    const mid = height / 2
    for (const bar of peaks) {
      const h = Math.min(height, Math.max(1, bar.amplitude * height * WAVEFORM_BAR_HEIGHT_SCALE))
      const x = bar.index * barStep
      ctx.beginPath()
      ctx.roundRect(
        x,
        mid - h / 2,
        WAVEFORM_BAR_WIDTH,
        h,
        Math.min(WAVEFORM_BAR_RADIUS, WAVEFORM_BAR_WIDTH / 2, h / 2),
      )
      ctx.fill()
    }
  }, [peaks, width, height, color, barStep])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0"
      style={{ width, height }}
    />
  )
}
