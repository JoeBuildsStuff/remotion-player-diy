import { useDraggable } from '@dnd-kit/core'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

import type { Clip } from '../model/editor-types'
import { AudioWaveform } from '../media/audio-waveform'
import {
  CLIP_VERTICAL_INSET,
  COMPACT_CLIP_HEIGHT,
  TRACK_HEIGHT,
  VIDEO_CLIP_VERTICAL_INSET,
  timelineClipDndId,
  translateStyle,
} from './timeline-geometry'
import { VideoStillStrip } from './video-still-strip'

function timelineClipBadgeVariant(type: Clip['type']) {
  if (type === 'video') return 'blue'
  if (type === 'audio') return 'green'
  if (type === 'image') return 'purple'
  if (type === 'text') return 'amber'
  return 'secondary'
}

export function TimelineClip({
  clip,
  color,
  isSelected,
  isHidden,
  left,
  width,
  fps,
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
  fps: number
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
        : clip.type === 'text'
          ? 'ring-editor-text'
          : 'ring-editor-selection'
  const isCompactClip = clip.type === 'audio' || clip.type === 'text'
  const clipTop = isCompactClip
    ? (TRACK_HEIGHT - COMPACT_CLIP_HEIGHT) / 2
    : clip.type === 'video'
      ? VIDEO_CLIP_VERTICAL_INSET
    : CLIP_VERTICAL_INSET
  const clipHeight = isCompactClip
    ? COMPACT_CLIP_HEIGHT
    : clip.type === 'video'
      ? TRACK_HEIGHT - VIDEO_CLIP_VERTICAL_INSET * 2
    : TRACK_HEIGHT - CLIP_VERTICAL_INSET * 2

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
      className={cn(
        'group absolute flex touch-none select-none items-center overflow-hidden rounded-sm border px-1.5 text-[10px] text-foreground shadow-sm',
        color,
        isHidden && 'opacity-45',
        isSelected &&
          `ring-2 ${selectionRing} ring-offset-1 ring-offset-background`,
        isDragging ? 'z-20 cursor-grabbing' : 'cursor-grab',
      )}
      style={{
        left,
        width,
        top: clipTop,
        height: clipHeight,
        transform: translateStyle(transform),
        ...(clip.type === 'image' && clip.src
          ? {
              backgroundImage: `url(${clip.src})`,
              backgroundRepeat: 'repeat-x',
              backgroundSize: 'auto 100%',
              backgroundPosition: 'left center',
            }
          : null),
      }}
      title={clip.name}
    >
      <TimelineResizeHandle
        side="start"
        disabled={!canResizeStart}
        selected={isSelected}
        onPointerDown={(e) => startClipResize(e, clip, 'start')}
      />
      {clip.type === 'audio' && clip.src && width > 0 ? (
        <AudioWaveform
          src={clip.src}
          width={width}
          height={COMPACT_CLIP_HEIGHT - 4}
          color="var(--editor-audio-border)"
        />
      ) : null}
      {clip.type === 'video' && clip.src && width > 0 ? (
        <VideoStillStrip clip={clip} fps={fps} width={width} />
      ) : null}
      <Badge
        variant={timelineClipBadgeVariant(clip.type)}
        className={cn(
          'relative z-[1] max-w-full justify-start truncate px-1 text-[10px] shadow-sm backdrop-blur-[2px] transition-opacity',
          clip.type === 'text'
            ? 'opacity-100'
            : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100',
        )}
      >
        {clip.name}
      </Badge>
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
