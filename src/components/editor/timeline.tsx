import { useMemo, useRef, useState } from 'react'
import {
  DndContext,
  PointerSensor,
  type DragEndEvent,
  type DragStartEvent,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { Eye, EyeOff, Trash, Volume2, VolumeX } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

import { useEditor } from './editor-context'
import type { Clip } from './types'

const PX_PER_SECOND = 60
const TRACK_HEADER_WIDTH = 154
const RULER_HEIGHT = 24
const TRACK_HEIGHT = 44
const MIN_CLIP_FRAMES = 1
const TIMELINE_CLIP_ID_PREFIX = 'item-'
const TIMELINE_TRACK_ID_PREFIX = 'container-'

type TimelineDrag =
  {
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

type ActiveTimelineDrag = {
  clipId: string
  startFrame: number
  startTrackIndex: number
  tracks: { index: number }[]
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function clipSourceEnd(
  clip: Pick<Clip, 'sourceDurationInFrames' | 'trimAfterFrames'>,
) {
  return clip.trimAfterFrames ?? clip.sourceDurationInFrames
}

function timelineClipDndId(clipId: string) {
  return `${TIMELINE_CLIP_ID_PREFIX}${clipId}`
}

function timelineTrackDndId(trackIndex: number) {
  return `${TIMELINE_TRACK_ID_PREFIX}${trackIndex}`
}

function clipIdFromDndId(id: string) {
  return id.startsWith(TIMELINE_CLIP_ID_PREFIX)
    ? id.slice(TIMELINE_CLIP_ID_PREFIX.length)
    : null
}

function trackIndexFromDndId(id: string) {
  if (!id.startsWith(TIMELINE_TRACK_ID_PREFIX)) return null

  const index = Number(id.slice(TIMELINE_TRACK_ID_PREFIX.length))
  return Number.isFinite(index) ? index : null
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

function dragTrackIndexesFor(tracks: { index: number }[]) {
  if (tracks.length === 0) return [0]

  return [
    tracks[0].index + 1,
    ...tracks.map((track) => track.index),
    tracks[tracks.length - 1].index - 1,
  ]
}

function trackIndexFromRowDelta(
  tracks: { index: number }[],
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

function translateStyle(transform: { x: number; y: number } | null) {
  if (!transform) return undefined

  return `translate3d(${transform.x}px, ${transform.y}px, 0)`
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
    removeClip,
    updateClip,
  } = useEditor()
  const trackAreaRef = useRef<HTMLDivElement | null>(null)
  const dragRef = useRef<TimelineDrag | null>(null)
  const [activeDrag, setActiveDrag] = useState<ActiveTimelineDrag | null>(null)
  const [dragTrackIndexes, setDragTrackIndexes] = useState<number[] | null>(
    null,
  )
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 3,
      },
    }),
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

  const endClipResize = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== e.pointerId) return
    dragRef.current = null
    setDragTrackIndexes(null)
  }

  const handleDragStart = ({ active }: DragStartEvent) => {
    const clipId = clipIdFromDndId(String(active.id))
    if (!clipId) return

    const clip = clips.find((item) => item.id === clipId)
    if (!clip) return

    const tracks = timelineTracksFor(clips)
    setSelectedClipId(clip.id)
    setActiveDrag({
      clipId: clip.id,
      startFrame: clip.startFrame,
      startTrackIndex: clip.trackIndex,
      tracks,
    })
    setDragTrackIndexes(dragTrackIndexesFor(tracks))
  }

  const resetDragState = () => {
    setActiveDrag(null)
    setDragTrackIndexes(null)
  }

  const handleDragEnd = ({ active, delta, over }: DragEndEvent) => {
    const clipId = clipIdFromDndId(String(active.id))
    if (!activeDrag || activeDrag.clipId !== clipId) {
      resetDragState()
      return
    }

    const deltaFrames = Math.round((delta.x / PX_PER_SECOND) * fps)
    const overTrackIndex = over ? trackIndexFromDndId(String(over.id)) : null
    const nextTrackIndex =
      overTrackIndex ??
      trackIndexFromRowDelta(
        activeDrag.tracks,
        activeDrag.startTrackIndex,
        delta.y,
      )

    updateClip(clipId, {
      startFrame: Math.max(0, activeDrag.startFrame + deltaFrames),
      trackIndex: nextTrackIndex,
    })
    resetDragState()
  }

  const handleDragCancel = () => {
    resetDragState()
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

  const deleteTrack = (trackIndex: number) => {
    clips
      .filter((clip) => clip.trackIndex === trackIndex)
      .forEach((clip) => removeClip(clip.id))
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
              className="grid grid-cols-[2rem_1.75rem_1.75rem_1.75rem] items-center gap-1 border-b border-border/60 px-2 text-muted-foreground"
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

              <TimelineIconButton
                label="Delete row"
                disabled={trackClips.length === 0}
                onClick={() => deleteTrack(track.index)}
              >
                <Trash className="h-3.5 w-3.5" />
              </TimelineIconButton>
            </div>
          )
        })}
      </div>

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
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
                <TimelineTrack
                  key={track.index}
                  trackIndex={track.index}
                >
                  {clips
                    .filter((c) => c.trackIndex === track.index)
                    .map((clip) => {
                      const left = (clip.startFrame / fps) * PX_PER_SECOND
                      const width =
                        (clip.durationInFrames / fps) * PX_PER_SECOND
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
                        <TimelineClip
                          key={clip.id}
                          clip={clip}
                          color={color}
                          isSelected={isSelected}
                          isHidden={isHidden}
                          left={left}
                          width={width}
                          canResizeStart={canResizeStart}
                          canResizeEnd={canResizeEnd}
                          setSelectedClipId={setSelectedClipId}
                          startClipResize={startClipResize}
                          handleClipResize={handleClipResize}
                          endClipResize={endClipResize}
                        />
                      )
                    })}
                </TimelineTrack>
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
      </DndContext>
    </div>
  )
}

