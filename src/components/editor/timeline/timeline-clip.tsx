import { useDraggable } from '@dnd-kit/core'

import type { Clip } from '../model/editor-types'
import {
  timelineClipDndId,
  translateStyle,
} from './timeline-geometry'

export function TimelineClip({
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
  const selectionRing =
    clip.type === 'audio'
      ? 'ring-editor-audio'
      : clip.type === 'image'
        ? 'ring-editor-image'
        : 'ring-editor-selection'

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
        isSelected ? `ring-2 ${selectionRing} ring-offset-1 ring-offset-background` : ''
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
