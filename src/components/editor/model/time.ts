import type { Clip } from './editor-types'

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function durationInFramesFor(clips: Clip[], fps: number) {
  if (clips.length === 0) return fps * 10

  return Math.max(
    1,
    ...clips.map((clip) => clip.startFrame + clip.durationInFrames),
  )
}
