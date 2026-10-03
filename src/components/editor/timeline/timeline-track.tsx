import { useDroppable } from '@dnd-kit/core'

import { cn } from '@/lib/utils'
import { TRACK_HEIGHT, timelineTrackDndId } from './timeline-geometry'

export function TimelineTrack({
  trackIndex,
  isSelected = false,
  isDropTarget = false,
  children,
}: {
  trackIndex: number
  isSelected?: boolean
  isDropTarget?: boolean
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
      className={cn(
        'relative border-b border-border/60',
        isDropTarget || isOver
          ? 'bg-secondary/50'
          : isSelected
            ? 'bg-secondary/25'
            : '',
      )}
      style={{ height: TRACK_HEIGHT }}
    >
      {children}
    </div>
  )
}
