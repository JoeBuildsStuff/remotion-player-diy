import {
  useRef,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import {
  DndContext,
  PointerSensor,
  type DragEndEvent,
  type DragMoveEvent,
  type DragStartEvent,
  useDraggable,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  AbsoluteFill,
  Audio,
  Img,
  OffthreadVideo,
  Sequence,
  interpolate,
  useCurrentFrame,
  useCurrentScale,
} from 'remotion'

import type { Clip } from './types'

type ResizeHandle = 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw'

type VideoCompositionProps = {
  clips: Clip[]
  selectedClipId?: string | null
  setSelectedClipId?: (id: string | null) => void
  updateClip?: (id: string, patch: Partial<Clip>) => void
}

const MIN_CLIP_SIZE = 20
const HANDLE_SIZE = 12
const HANDLE_HIT_SIZE = 20

type ClipDragData = {
  clipId: string
  x: number
  y: number
  scale: number
}

type ActiveClipDrag = ClipDragData

const RESIZE_HANDLES: {
  handle: ResizeHandle
  cursor: string
  x: 'left' | 'center' | 'right'
  y: 'top' | 'center' | 'bottom'
}[] = [
  { handle: 'nw', cursor: 'nwse-resize', x: 'left', y: 'top' },
  { handle: 'n', cursor: 'ns-resize', x: 'center', y: 'top' },
  { handle: 'ne', cursor: 'nesw-resize', x: 'right', y: 'top' },
  { handle: 'e', cursor: 'ew-resize', x: 'right', y: 'center' },
  { handle: 'se', cursor: 'nwse-resize', x: 'right', y: 'bottom' },
  { handle: 's', cursor: 'ns-resize', x: 'center', y: 'bottom' },
  { handle: 'sw', cursor: 'nesw-resize', x: 'left', y: 'bottom' },
  { handle: 'w', cursor: 'ew-resize', x: 'left', y: 'center' },
]

function resizeClip(
  clip: Clip,
  handle: ResizeHandle,
  dx: number,
  dy: number,
): Pick<Clip, 'x' | 'y' | 'width' | 'height'> {
  const radians = (clip.rotation * Math.PI) / 180
  const cos = Math.cos(radians)
  const sin = Math.sin(radians)
  const localDx = cos * dx + sin * dy
  const localDy = -sin * dx + cos * dy

  let nextX = clip.x
  let nextY = clip.y
  let nextWidth = clip.width
  let nextHeight = clip.height

  if (handle.includes('e')) {
    nextWidth = Math.max(MIN_CLIP_SIZE, clip.width + localDx)
  }
  if (handle.includes('s')) {
    nextHeight = Math.max(MIN_CLIP_SIZE, clip.height + localDy)
  }
  if (handle.includes('w')) {
    const boundedDx = Math.min(localDx, clip.width - MIN_CLIP_SIZE)
    nextX = clip.x + boundedDx
    nextWidth = clip.width - boundedDx
  }
  if (handle.includes('n')) {
    const boundedDy = Math.min(localDy, clip.height - MIN_CLIP_SIZE)
    nextY = clip.y + boundedDy
    nextHeight = clip.height - boundedDy
  }

  return {
    x: Math.round(nextX),
    y: Math.round(nextY),
    width: Math.round(nextWidth),
    height: Math.round(nextHeight),
  }
}

function handlePositionStyle(
  x: 'left' | 'center' | 'right',
  y: 'top' | 'center' | 'bottom',
  hitSize: number,
): CSSProperties {
  const offset = -hitSize / 2
  const style: CSSProperties = {
    position: 'absolute',
    width: hitSize,
    height: hitSize,
    background: 'transparent',
    border: 0,
    padding: 0,
  }

  if (x === 'left') style.left = offset
  if (x === 'center') {
    style.left = '50%'
    style.marginLeft = offset
  }
  if (x === 'right') style.right = offset

  if (y === 'top') style.top = offset
  if (y === 'center') {
    style.top = '50%'
    style.marginTop = offset
  }
  if (y === 'bottom') style.bottom = offset

  return style
}

function SelectionOutline({
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
        outline: isSelected
          ? `${borderWidth}px solid var(--editor-selection)`
          : undefined,
        transform: `rotate(${clip.rotation}deg)`,
        transformOrigin: 'center',
        cursor: isDragging ? 'grabbing' : 'grab',
        userSelect: 'none',
        touchAction: 'none',
      }}
    >
      {isSelected
        ? RESIZE_HANDLES.map(({ handle, cursor, x, y }) => (
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
                  marginLeft: -handleSize / 2,
                  marginTop: -handleSize / 2,
                  borderRadius: '999px',
                  background: 'var(--editor-selection)',
                  border: `${1 / scale}px solid var(--background)`,
                  boxShadow: '0 1px 2px rgb(0 0 0 / 0.25)',
                }}
              />
            </button>
          ))
        : null}
    </div>
  )
}

function renderClip(clip: Clip) {
  if (clip.visible === false) return null
  return <ClipRenderer clip={clip} />
}

function dbToGain(db: number) {
  if (db <= -60) return 0
  return 10 ** (db / 20)
}

