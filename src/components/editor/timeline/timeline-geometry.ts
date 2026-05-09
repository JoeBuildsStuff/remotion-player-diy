import type { Clip } from '../model/editor-types'
import { clamp } from '../model/time'

export const BASE_PX_PER_SECOND = 60
export const RULER_HEIGHT = 24
export const TRACK_HEIGHT = 40
export const CLIP_VERTICAL_INSET = 4
export const VIDEO_CLIP_VERTICAL_INSET = 2
export const COMPACT_CLIP_HEIGHT = 26
export const MIN_CLIP_FRAMES = 1

const TIMELINE_CLIP_ID_PREFIX = 'item-'
const TIMELINE_TRACK_ID_PREFIX = 'container-'

export type TimelineDrag = {
  type: 'resize'
  side: 'start' | 'end'
  clipId: string
  pointerId: number
  startX: number
  startFrame: number
  startDurationInFrames: number
  startTrimBeforeFrames: number
  startTrimAfterFrames: number | null
  sourceDurationInFrames: number
}

export type TimelineTrackModel = {
  index: number
}

export type ActiveTimelineDrag = {
  clipId: string
  startFrame: number
  startTrackIndex: number
  tracks: TimelineTrackModel[]
}

export function clipSourceEnd(
  clip: Pick<Clip, 'sourceDurationInFrames' | 'trimAfterFrames'>,
) {
  return clip.trimAfterFrames ?? clip.sourceDurationInFrames
}

export function timelineClipDndId(clipId: string) {
  return `${TIMELINE_CLIP_ID_PREFIX}${clipId}`
}

export function timelineTrackDndId(trackIndex: number) {
  return `${TIMELINE_TRACK_ID_PREFIX}${trackIndex}`
}

export function clipIdFromDndId(id: string) {
  return id.startsWith(TIMELINE_CLIP_ID_PREFIX)
    ? id.slice(TIMELINE_CLIP_ID_PREFIX.length)
    : null
}

export function trackIndexFromDndId(id: string) {
  if (!id.startsWith(TIMELINE_TRACK_ID_PREFIX)) return null

  const index = Number(id.slice(TIMELINE_TRACK_ID_PREFIX.length))
  return Number.isFinite(index) ? index : null
}

export function timelineTracksFor(
  clips: Clip[],
  activeTrackIndexes: number[] = [],
): TimelineTrackModel[] {
  if (clips.length === 0 && activeTrackIndexes.length === 0) {
    return [{ index: 0 }]
  }

  const trackIndexes = new Set([
    ...clips.map((clip) => clip.trackIndex),
    ...activeTrackIndexes,
  ])

  return Array.from(trackIndexes)
    .sort((a, b) => b - a)
    .map((index) => ({ index }))
}

export function dragTrackIndexesFor(tracks: TimelineTrackModel[]) {
  if (tracks.length === 0) return [0]

  return [
    tracks[0].index + 1,
    ...tracks.map((track) => track.index),
    tracks[tracks.length - 1].index - 1,
  ]
}

export function trackIndexFromRowDelta(
  tracks: TimelineTrackModel[],
  startTrackIndex: number,
  deltaY: number,
) {
  if (tracks.length === 0) return startTrackIndex

  const startRow = tracks.findIndex((track) => track.index === startTrackIndex)
  if (startRow === -1) return startTrackIndex

  const row = startRow + Math.round(deltaY / TRACK_HEIGHT)
  if (row < 0) return tracks[0].index + Math.abs(row)
  if (row >= tracks.length) {
    return tracks[tracks.length - 1].index - (row - tracks.length + 1)
  }

  return tracks[row].index
}

export function translateStyle(transform: { x: number; y: number } | null) {
  if (!transform) return undefined

  return `translate3d(${transform.x}px, ${transform.y}px, 0)`
}

export function patchResizeStart(
  drag: TimelineDrag,
  deltaFrames: number,
): Partial<Clip> {
  const sourceEnd = drag.startTrimAfterFrames ?? drag.sourceDurationInFrames
  const maxTrimBefore = Math.max(0, sourceEnd - MIN_CLIP_FRAMES)
  const minDelta = Math.max(-drag.startFrame, -drag.startTrimBeforeFrames)
  const maxDelta = Math.min(
    drag.startDurationInFrames - MIN_CLIP_FRAMES,
    maxTrimBefore - drag.startTrimBeforeFrames,
  )
  const boundedDelta = clamp(deltaFrames, minDelta, maxDelta)

  return {
    startFrame: drag.startFrame + boundedDelta,
    durationInFrames: drag.startDurationInFrames - boundedDelta,
    trimBeforeFrames: drag.startTrimBeforeFrames + boundedDelta,
  }
}

export function patchResizeEnd(
  drag: TimelineDrag,
  deltaFrames: number,
): Partial<Clip> {
  const maxDuration = Math.max(
    MIN_CLIP_FRAMES,
    drag.sourceDurationInFrames - drag.startTrimBeforeFrames,
  )
  const nextDuration = clamp(
    drag.startDurationInFrames + deltaFrames,
    MIN_CLIP_FRAMES,
    maxDuration,
  )
  const nextSourceEnd = drag.startTrimBeforeFrames + nextDuration

  return {
    durationInFrames: nextDuration,
    trimAfterFrames:
      nextSourceEnd >= drag.sourceDurationInFrames ? null : nextSourceEnd,
  }
}
