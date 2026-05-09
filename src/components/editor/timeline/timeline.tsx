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
    removeClip,
    updateClip,
  } = useEditor()
  const trackAreaRef = useRef<HTMLDivElement | null>(null)
  const dragRef = useRef<TimelineDrag | null>(null)
  const dragInteractionRef = useRef(false)
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
  const pxPerSecond = BASE_PX_PER_SECOND * timelineZoom
  const trackWidth = totalSeconds * pxPerSecond
  const playheadLeft = (currentFrame / fps) * pxPerSecond
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
    const x = e.clientX - rect.left + el.scrollLeft
    const seconds = Math.max(0, x / pxPerSecond)
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
      className="flex shrink-0 border-t border-border bg-background"
      style={{ height: Math.max(minTimelineHeight, timelineHeight) }}
    >
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
          className="relative h-full flex-1 cursor-pointer overflow-x-auto overflow-y-hidden"
        >
          <div
            className="relative h-full min-w-full"
            style={{ width: Math.max(trackWidth, 1) }}
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
