import { type PointerEvent as ReactPointerEvent } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { useCurrentScale } from 'remotion'

import { Badge } from '@/components/ui/badge'
import type { Clip } from '../model/editor-types'
import {
  HANDLE_HIT_SIZE,
  HANDLE_SIZE,
  RESIZE_HANDLES,
  ROTATION_HANDLE_OFFSET,
  handlePositionStyle,
  normalizeRotation,
  resizeClip,
  type ClipDragData,
  type ResizeHandle,
} from './composition-geometry'

export function SelectionOutline({
  clip,
  isSelected,
  setSelectedClipId,
  updateClip,
}: {
  clip: Clip
  isSelected: boolean
  setSelectedClipId: (id: string | null) => void
  updateClip: (id: string, patch: Partial<Clip>) => void
}) {
  const scale = useCurrentScale()
  const borderWidth = Math.ceil(2 / scale)
  const handleSize = HANDLE_SIZE / scale
  const hitSize = HANDLE_HIT_SIZE / scale
  const rotationHandleOffset = ROTATION_HANDLE_OFFSET / scale
  const { attributes, isDragging, listeners, setNodeRef } = useDraggable({
    id: clip.id,
    data: {
      clipId: clip.id,
      x: clip.x,
      y: clip.y,
      scale,
    } satisfies ClipDragData,
    attributes: {
      roleDescription: 'canvas clip',
    },
  })

  const startResize = (e: ReactPointerEvent, handle: ResizeHandle) => {
    e.stopPropagation()
    if (e.button !== 0) return

    const initialX = e.clientX
    const initialY = e.clientY

    const onPointerMove = (pointerMoveEvent: PointerEvent) => {
      const dx = (pointerMoveEvent.clientX - initialX) / scale
      const dy = (pointerMoveEvent.clientY - initialY) / scale
      updateClip(clip.id, resizeClip(clip, handle, dx, dy))
    }

    const onPointerUp = () => {
      window.removeEventListener('pointermove', onPointerMove)
    }

    window.addEventListener('pointermove', onPointerMove, { passive: true })
    window.addEventListener('pointerup', onPointerUp, { once: true })
  }

  const startRotation = (e: ReactPointerEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    if (e.button !== 0) return

    const bounds = e.currentTarget.parentElement?.getBoundingClientRect()
    if (!bounds) return

    const centerX = bounds.left + bounds.width / 2
    const centerY = bounds.top + bounds.height / 2

    const onPointerMove = (pointerMoveEvent: PointerEvent) => {
      const angle =
        (Math.atan2(pointerMoveEvent.clientY - centerY, pointerMoveEvent.clientX - centerX) *
          180) /
          Math.PI +
        90

      updateClip(clip.id, { rotation: normalizeRotation(angle) })
    }

    const onPointerUp = () => {
      window.removeEventListener('pointermove', onPointerMove)
    }

    window.addEventListener('pointermove', onPointerMove, { passive: true })
    window.addEventListener('pointerup', onPointerUp, { once: true })
  }

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      onPointerDown={(e) => {
        listeners?.onPointerDown?.(e)
        e.stopPropagation()
        if (e.button === 0) setSelectedClipId(clip.id)
      }}
      style={{
        position: 'absolute',
        left: clip.x,
        top: clip.y,
        width: clip.width,
        height: clip.height,
        transform: `rotate(${clip.rotation}deg)`,
        transformOrigin: 'center',
        cursor: isDragging ? 'grabbing' : 'grab',
        userSelect: 'none',
        touchAction: 'none',
      }}
    >
      {isSelected ? (
        <>
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: 0,
              border: `${borderWidth}px solid var(--editor-selection)`,
              borderRadius: clip.borderRadius,
              boxSizing: 'border-box',
              pointerEvents: 'none',
            }}
          />

          <button
            type="button"
            aria-label="Rotate clip"
            onPointerDown={startRotation}
            style={{
              position: 'absolute',
              left: '50%',
              top: -rotationHandleOffset,
              width: hitSize,
              height: hitSize,
              marginLeft: -hitSize / 2,
              marginTop: -hitSize / 2,
              background: 'transparent',
              border: 0,
              padding: 0,
              cursor: 'grab',
            }}
          >
            <span
              aria-hidden="true"
              style={{
                position: 'absolute',
                left: '50%',
                top: `calc(50% + ${handleSize / 2}px)`,
                width: borderWidth,
                height: rotationHandleOffset - handleSize / 2,
                background: 'var(--editor-selection)',
                transform: 'translateX(-50%)',
              }}
            />
            <span
              className="flex items-center justify-center text-editor-selection"
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                width: handleSize,
                height: handleSize,
                borderRadius: '999px',
                background: 'var(--background)',
                border: `${borderWidth}px solid var(--editor-selection)`,
                boxShadow: '0 1px 2px rgb(0 0 0 / 0.25)',
                transform: 'translate(-50%, -50%)',
              }}
            >

            </span>
          </button>

          {RESIZE_HANDLES.map(({ handle, cursor, x, y }) => (
            <button
              key={handle}
              type="button"
              aria-label={`Resize ${handle}`}
              onPointerDown={(e) => startResize(e, handle)}
              style={{
                ...handlePositionStyle(x, y, hitSize),
                cursor,
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: '50%',
                  width: handleSize,
                  height: handleSize,
                  borderRadius: '999px',
                  background: 'var(--editor-selection)',
                  border: `${borderWidth}px solid var(--background)`,
                  boxShadow: '0 1px 2px rgb(0 0 0 / 0.25)',
                  transform: 'translate(-50%, -50%)',
                }}
              />
            </button>
          ))}

          <Badge
            aria-hidden="true"
            variant="outline"
            className="absolute bg-editor-selection! text-foreground shadow-sm pointer-events-none -translate-x-1/2"
            style={{
              left: '50%',
              bottom: -30 / scale,
              height: 20 / scale,
              padding: `0 ${8 / scale}px`,
              fontSize: 10 / scale,
              lineHeight: 1,
            }}
          >
            {Math.round(clip.width)} x {Math.round(clip.height)}
          </Badge>
        </>
      ) : null}
    </div>
  )
}
