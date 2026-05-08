import { useRef } from 'react'
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
  const { fps } = useVideoConfig()
  const canEdit = setSelectedClipId != null && updateClip != null
  const activeClipDragRef = useRef<ActiveClipDrag | null>(null)
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
  }

  const updateDraggedClipPosition = (delta: DragMoveEvent['delta']) => {
    const drag = activeClipDragRef.current
    if (!drag || !updateClip) return

    const clip = clips.find((c) => c.id === drag.clipId)
    if (!clip) return

    const nextX = Math.round(drag.x + delta.x / drag.scale)
    const nextY = Math.round(drag.y + delta.y / drag.scale)
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
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      onDragCancel={() => {
        activeClipDragRef.current = null
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
