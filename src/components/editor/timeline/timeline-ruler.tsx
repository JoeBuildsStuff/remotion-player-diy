import { RULER_HEIGHT } from './timeline-geometry'

export function TimelineRuler({
  tickCount,
  pxPerSecond,
}: {
  tickCount: number
  pxPerSecond: number
}) {
  return (
    <div
      className="sticky top-0 h-6 border-b border-border bg-secondary/40"
      style={{ height: RULER_HEIGHT }}
    >
      <div className="relative h-full">
        {Array.from({ length: tickCount + 1 }).map((_, i) => (
          <div
            key={i}
            className="absolute top-0 h-full border-l border-border"
            style={{ left: i * pxPerSecond }}
          >
            <span className="absolute left-1 top-1/2 -translate-y-1/2 font-mono text-[10px] text-muted-foreground">
              {`00:${String(i).padStart(2, '0')}`}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
