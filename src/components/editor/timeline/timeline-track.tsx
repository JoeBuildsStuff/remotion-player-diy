import { useDroppable } from '@dnd-kit/core'

import { TRACK_HEIGHT, timelineTrackDndId } from './timeline-geometry'

export function TimelineTrack({
  trackIndex,
  children,
}: {
  trackIndex: number
  children: React.ReactNode
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: timelineTrackDndId(trackIndex),
    data: {
      trackIndex,
    },
  })

  return (
    <div
      ref={setNodeRef}
      className={`relative border-b border-border/60 ${
        isOver ? 'bg-secondary/40' : ''
      }`}
      style={{ height: TRACK_HEIGHT }}
    >
      {children}
    </div>
  )
}
