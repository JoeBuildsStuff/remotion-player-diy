import { useMemo, useRef, useState } from 'react'
import {
  DndContext,
  PointerSensor,
  type DragEndEvent,
  type DragStartEvent,
  useSensor,
  useSensors,
} from '@dnd-kit/core'

import { useEditor } from '../model/editor-context-value'
import { timelineClipColorClass } from '../model/clip-colors'
import type { Clip } from '../model/editor-types'
import { formatFrame } from '../transport/transport-time'
import { TimelineClip } from './timeline-clip'
import {
  BASE_PX_PER_SECOND,
  MIN_CLIP_FRAMES,
  RULER_HEIGHT,
  TRACK_HEIGHT,
  clipIdFromDndId,
  clipSourceEnd,
  dragTrackIndexesFor,
  patchResizeEnd,
  patchResizeStart,
  timelineTracksFor,
  trackIndexFromDndId,
  trackIndexFromRowDelta,
  type ActiveTimelineDrag,
  type TimelineDrag,
} from './timeline-geometry'
import {
  beginTimelineInteraction,
  endTimelineInteraction,
} from './timeline-interaction'
import { TimelineRuler } from './timeline-ruler'
import { TimelineTrack } from './timeline-track'
import { TimelineTrackHeaders } from './timeline-track-header'