function TimelineClip({
  clip,
  color,
  isSelected,
  isHidden,
  left,
  width,
  canResizeStart,
  canResizeEnd,
  setSelectedClipId,
  startClipResize,
  handleClipResize,
  endClipResize,
}: {
  clip: Clip
  color: string
  isSelected: boolean
  isHidden: boolean
  left: number
  width: number
  canResizeStart: boolean
  canResizeEnd: boolean
  setSelectedClipId: (id: string | null) => void
  startClipResize: (
    e: React.PointerEvent<HTMLDivElement>,
    clip: Clip,
    side: 'start' | 'end',
  ) => void
  handleClipResize: (e: React.PointerEvent<HTMLDivElement>) => void
  endClipResize: (e: React.PointerEvent<HTMLDivElement>) => void
}) {
  const { attributes, isDragging, listeners, setNodeRef, transform } =
    useDraggable({
      id: timelineClipDndId(clip.id),
      attributes: {
        roleDescription: 'timeline clip',
      },
    })

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      onPointerDown={(e) => {
        listeners?.onPointerDown?.(e)
        e.stopPropagation()
        setSelectedClipId(clip.id)
      }}
      onPointerMoveCapture={handleClipResize}
      onPointerUp={endClipResize}
      onPointerCancel={endClipResize}
      onClick={(e) => {
        e.stopPropagation()
        setSelectedClipId(clip.id)
      }}
      className={`group absolute top-1 bottom-1 touch-none select-none overflow-hidden rounded-sm border px-1.5 text-[10px] text-foreground shadow-sm ${
        isHidden ? 'opacity-45' : ''
      } ${color} ${
        isSelected ? 'ring-2 ring-editor-selection ring-offset-1 ring-offset-background' : ''
      } ${isDragging ? 'z-20 cursor-grabbing' : 'cursor-grab'}`}
      style={{
        left,
        width,
        transform: translateStyle(transform),
      }}
      title={clip.name}
    >
      <TimelineResizeHandle
        side="start"
        disabled={!canResizeStart}
        selected={isSelected}
        onPointerDown={(e) => startClipResize(e, clip, 'start')}
      />
      <span className="block truncate leading-9">{clip.name}</span>
      <TimelineResizeHandle
        side="end"
        disabled={!canResizeEnd}
        selected={isSelected}
        onPointerDown={(e) => startClipResize(e, clip, 'end')}
      />
    </div>
  )
}

function TimelineTrack({
  trackIndex,
  children,
}: {
  trackIndex: number
  children: React.ReactNode
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: timelineTrackDndId(trackIndex),
    data: {
      trackIndex,
    },
  })

  return (
    <div
      ref={setNodeRef}
      className={`relative border-b border-border/60 ${
        isOver ? 'bg-secondary/40' : ''
      }`}
      style={{ height: TRACK_HEIGHT }}
    >
      {children}
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
