import { useEffect, useMemo, useRef, useState } from 'react'
import { getAudioData, getWaveformPortion, type MediaUtilsAudioData } from '@remotion/media-utils'

const audioDataCache = new Map<string, Promise<MediaUtilsAudioData>>()

function loadAudioData(src: string): Promise<MediaUtilsAudioData> {
  const cached = audioDataCache.get(src)
  if (cached) return cached
  const promise = getAudioData(src)
  audioDataCache.set(src, promise)
  promise.catch(() => audioDataCache.delete(src))
  return promise
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
  const [audioData, setAudioData] = useState<MediaUtilsAudioData | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    let cancelled = false
    setAudioData(null)
    loadAudioData(src)
      .then((data) => {
        if (!cancelled) setAudioData(data)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [src])

  const bucketCount = Math.max(1, Math.floor(width))

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
    ctx.fillStyle = color
    const mid = height / 2
    for (const bar of peaks) {
      const h = Math.max(1, bar.amplitude * height)
      ctx.fillRect(bar.index, mid - h / 2, 1, h)
    }
  }, [peaks, width, height, color])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0"
      style={{ width, height }}
    />
  )
}