export function Timeline() {
  const {
    clips,
    fps,
    durationInFrames,
    timelineZoom,
    currentFrame,
    seekTo,
    selectedClipId,
    setSelectedClipId,
    setCurrentFrame,
    addFiles,
    removeClip,
    updateClip,
  } = useEditor()
  const trackAreaRef = useRef<HTMLDivElement | null>(null)
  const dragRef = useRef<TimelineDrag | null>(null)
  const dragInteractionRef = useRef(false)
  const playheadDragRef = useRef<{
    pointerId: number
    frame: number
  } | null>(null)
  const [activeDrag, setActiveDrag] = useState<ActiveTimelineDrag | null>(null)
  const [playheadDrag, setPlayheadDrag] = useState<{
    frame: number
    tooltipX: number
    tooltipY: number
  } | null>(null)
  const [isExternalDragging, setExternalDragging] = useState(false)
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
  const pxPerSecond = BASE_PX_PER_SECOND * timelineZoom
  const trackWidth = totalSeconds * pxPerSecond
  const displayFrame = playheadDrag?.frame ?? currentFrame
  const playheadLeft = (displayFrame / fps) * pxPerSecond
  const timelineTracks = useMemo(
    () => timelineTracksFor(clips, dragTrackIndexes ?? []),
    [clips, dragTrackIndexes],
  )
  const timelineHeight = RULER_HEIGHT + timelineTracks.length * TRACK_HEIGHT
  const minTimelineHeight = RULER_HEIGHT + TRACK_HEIGHT * 3

  const frameFromClientX = (clientX: number) => {
    const el = trackAreaRef.current
    if (!el) return 0
    const rect = el.getBoundingClientRect()
    const x = clientX - rect.left + el.scrollLeft
    const seconds = Math.max(0, x / pxPerSecond)
    return Math.min(
      durationInFrames - 1,
      Math.max(0, Math.round(seconds * fps)),
    )
  }

  const trackIndexFromClientY = (clientY: number) => {
    const el = trackAreaRef.current
    if (!el) return 0
    const rect = el.getBoundingClientRect()
    const y = clientY - rect.top + el.scrollTop - RULER_HEIGHT
    const row = Math.max(0, Math.floor(y / TRACK_HEIGHT))
    const track = timelineTracks[row]
    if (track) return track.index
    const lastTrackIndex = timelineTracks[timelineTracks.length - 1]?.index ?? 0
    return lastTrackIndex - (row - timelineTracks.length + 1)
  }

  const playheadTooltipPosition = (clientX: number) => {
    const el = trackAreaRef.current
    const top = el?.getBoundingClientRect().top ?? 0
    return {
      tooltipX: clientX,
      tooltipY: top - 8,
    }
  }

  const seekFrame = (frame: number) => {
    setCurrentFrame(frame)
    seekTo(frame)
    setSelectedClipId(null)
  }

  const handleSeek = (e: React.MouseEvent) => {
    if (playheadDragRef.current) return
    seekFrame(frameFromClientX(e.clientX))
  }

  const startPlayheadDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    e.preventDefault()
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    const frame = frameFromClientX(e.clientX)
    playheadDragRef.current = { pointerId: e.pointerId, frame }
    setPlayheadDrag({ frame, ...playheadTooltipPosition(e.clientX) })
    seekFrame(frame)
    beginTimelineInteraction()
  }

  const handlePlayheadDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = playheadDragRef.current
    if (!drag || drag.pointerId !== e.pointerId) return
    const frame = frameFromClientX(e.clientX)
    drag.frame = frame
    setPlayheadDrag({ frame, ...playheadTooltipPosition(e.clientX) })
    seekFrame(frame)
  }

  const endPlayheadDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = playheadDragRef.current
    if (!drag || drag.pointerId !== e.pointerId) return
    playheadDragRef.current = null
    setPlayheadDrag(null)
    endTimelineInteraction()
  }

  const hasExternalFiles = (dataTransfer: React.DragEvent['dataTransfer']) =>
    Array.from(dataTransfer.types).includes('Files')

  const handleExternalDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    if (!hasExternalFiles(e.dataTransfer)) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
    setExternalDragging(true)
  }

  const handleExternalDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
      setExternalDragging(false)
    }
  }

  const handleExternalDrop = (e: React.DragEvent<HTMLDivElement>) => {
    if (!e.dataTransfer.files.length) return
    e.preventDefault()
    setExternalDragging(false)
    const startFrame = frameFromClientX(e.clientX)
    const trackIndex = trackIndexFromClientY(e.clientY)
    void addFiles(e.dataTransfer.files, { startFrame, trackIndex })
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
    beginTimelineInteraction()
  }

  const handleClipResize = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== e.pointerId) return
    if (drag.type !== 'resize') return
    const deltaFrames = Math.round(
      ((e.clientX - drag.startX) / pxPerSecond) * fps,
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
    endTimelineInteraction()
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
    dragInteractionRef.current = true
    beginTimelineInteraction()
  }

  const resetDragState = () => {
    setActiveDrag(null)
    setDragTrackIndexes(null)
    if (dragInteractionRef.current) {
      dragInteractionRef.current = false
      endTimelineInteraction()
    }
  }

  const handleDragEnd = ({ active, delta, over }: DragEndEvent) => {
    const clipId = clipIdFromDndId(String(active.id))
    if (!activeDrag || activeDrag.clipId !== clipId) {
      resetDragState()
      return
    }

    const deltaFrames = Math.round((delta.x / pxPerSecond) * fps)
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
      className="flex min-h-0 flex-1 border-t border-border bg-background"
      style={{ minHeight: minTimelineHeight }}
    >
      {playheadDrag ? (
        <div
          className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-full rounded-md bg-editor-selection px-2 py-1 font-mono text-[10px] text-background shadow-md"
          style={{
            left: playheadDrag.tooltipX,
            top: playheadDrag.tooltipY,
          }}
        >
          {formatFrame(playheadDrag.frame, fps)}
        </div>
      ) : null}
      <TimelineTrackHeaders
        clips={clips}
        tracks={timelineTracks}
        onToggleTrackVisibility={toggleTrackVisibility}
        onToggleTrackMute={toggleTrackMute}
        onDeleteTrack={deleteTrack}
      />

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div
          ref={trackAreaRef}
          onClick={handleSeek}
          onDragOver={handleExternalDragOver}
          onDragLeave={handleExternalDragLeave}
          onDrop={handleExternalDrop}
          className="relative h-full flex-1 cursor-pointer overflow-auto"
        >
          <div
            className="relative min-h-full min-w-full"
            style={{
              width: Math.max(trackWidth, 1),
              height: Math.max(timelineHeight, minTimelineHeight),
              minHeight: '100%',
            }}
          >
            <TimelineRuler tickCount={tickCount} pxPerSecond={pxPerSecond} />

            <div className="relative">
              {timelineTracks.map((track) => (
                <TimelineTrack key={track.index} trackIndex={track.index}>
                  {clips
                    .filter((c) => c.trackIndex === track.index)
                    .map((clip) => {
                      const left = (clip.startFrame / fps) * pxPerSecond
                      const width =
                        (clip.durationInFrames / fps) * pxPerSecond
                      const canResizeStart =
                        clip.durationInFrames > MIN_CLIP_FRAMES ||
                        (clip.startFrame > 0 && clip.trimBeforeFrames > 0)
                      const canResizeEnd =
                        clip.durationInFrames > MIN_CLIP_FRAMES ||
                        clipSourceEnd(clip) < clip.sourceDurationInFrames
                      const color = timelineClipColorClass(clip.type)
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
                          fps={fps}
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

            <div
              className="absolute top-0 bottom-0 z-10 w-px bg-editor-selection"
              style={{ left: playheadLeft }}
            >
              <div className="absolute -left-1.5 -top-1 h-3 w-3 rotate-45 bg-editor-selection" />
              <div
                className="absolute -left-3 top-0 h-full w-6 cursor-ew-resize"
                role="slider"
                aria-label="Timeline playhead"
                aria-valuemin={0}
                aria-valuemax={Math.max(0, durationInFrames - 1)}
                aria-valuenow={displayFrame}
                onPointerDown={startPlayheadDrag}
                onPointerMove={handlePlayheadDrag}
                onPointerUp={endPlayheadDrag}
                onPointerCancel={endPlayheadDrag}
              />
            </div>
            {isExternalDragging ? (
              <div className="pointer-events-none absolute inset-0 z-20 border-2 border-dashed border-editor-selection bg-secondary/30" />
            ) : null}
          </div>
        </div>
      </DndContext>
    </div>
  )
}
