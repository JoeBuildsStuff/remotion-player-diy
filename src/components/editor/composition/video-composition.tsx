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

import { TRANSPARENT_COLOR, checkerboardStyle } from '@/lib/color'

import { DEFAULT_CANVAS_BACKGROUND } from '../../../../shared/project-schema'
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
  backgroundColor?: string
  selectedClipId?: string | null
  setSelectedClipId?: (id: string | null) => void
  updateClip?: (id: string, patch: Partial<Clip>) => void
  pause?: () => void
}

export function VideoComposition({
  clips,
  backgroundColor,
  selectedClipId,
  setSelectedClipId,
  updateClip,
  pause,
}: VideoCompositionProps) {
  const { fps } = useVideoConfig()
  const canEdit = setSelectedClipId != null && updateClip != null
  const [editingClipId, setEditingClipId] = useState<string | null>(null)
  const editingClipIdRef = useRef<string | null>(null)
  const commitTextRef = useRef<(() => void) | null>(null)
  const activeClipDragRef = useRef<ActiveClipDrag | null>(null)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 3,
      },
    }),
  )

  const finishTextEdit = () => {
    if (!editingClipIdRef.current) return
    commitTextRef.current?.()
  }

  const beginTextEdit = (id: string) => {
    if (editingClipIdRef.current === id) return
    if (editingClipIdRef.current) finishTextEdit()
    pause?.()
    setSelectedClipId?.(id)
    editingClipIdRef.current = id
    setEditingClipId(id)
  }

  const commitText = (text: string) => {
    const id = editingClipIdRef.current
    if (!id || !updateClip) return
    editingClipIdRef.current = null
    const clip = clips.find((item) => item.id === id)
    if (clip && text !== (clip.text ?? '')) {
      updateClip(id, {
        text,
        name: text.trim() || 'Text',
      })
    }
    setEditingClipId(null)
  }

  const cancelTextEdit = () => {
    editingClipIdRef.current = null
    setEditingClipId(null)
  }

  const selectClip = (id: string | null) => {
    if (id !== editingClipIdRef.current) finishTextEdit()
    setSelectedClipId?.(id)
  }

  const handleDragStart = ({ active }: DragStartEvent) => {
    const data = active.data.current as ClipDragData | undefined
    activeClipDragRef.current = data ?? null
  }

  const updateDraggedClipPosition = (delta: DragMoveEvent['delta']) => {
    const drag = activeClipDragRef.current
    if (!drag || !updateClip) return

    const clip = clips.find((c) => c.id === drag.clipId)
    if (!clip) return

    const rawX = drag.x + delta.x / drag.scale
    const rawY = drag.y + delta.y / drag.scale
    const nextX = Math.round(rawX)
    const nextY = Math.round(rawY)
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
        style={
          backgroundColor === TRANSPARENT_COLOR
            ? checkerboardStyle(48)
            : { backgroundColor: backgroundColor || DEFAULT_CANVAS_BACKGROUND }
        }
        onPointerDown={(e) => {
          if (canEdit && e.button === 0) selectClip(null)
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
              {clip.visible === false ? null : (
                <ClipRenderer
                  clip={clip}
                  hideText={clip.id === editingClipId}
                />
              )}
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
                  isEditing={clip.id === editingClipId}
                  setSelectedClipId={selectClip}
                  updateClip={updateClip}
                  onBeginTextEdit={beginTextEdit}
                  commitTextRef={commitTextRef}
                  onCommitText={commitText}
                  onCancelTextEdit={cancelTextEdit}
                />
              </Sequence>
            ))
          : null}
      </AbsoluteFill>
    </DndContext>
  )
}
