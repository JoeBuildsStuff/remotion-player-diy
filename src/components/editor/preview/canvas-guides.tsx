import { useCallback, useEffect, useRef, useState } from 'react'

export type Guide = {
  id: string
  axis: 'x' | 'y'
  position: number
}

type DragState = {
  guideId: string
  axis: 'x' | 'y'
  isNew: boolean
  hasMoved: boolean
  pendingDelete: boolean
}

let nextId = 1
const newId = () => `guide-${nextId++}`

const GUIDE_COLOR = '#ef4444'
const GUIDE_HIT_PADDING = 4

export function useCanvasGuides({
  compositionWidth,
  compositionHeight,
  canvasOriginX,
  canvasOriginY,
  canvasDisplayWidth,
  canvasDisplayHeight,
}: {
  compositionWidth: number
  compositionHeight: number
  canvasOriginX: number
  canvasOriginY: number
  canvasDisplayWidth: number
  canvasDisplayHeight: number
}) {
  const [guides, setGuides] = useState<Guide[]>([])
  const [drag, setDrag] = useState<DragState | null>(null)
  const dragRef = useRef<DragState | null>(null)
  dragRef.current = drag

  const screenToCanvas = useCallback(
    (axis: 'x' | 'y', screenLocal: number) => {
      if (axis === 'x') {
        return ((screenLocal - canvasOriginX) * compositionWidth) / canvasDisplayWidth
      }
      return ((screenLocal - canvasOriginY) * compositionHeight) / canvasDisplayHeight
    },
    [canvasOriginX, canvasOriginY, canvasDisplayWidth, canvasDisplayHeight, compositionWidth, compositionHeight],
  )

  useEffect(() => {
    if (!drag) return

    const handleMove = (e: PointerEvent) => {
      const containerEl = document.querySelector('[data-preview-pane]') as HTMLElement | null
      if (!containerEl) return
      const rect = containerEl.getBoundingClientRect()
      const localX = e.clientX - rect.left
      const localY = e.clientY - rect.top

      const inCanvas =
        localX >= canvasOriginX &&
        localX <= canvasOriginX + canvasDisplayWidth &&
        localY >= canvasOriginY &&
        localY <= canvasOriginY + canvasDisplayHeight

      const pos = drag.axis === 'x' ? screenToCanvas('x', localX) : screenToCanvas('y', localY)

      setGuides((prev) =>
        prev.map((g) => (g.id === drag.guideId ? { ...g, position: pos } : g)),
      )

      if (!drag.hasMoved || drag.pendingDelete !== !inCanvas) {
        setDrag((d) => (d ? { ...d, hasMoved: true, pendingDelete: !inCanvas } : d))
      }
    }

    const handleUp = () => {
      const current = dragRef.current
      if (!current) {
        setDrag(null)
        return
      }
      const isClick = !current.hasMoved && !current.isNew
      if (current.pendingDelete || isClick) {
        setGuides((prev) => prev.filter((g) => g.id !== current.guideId))
      }
      setDrag(null)
    }

    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp, { once: true })
    window.addEventListener('pointercancel', handleUp, { once: true })
    return () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
      window.removeEventListener('pointercancel', handleUp)
    }
  }, [drag, canvasOriginX, canvasOriginY, canvasDisplayWidth, canvasDisplayHeight, screenToCanvas])

  const startCreateFromRuler = useCallback(
    (e: React.PointerEvent<HTMLDivElement>, axis: 'x' | 'y') => {
      if (e.button !== 0) return
      e.preventDefault()
      const containerEl = e.currentTarget.parentElement as HTMLElement | null
      if (!containerEl) return
      const rect = containerEl.getBoundingClientRect()
      const localX = e.clientX - rect.left
      const localY = e.clientY - rect.top
      const pos = axis === 'x' ? screenToCanvas('x', localX) : screenToCanvas('y', localY)
      const id = newId()
      setGuides((prev) => [...prev, { id, axis, position: pos }])
      setDrag({ guideId: id, axis, isNew: true, hasMoved: false, pendingDelete: false })
    },
    [screenToCanvas],
  )

  const startMoveExisting = useCallback((e: React.PointerEvent<HTMLDivElement>, guide: Guide) => {
    if (e.button !== 0) return
    e.stopPropagation()
    e.preventDefault()
    setDrag({
      guideId: guide.id,
      axis: guide.axis,
      isNew: false,
      hasMoved: false,
      pendingDelete: false,
    })
  }, [])

  return {
    guides,
    drag,
    startCreateFromRuler,
    startMoveExisting,
  }
}

export function CanvasGuidesOverlay({
  guides,
  drag,
  startMoveExisting,
  canvasOriginX,
  canvasOriginY,
  canvasDisplayWidth,
  canvasDisplayHeight,
  compositionWidth,
  compositionHeight,
  previewWidth,
  previewHeight,
}: {
  guides: Guide[]
  drag: DragState | null
  startMoveExisting: (e: React.PointerEvent<HTMLDivElement>, guide: Guide) => void
  canvasOriginX: number
  canvasOriginY: number
  canvasDisplayWidth: number
  canvasDisplayHeight: number
  compositionWidth: number
  compositionHeight: number
  previewWidth: number
  previewHeight: number
}) {
  const pxPerCanvasX = canvasDisplayWidth / compositionWidth
  const pxPerCanvasY = canvasDisplayHeight / compositionHeight

  return (
    <>
      {guides.map((g) => {
        const isDragging = drag?.guideId === g.id
        const fading = isDragging && drag?.pendingDelete
        if (g.axis === 'x') {
          const screenX = canvasOriginX + g.position * pxPerCanvasX
          return (
            <div
              key={g.id}
              role="separator"
              aria-orientation="vertical"
              aria-label="Vertical guide (click to delete, drag to move)"
              onPointerDown={(e) => startMoveExisting(e, g)}
              className="absolute z-20"
              style={{
                left: screenX - GUIDE_HIT_PADDING,
                top: 0,
                width: GUIDE_HIT_PADDING * 2 + 1,
                height: previewHeight,
                cursor: fading ? 'not-allowed' : 'ew-resize',
                opacity: fading ? 0.4 : 1,
              }}
            >
              <div
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  left: GUIDE_HIT_PADDING,
                  top: 0,
                  bottom: 0,
                  width: 1,
                  background: GUIDE_COLOR,
                  pointerEvents: 'none',
                }}
              />
            </div>
          )
        }
        const screenY = canvasOriginY + g.position * pxPerCanvasY
        return (
          <div
            key={g.id}
            role="separator"
            aria-orientation="horizontal"
            aria-label="Horizontal guide (click to delete, drag to move)"
            onPointerDown={(e) => startMoveExisting(e, g)}
            className="absolute z-20"
            style={{
              top: screenY - GUIDE_HIT_PADDING,
              left: 0,
              height: GUIDE_HIT_PADDING * 2 + 1,
              width: previewWidth,
              cursor: fading ? 'not-allowed' : 'ns-resize',
              opacity: fading ? 0.4 : 1,
            }}
          >
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                top: GUIDE_HIT_PADDING,
                left: 0,
                right: 0,
                height: 1,
                background: GUIDE_COLOR,
                pointerEvents: 'none',
              }}
            />
          </div>
        )
      })}
    </>
  )
}
