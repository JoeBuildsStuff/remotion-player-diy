import { Fragment, type PointerEvent as ReactPointerEvent } from 'react'

export const RULER_SIZE = 22
const TICK_STEP = 25
const MAJOR_EVERY = 100
const MAJOR_HEIGHT = 10
const MINOR_HEIGHT = 5

export function CanvasRulers({
  previewWidth,
  previewHeight,
  canvasOriginX,
  canvasOriginY,
  canvasDisplayWidth,
  canvasDisplayHeight,
  compositionWidth,
  compositionHeight,
  onRulerPointerDown,
}: {
  previewWidth: number
  previewHeight: number
  canvasOriginX: number
  canvasOriginY: number
  canvasDisplayWidth: number
  canvasDisplayHeight: number
  compositionWidth: number
  compositionHeight: number
  onRulerPointerDown?: (e: ReactPointerEvent<HTMLDivElement>, axis: 'x' | 'y') => void
}) {
  if (previewWidth <= 0 || previewHeight <= 0 || canvasDisplayWidth <= 0) return null

  const pxPerCanvasX = canvasDisplayWidth / compositionWidth
  const pxPerCanvasY = canvasDisplayHeight / compositionHeight

  const buildTicks = (
    rangeStartScreen: number,
    rangeEndScreen: number,
    pxPerCanvas: number,
    canvasOriginScreen: number,
  ) => {
    const startCanvas = (rangeStartScreen - canvasOriginScreen) / pxPerCanvas
    const endCanvas = (rangeEndScreen - canvasOriginScreen) / pxPerCanvas
    const firstTick = Math.ceil(startCanvas / TICK_STEP) * TICK_STEP
    const lastTick = Math.floor(endCanvas / TICK_STEP) * TICK_STEP
    const out: { canvasPos: number; screenPos: number; major: boolean }[] = []
    for (let v = firstTick; v <= lastTick; v += TICK_STEP) {
      out.push({
        canvasPos: v,
        screenPos: canvasOriginScreen + v * pxPerCanvas,
        major: v % MAJOR_EVERY === 0,
      })
    }
    return out
  }

  const xTicks = buildTicks(0, previewWidth, pxPerCanvasX, canvasOriginX)
  const yTicks = buildTicks(0, previewHeight, pxPerCanvasY, canvasOriginY)

  return (
    <>
      <div
        data-ruler="x"
        className="absolute z-10 cursor-ns-resize border-b border-border bg-background/95 text-[9px] font-medium text-muted-foreground select-none"
        style={{
          left: 0,
          top: 0,
          width: previewWidth,
          height: RULER_SIZE,
        }}
        onPointerDown={(e) => onRulerPointerDown?.(e, 'y')}
      >
        {xTicks.map((t) => (
          <Fragment key={`x-${t.canvasPos}`}>
            <div
              className="pointer-events-none absolute bg-border"
              style={{
                left: t.screenPos,
                bottom: 0,
                width: 1,
                height: t.major ? MAJOR_HEIGHT : MINOR_HEIGHT,
              }}
            />
            {t.major && t.canvasPos !== 0 ? (
              <div
                className="pointer-events-none absolute"
                style={{
                  left: t.screenPos + 3,
                  top: 3,
                  lineHeight: 1,
                }}
              >
                {t.canvasPos}
              </div>
            ) : null}
          </Fragment>
        ))}
      </div>

      <div
        data-ruler="y"
        className="absolute z-10 cursor-ew-resize border-r border-border bg-background/95 text-[9px] font-medium text-muted-foreground select-none"
        style={{
          left: 0,
          top: 0,
          width: RULER_SIZE,
          height: previewHeight,
        }}
        onPointerDown={(e) => onRulerPointerDown?.(e, 'x')}
      >
        {yTicks.map((t) => (
          <Fragment key={`y-${t.canvasPos}`}>
            <div
              className="pointer-events-none absolute bg-border"
              style={{
                top: t.screenPos,
                right: 0,
                height: 1,
                width: t.major ? MAJOR_HEIGHT : MINOR_HEIGHT,
              }}
            />
            {t.major && t.canvasPos !== 0 ? (
              <div
                className="pointer-events-none absolute"
                style={{
                  top: t.screenPos + 3,
                  left: 3,
                  lineHeight: 1,
                  writingMode: 'vertical-rl',
                  transform: 'rotate(180deg)',
                }}
              >
                {t.canvasPos}
              </div>
            ) : null}
          </Fragment>
        ))}
      </div>

      <div
        aria-hidden="true"
        className="pointer-events-none absolute z-10 border-r border-b border-border bg-background"
        style={{ left: 0, top: 0, width: RULER_SIZE, height: RULER_SIZE }}
      />
    </>
  )
}
