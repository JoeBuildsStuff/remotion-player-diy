import { useMemo, useRef, useState } from 'react'
import { Eye, EyeOff, Volume2, VolumeX } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

import { useEditor } from './editor-context'
import type { Clip } from './types'

const PX_PER_SECOND = 60
const TRACK_HEADER_WIDTH = 122
const RULER_HEIGHT = 24
const TRACK_HEIGHT = 44
const MIN_CLIP_FRAMES = 1

type TimelineDrag =
  | {
      type: 'move'
      clipId: string
      pointerId: number
      startX: number
      startFrame: number
      startTrackIndex: number
    }
  | {
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

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function clipSourceEnd(
  clip: Pick<Clip, 'sourceDurationInFrames' | 'trimAfterFrames'>,
) {
  return clip.trimAfterFrames ?? clip.sourceDurationInFrames
}

function timelineTracksFor(clips: Clip[], activeTrackIndexes: number[] = []) {
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

function patchResizeStart(
  drag: Extract<TimelineDrag, { type: 'resize' }>,
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

function patchResizeEnd(
  drag: Extract<TimelineDrag, { type: 'resize' }>,
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

export function Timeline() {
  const {
    clips,
    fps,
    durationInFrames,
    currentFrame,
    seekTo,
    selectedClipId,
    setSelectedClipId,
    updateClip,
  } = useEditor()
  const trackAreaRef = useRef<HTMLDivElement | null>(null)
  const dragRef = useRef<TimelineDrag | null>(null)
  const [dragTrackIndexes, setDragTrackIndexes] = useState<number[] | null>(
    null,
  )

  const totalSeconds = Math.max(1, durationInFrames / fps)
  const trackWidth = totalSeconds * PX_PER_SECOND
  const playheadLeft = (currentFrame / fps) * PX_PER_SECOND
  const timelineTracks = useMemo(
    () => timelineTracksFor(clips, dragTrackIndexes ?? []),
    [clips, dragTrackIndexes],
  )
  const timelineHeight = RULER_HEIGHT + timelineTracks.length * TRACK_HEIGHT
  const minTimelineHeight = RULER_HEIGHT + TRACK_HEIGHT * 3

  const handleSeek = (e: React.MouseEvent) => {
    const el = trackAreaRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const x = e.clientX - rect.left - TRACK_HEADER_WIDTH + el.scrollLeft
    const seconds = Math.max(0, x / PX_PER_SECOND)
    const frame = Math.min(
      durationInFrames - 1,
      Math.max(0, Math.round(seconds * fps)),
    )
    seekTo(frame)
    setSelectedClipId(null)
  }

  const startClipDrag = (
    e: React.PointerEvent<HTMLDivElement>,
    clipId: string,
    startFrame: number,
    startTrackIndex: number,
  ) => {
    if (e.button !== 0) return
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    setSelectedClipId(clipId)
    setDragTrackIndexes(timelineTracks.map((track) => track.index))
    dragRef.current = {
      type: 'move',
      clipId,
      pointerId: e.pointerId,
      startX: e.clientX,
      startFrame,
      startTrackIndex,
    }
  }

  const trackIndexFromPointerY = (clientY: number) => {
    const el = trackAreaRef.current
    if (!el) return null
    const rect = el.getBoundingClientRect()
    const y = clientY - rect.top - RULER_HEIGHT
    const row = Math.floor(y / TRACK_HEIGHT)
    if (timelineTracks.length === 0) return 0
    if (row < 0) return timelineTracks[0].index + 1
    if (row >= timelineTracks.length) {
      return timelineTracks[timelineTracks.length - 1].index - 1
    }
    return timelineTracks[row].index
  }

  const handleClipDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== e.pointerId) return
    if (drag.type !== 'move') return
    const deltaFrames = Math.round(
      ((e.clientX - drag.startX) / PX_PER_SECOND) * fps,
    )
    const nextTrackIndex =
      trackIndexFromPointerY(e.clientY) ?? drag.startTrackIndex

    if (deltaFrames === 0 && nextTrackIndex === drag.startTrackIndex) return
    updateClip(drag.clipId, {
      startFrame: Math.max(0, drag.startFrame + deltaFrames),
      trackIndex: nextTrackIndex,
    })
  }

  const startClipResize = (
    e: React.PointerEvent<HTMLDivElement>,
    clip: Clip,
    side: 'start' | 'end',
  ) => {
    if (e.button !== 0) return
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    setSelectedClipId(clip.id)
    dragRef.current = {
      type: 'resize',
      side,
      clipId: clip.id,
      pointerId: e.pointerId,
      startX: e.clientX,
      startFrame: clip.startFrame,
      startDurationInFrames: clip.durationInFrames,
      startTrimBeforeFrames: clip.trimBeforeFrames,
      startTrimAfterFrames: clip.trimAfterFrames,
      sourceDurationInFrames: clip.sourceDurationInFrames,
    }
  }

  const handleClipResize = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== e.pointerId) return
    if (drag.type !== 'resize') return
    const deltaFrames = Math.round(
      ((e.clientX - drag.startX) / PX_PER_SECOND) * fps,
    )
    updateClip(
      drag.clipId,
      drag.side === 'start'
        ? patchResizeStart(drag, deltaFrames)
        : patchResizeEnd(drag, deltaFrames),
    )
  }

  const endClipDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== e.pointerId) return
    dragRef.current = null
    setDragTrackIndexes(null)
  }

  const toggleTrackVisibility = (trackIndex: number) => {
    const trackClips = clips.filter(
      (clip) => clip.trackIndex === trackIndex && clip.type !== 'audio',
    )
    const shouldShow = !trackClips.some((clip) => clip.visible !== false)
    trackClips.forEach((clip) => updateClip(clip.id, { visible: shouldShow }))
  }

  const toggleTrackMute = (trackIndex: number) => {
    const trackClips = clips.filter(
      (clip) =>
        clip.trackIndex === trackIndex &&
        (clip.type === 'video' || clip.type === 'audio'),
    )
    const shouldUnmute = trackClips.every((clip) => clip.muted)
    trackClips.forEach((clip) => updateClip(clip.id, { muted: !shouldUnmute }))
  }

  const tickCount = Math.max(1, Math.ceil(totalSeconds))

  return (
    <div
      className="relative shrink-0 border-t border-border bg-background"
      style={{ height: Math.max(minTimelineHeight, timelineHeight) }}
    >
      <div
        className="absolute left-0 top-0 z-20 border-r border-border bg-background"
        style={{ width: TRACK_HEADER_WIDTH }}
      >
        <div
          className="border-b border-border bg-secondary/40"
          style={{ height: RULER_HEIGHT }}
        />
        {timelineTracks.map((track, rowIndex) => {
          const trackClips = clips.filter(
            (clip) => clip.trackIndex === track.index,
          )
          const visualClips = trackClips.filter((clip) => clip.type !== 'audio')
          const audibleClips = trackClips.filter(
            (clip) => clip.type === 'video' || clip.type === 'audio',
          )
          const isVisible =
            visualClips.length > 0 &&
            visualClips.some((clip) => clip.visible !== false)
          const isMuted =
            audibleClips.length > 0 && audibleClips.every((clip) => clip.muted)

          return (
            <div
              key={track.index}
              className="grid grid-cols-[2rem_1.75rem_1.75rem] items-center gap-1 border-b border-border/60 px-2 text-muted-foreground"
              style={{ height: TRACK_HEIGHT }}
            >
              <span className="text-center font-mono text-xs tabular-nums">
                {timelineTracks.length - rowIndex}
              </span>

              <TimelineIconButton
                label={isVisible ? 'Hide layer' : 'Show layer'}
                disabled={visualClips.length === 0}
                onClick={() => toggleTrackVisibility(track.index)}
              >
                {isVisible ? (
                  <Eye className="h-3.5 w-3.5" />
                ) : (
                  <EyeOff className="h-3.5 w-3.5" />
                )}
              </TimelineIconButton>

              <TimelineIconButton
                label={isMuted ? 'Unmute layer' : 'Mute layer'}
                disabled={audibleClips.length === 0}
                onClick={() => toggleTrackMute(track.index)}
              >
                {isMuted ? (
                  <VolumeX className="h-3.5 w-3.5" />
                ) : (
                  <Volume2 className="h-3.5 w-3.5" />
                )}
              </TimelineIconButton>
            </div>
          )
        })}
      </div>

      <div
        ref={trackAreaRef}
        onClick={handleSeek}
        className="relative h-full cursor-pointer overflow-x-auto overflow-y-hidden"
        style={{ paddingLeft: TRACK_HEADER_WIDTH }}
      >
        <div
          className="relative h-full min-w-full"
          style={{ width: Math.max(trackWidth, 1) }}
        >
          {/* Ruler */}
          <div className="sticky top-0 h-6 border-b border-border bg-secondary/40">
            <div className="relative h-full">
              {Array.from({ length: tickCount + 1 }).map((_, i) => (
                <div
                  key={i}
                  className="absolute top-0 h-full border-l border-border"
                  style={{ left: i * PX_PER_SECOND }}
                >
                  <span className="absolute left-1 top-1/2 -translate-y-1/2 font-mono text-[10px] text-muted-foreground">
                    {`00:${String(i).padStart(2, '0')}`}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Tracks */}
          <div className="relative">
            {timelineTracks.map((track) => (
              <div
                key={track.index}
                className="relative border-b border-border/60"
                style={{ height: TRACK_HEIGHT }}
              >
                {clips
                  .filter((c) => c.trackIndex === track.index)
                  .map((clip) => {
                    const left = (clip.startFrame / fps) * PX_PER_SECOND
                    const width = (clip.durationInFrames / fps) * PX_PER_SECOND
                    const canResizeStart =
                      clip.durationInFrames > MIN_CLIP_FRAMES ||
                      (clip.startFrame > 0 && clip.trimBeforeFrames > 0)
                    const canResizeEnd =
                      clip.durationInFrames > MIN_CLIP_FRAMES ||
                      clipSourceEnd(clip) < clip.sourceDurationInFrames
                    const color =
                      clip.type === 'video'
                        ? 'bg-editor-selection-fill border-editor-selection-border'
                        : clip.type === 'audio'
                          ? 'bg-secondary border-border'
                          : 'bg-muted border-border'
                    const isSelected = selectedClipId === clip.id
                    const isHidden = clip.visible === false
                    return (
                      <div
                        key={clip.id}
                        onPointerDown={(e) =>
                          startClipDrag(
                            e,
                            clip.id,
                            clip.startFrame,
                            clip.trackIndex,
                          )
                        }
                        onPointerMove={handleClipDrag}
                        onPointerMoveCapture={handleClipResize}
                        onPointerUp={endClipDrag}
                        onPointerCancel={endClipDrag}
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedClipId(clip.id)
                        }}
                        className={`group absolute top-1 bottom-1 touch-none select-none overflow-hidden rounded-sm border px-1.5 text-[10px] text-foreground shadow-sm ${
                          isHidden ? 'opacity-45' : ''
                        } ${color} ${
                          isSelected ? 'ring-2 ring-editor-selection ring-offset-1 ring-offset-background' : ''
                        }`}
                        style={{ left, width }}
                        title={clip.name}
                      >
                        <TimelineResizeHandle
                          side="start"
                          disabled={!canResizeStart}
                          selected={isSelected}
                          onPointerDown={(e) =>
                            startClipResize(e, clip, 'start')
                          }
                        />
                        <span className="block truncate leading-9">
                          {clip.name}
                        </span>
                        <TimelineResizeHandle
                          side="end"
                          disabled={!canResizeEnd}
                          selected={isSelected}
                          onPointerDown={(e) => startClipResize(e, clip, 'end')}
                        />
                      </div>
                    )
                  })}
              </div>
            ))}
          </div>

          {/* Playhead */}
          <div
            className="pointer-events-none absolute top-0 bottom-0 z-10 w-px bg-editor-selection"
            style={{ left: playheadLeft }}
          >
            <div className="absolute -left-1.5 -top-1 h-3 w-3 rotate-45 bg-editor-selection" />
          </div>
        </div>
      </div>
    </div>
  )
}

function TimelineResizeHandle({
  side,
  disabled,
  selected,
  onPointerDown,
}: {
  side: 'start' | 'end'
  disabled: boolean
  selected: boolean
  onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void
}) {
  return (
    <div
      aria-label={side === 'start' ? 'Trim clip start' : 'Trim clip end'}
      aria-disabled={disabled}
      onPointerDown={disabled ? undefined : onPointerDown}
      className={`absolute inset-y-0 z-10 flex w-3 cursor-ew-resize items-center justify-center transition-opacity ${
        side === 'start' ? 'left-0' : 'right-0'
      } ${
        selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
      } ${disabled ? 'cursor-not-allowed' : ''}`}
    >
      <span className="h-5 w-1 rounded-full border border-border bg-background/90 shadow-sm" />
    </div>
  )
}

function TimelineIconButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string
  disabled: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label={label}
          disabled={disabled}
          onClick={(e) => {
            e.stopPropagation()
            onClick()
          }}
          className="text-muted-foreground hover:text-foreground"
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}