function fadeFactor(frame: number, duration: number, fadeIn: number, fadeOut: number) {
  const inFactor =
    fadeIn > 0
      ? interpolate(frame, [0, fadeIn], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        })
      : 1
  const outFactor =
    fadeOut > 0
      ? interpolate(frame, [duration - fadeOut, duration], [1, 0], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        })
      : 1

  return Math.min(inFactor, outFactor)
}

function mediaContainerStyle(clip: Clip, opacity: number): CSSProperties {
  return {
    position: 'absolute',
    left: clip.x,
    top: clip.y,
    width: clip.width,
    height: clip.height,
    overflow: 'hidden',
    borderRadius: clip.borderRadius,
    opacity,
    transform: `rotate(${clip.rotation}deg)`,
    transformOrigin: 'center',
  }
}

function croppedMediaStyle(clip: Clip): CSSProperties {
  return {
    position: 'absolute',
    left: -clip.cropLeft,
    top: -clip.cropTop,
    width: clip.width + clip.cropLeft + clip.cropRight,
    height: clip.height + clip.cropTop + clip.cropBottom,
    objectFit: 'contain',
  }
}

function ClipRenderer({ clip }: { clip: Clip }) {
  const frame = useCurrentFrame()
  const visualFade = fadeFactor(
    frame,
    clip.durationInFrames,
    clip.videoFadeInFrames,
    clip.videoFadeOutFrames,
  )
  const audioFade = fadeFactor(
    frame,
    clip.durationInFrames,
    clip.audioFadeInFrames,
    clip.audioFadeOutFrames,
  )
  const volume = clip.muted ? 0 : dbToGain(clip.volumeDb) * audioFade
  const trimAfter = clip.trimAfterFrames ?? undefined

  if (clip.type === 'video') {
    return (
      <div style={mediaContainerStyle(clip, clip.opacity * visualFade)}>
        <OffthreadVideo
          src={clip.src}
          trimBefore={clip.trimBeforeFrames}
          trimAfter={trimAfter}
          volume={volume}
          muted={clip.muted}
          playbackRate={clip.playbackRate}
          style={croppedMediaStyle(clip)}
        />
      </div>
    )
  }

  if (clip.type === 'image') {
    return (
      <div style={mediaContainerStyle(clip, clip.opacity * visualFade)}>
        <Img src={clip.src} style={croppedMediaStyle(clip)} />
      </div>
    )
  }

  return (
    <Audio
      src={clip.src}
      trimBefore={clip.trimBeforeFrames}
      trimAfter={trimAfter}
      volume={volume}
      muted={clip.muted}
      playbackRate={clip.playbackRate}
    />
  )
}

function sortOutlines(clips: Clip[], selectedClipId: string | null | undefined) {
  const visualClips = clips.filter(
    (clip) => clip.type !== 'audio' && clip.visible !== false,
  )
  const selectedClips = visualClips.filter((clip) => clip.id === selectedClipId)
  const unselectedClips = visualClips.filter((clip) => clip.id !== selectedClipId)

  return [...unselectedClips, ...selectedClips]
}

function sortClipsForComposition(clips: Clip[]) {
  return [...clips].sort((a, b) => a.trackIndex - b.trackIndex)
}

export function VideoComposition({
  clips,
  selectedClipId,
  setSelectedClipId,
  updateClip,
}: VideoCompositionProps) {
  const canEdit = setSelectedClipId != null && updateClip != null
  const activeClipDragRef = useRef<ActiveClipDrag | null>(null)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 3,
      },
    }),
  )

  const handleDragStart = ({ active }: DragStartEvent) => {
    const data = active.data.current as ClipDragData | undefined
    activeClipDragRef.current = data ?? null
  }

  const updateDraggedClipPosition = (delta: DragMoveEvent['delta']) => {
    const drag = activeClipDragRef.current
    if (!drag || !updateClip) return

    updateClip(drag.clipId, {
      x: Math.round(drag.x + delta.x / drag.scale),
      y: Math.round(drag.y + delta.y / drag.scale),
    })
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
        style={{ backgroundColor: 'black' }}
        onPointerDown={(e) => {
          if (canEdit && e.button === 0) setSelectedClipId(null)
        }}
      >
        <AbsoluteFill style={{ overflow: 'hidden' }}>
          {sortClipsForComposition(clips).map((clip) => (
            <Sequence
              key={clip.id}
              from={clip.startFrame}
              durationInFrames={clip.durationInFrames}
            >
              {renderClip(clip)}
            </Sequence>
          ))}
        </AbsoluteFill>

        {canEdit
          ? sortOutlines(clips, selectedClipId).map((clip) => (
              <Sequence
                key={`outline-${clip.id}`}
                from={clip.startFrame}
                durationInFrames={clip.durationInFrames}
              >
                <SelectionOutline
                  clip={clip}
                  isSelected={clip.id === selectedClipId}
                  setSelectedClipId={setSelectedClipId}
                  updateClip={updateClip}
                />
              </Sequence>
            ))
          : null}
      </AbsoluteFill>
    </DndContext>
  )
}
