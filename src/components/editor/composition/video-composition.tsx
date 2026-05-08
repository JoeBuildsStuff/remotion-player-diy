import { useRef, useState } from 'react'
import {
  DndContext,
  PointerSensor,
  type DragEndEvent,
  type DragMoveEvent,
  type DragStartEvent,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { AbsoluteFill, Sequence, useVideoConfig } from 'remotion'

import type { Clip } from '../model/editor-types'
import { ClipRenderer } from './clip-renderer'
import {
  sortClipsForComposition,
  sortOutlines,
  type ActiveClipDrag,
  type ClipDragData,
} from './composition-geometry'
import { SelectionOutline } from './selection-outline'
import { SnapGuideOverlay } from './snap-guide-overlay'
import {
  arraysEqual,
  computeDragSnap,
  EMPTY_SNAP_GUIDES,
  INITIAL_SNAP_STICKY,
  type SnapGuides,
  type SnapStickyState,
} from './snap-guides'

const SNAP_ENTER_PX = 6
const SNAP_EXIT_PX = 12

type VideoCompositionProps = {
  clips: Clip[]
  selectedClipId?: string | null
  setSelectedClipId?: (id: string | null) => void
  updateClip?: (id: string, patch: Partial<Clip>) => void
}

export function VideoComposition({
  clips,
  selectedClipId,
  setSelectedClipId,
  updateClip,
}: VideoCompositionProps) {
  const { fps, width: compositionWidth, height: compositionHeight } = useVideoConfig()
  const canEdit = setSelectedClipId != null && updateClip != null
  const activeClipDragRef = useRef<ActiveClipDrag | null>(null)
  const stickyRef = useRef<SnapStickyState>(INITIAL_SNAP_STICKY)
  const [snapGuides, setSnapGuides] = useState<SnapGuides>(EMPTY_SNAP_GUIDES)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 3,
      },
    }),
  )

  const handleDragStart = ({ active }: DragStartEvent) => {
    const data = active.data.current as ClipDragData | undefined
    activeClipDragRef.current = data ?? null
    stickyRef.current = INITIAL_SNAP_STICKY
  }

  const updateDraggedClipPosition = (delta: DragMoveEvent['delta']) => {
    const drag = activeClipDragRef.current
    if (!drag || !updateClip) return

    const clip = clips.find((c) => c.id === drag.clipId)
    if (!clip) return

    const rawX = drag.x + delta.x / drag.scale
    const rawY = drag.y + delta.y / drag.scale
    const enterThreshold = SNAP_ENTER_PX / drag.scale
    const exitThreshold = SNAP_EXIT_PX / drag.scale

    const snap = computeDragSnap({
      clip,
      rawX,
      rawY,
      otherClips: clips,
      compositionWidth,
      compositionHeight,
      enterThreshold,
      exitThreshold,
      sticky: stickyRef.current,
    })

    stickyRef.current = snap.sticky

    setSnapGuides((prev) =>
      arraysEqual(prev.vertical, snap.guides.vertical) &&
      arraysEqual(prev.horizontal, snap.guides.horizontal)
        ? prev
        : snap.guides,
    )

    const nextX = Math.round(snap.x)
    const nextY = Math.round(snap.y)
    if (nextX !== clip.x || nextY !== clip.y) {
      updateClip(drag.clipId, { x: nextX, y: nextY })
    }
  }

  const handleDragMove = ({ delta }: DragMoveEvent) => {
    updateDraggedClipPosition(delta)
  }

  const handleDragEnd = ({ delta }: DragEndEvent) => {
    updateDraggedClipPosition(delta)
    activeClipDragRef.current = null
    stickyRef.current = INITIAL_SNAP_STICKY
    setSnapGuides(EMPTY_SNAP_GUIDES)
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      onDragCancel={() => {
        activeClipDragRef.current = null
        stickyRef.current = INITIAL_SNAP_STICKY
        setSnapGuides(EMPTY_SNAP_GUIDES)
      }}
    >
      <AbsoluteFill
        style={{ backgroundColor: 'black' }}
        onPointerDown={(e) => {
          if (canEdit && e.button === 0) setSelectedClipId(null)
        }}
      >
        <AbsoluteFill style={{ overflow: 'hidden' }}>
          {sortClipsForComposition(clips).map((clip) => (
            <Sequence
              key={clip.id}
              from={clip.startFrame}
              durationInFrames={clip.durationInFrames}
              premountFor={fps}
            >
              {clip.visible === false ? null : <ClipRenderer clip={clip} />}
            </Sequence>
          ))}
        </AbsoluteFill>

        {canEdit ? <SnapGuideOverlay guides={snapGuides} /> : null}

        {canEdit
          ? sortOutlines(clips, selectedClipId).map((clip) => (
              <Sequence
                key={`outline-${clip.id}`}
                from={clip.startFrame}
                durationInFrames={clip.durationInFrames}
                premountFor={fps}
              >
                <SelectionOutline
                  clip={clip}
                  isSelected={clip.id === selectedClipId}
                  setSelectedClipId={setSelectedClipId}
                  updateClip={updateClip}
                />
              </Sequence>
            ))
          : null}
      </AbsoluteFill>
    </DndContext>
  )
}
