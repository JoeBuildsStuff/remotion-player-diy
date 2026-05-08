import { useCurrentScale, useVideoConfig } from 'remotion'

import type { SnapGuides } from './snap-guides'

export function SnapGuideOverlay({ guides }: { guides: SnapGuides }) {
  const scale = useCurrentScale()
  const { width, height } = useVideoConfig()
  const thickness = Math.max(1, 1 / scale)
  const dashLength = 6 / scale
  const color = 'var(--editor-selection)'

  if (guides.vertical.length === 0 && guides.horizontal.length === 0) {
    return null
  }

  return (
    <>
      {guides.vertical.map((x, i) => (
        <div
          key={`snap-v-${i}-${x}`}
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: x - thickness / 2,
            top: 0,
            width: thickness,
            height,
            backgroundImage: `linear-gradient(to bottom, ${color} 50%, transparent 50%)`,
            backgroundSize: `${thickness}px ${dashLength * 2}px`,
            pointerEvents: 'none',
          }}
        />
      ))}
      {guides.horizontal.map((y, i) => (
        <div
          key={`snap-h-${i}-${y}`}
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: y - thickness / 2,
            left: 0,
            height: thickness,
            width,
            backgroundImage: `linear-gradient(to right, ${color} 50%, transparent 50%)`,
            backgroundSize: `${dashLength * 2}px ${thickness}px`,
            pointerEvents: 'none',
          }}
        />
      ))}
    </>
  )
}
