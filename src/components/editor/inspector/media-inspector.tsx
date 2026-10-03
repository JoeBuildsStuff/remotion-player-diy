import { useEffect, useRef, useState } from 'react'
import {
  AudioLines,
  Image as ImageIcon,
  Pause,
  Play,
  Trash,
  Type,
  Video,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { MediaEmptyState } from '../media/media-empty-state'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

import { AudioWaveform } from '../media/audio-waveform'
import { EDITOR_CLIP_DRAG_TYPE } from '../model/clip-clipboard'
import { FPS } from '../model/editor-constants'
import type { Clip } from '../model/editor-types'
import { timelineTrackLabel } from '../timeline/timeline-geometry'

type MediaInspectorProps = {
  clips: Clip[]
  onAddMedia: () => void
  onDropFiles?: (files: FileList) => void | Promise<void>
  removeClip: (id: string) => void
  selectedClipId: string | null
  setSelectedClipId: (id: string | null) => void
}

function isPreviewableClip(clip: Clip) {
  return Boolean(clip.src) && (clip.type === 'audio' || clip.type === 'video')
}

function formatMediaTime(frame: number, fps: number) {
  const totalSeconds = frame / fps
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = Math.floor(totalSeconds % 60)
  const centiseconds = Math.floor((totalSeconds * 100) % 100)
  const clock = `${minutes}:${String(seconds).padStart(2, '0')}`
  if (centiseconds === 0) return clock
  return `${clock}.${String(centiseconds).padStart(2, '0')}`
}

function ClipThumbnail({ clip }: { clip: Clip }) {
  return (
    <span className="relative h-10 w-14 shrink-0 overflow-hidden rounded bg-secondary/70">
      {clip.type === 'image' ? (
        <img
          src={clip.src}
          alt={clip.name}
          loading="lazy"
          draggable={false}
          className="h-full w-full object-cover"
        />
      ) : null}
      {clip.type === 'video' ? (
        <video
          src={clip.src}
          muted
          preload="metadata"
          draggable={false}
          className="h-full w-full object-cover"
        />
      ) : null}
      {clip.type === 'audio' ? (
        clip.src ? (
          <AudioWaveform
            src={clip.src}
            width={56}
            height={40}
            color="var(--foreground)"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center">
            <AudioLines className="size-4 text-muted-foreground" />
          </span>
        )
      ) : null}
      {clip.type === 'text' ? (
        <span className="flex h-full w-full items-center justify-center">
          <Type className="size-4 text-muted-foreground" />
        </span>
      ) : null}
      <ClipTypeBadge type={clip.type} />
    </span>
  )
}

function ClipTypeBadge({ type }: { type: Clip['type'] }) {
  const Icon =
    type === 'video'
      ? Video
      : type === 'image'
        ? ImageIcon
        : type === 'audio'
          ? AudioLines
          : null

  if (!Icon) return null

  return (
    <span className="absolute top-1 left-1 rounded bg-background/85 p-0.5">
      <Icon className="size-2.5 text-foreground" />
    </span>
  )
}

export function MediaInspector({
  clips,
  onAddMedia,
  onDropFiles,
  removeClip,
  selectedClipId,
  setSelectedClipId,
}: MediaInspectorProps) {
  const [previewingClipId, setPreviewingClipId] = useState<string | null>(null)
  const previewMediaRef = useRef<HTMLMediaElement | null>(null)
  const suppressClickRef = useRef(false)

  const stopPreview = () => {
    const media = previewMediaRef.current
    if (!media) {
      setPreviewingClipId(null)
      return
    }

    media.pause()
    media.currentTime = 0
    media.onended = null
    previewMediaRef.current = null
    setPreviewingClipId(null)
  }

  const togglePreview = (clip: Clip) => {
    if (!isPreviewableClip(clip)) return

    if (previewingClipId === clip.id) {
      stopPreview()
      return
    }

    stopPreview()

    const media =
      clip.type === 'video' ? document.createElement('video') : new Audio()
    media.src = clip.src
    media.preload = 'metadata'
    media.onended = () => {
      if (previewMediaRef.current !== media) return
      previewMediaRef.current = null
      setPreviewingClipId(null)
    }

    previewMediaRef.current = media
    setPreviewingClipId(clip.id)
    void media.play().catch(() => {
      if (previewMediaRef.current === media) {
        previewMediaRef.current = null
      }
      setPreviewingClipId(null)
    })
  }

  useEffect(() => stopPreview, [])

  return (
    <section className="space-y-2">
      {clips.length === 0 ? (
        <MediaEmptyState
          title="No media yet"
          description="Drop files here or use Add media to upload."
          actionLabel="Add media"
          onAction={onAddMedia}
          onDropFiles={onDropFiles}
        />
      ) : (
        <ul className="space-y-1">
          {clips.map((clip) => {
            const isSelected = selectedClipId === clip.id
            const isPreviewing = previewingClipId === clip.id
            const trackLabel = timelineTrackLabel(clips, clip.trackIndex)
            const rangeLabel = `${formatMediaTime(clip.startFrame, FPS)}–${formatMediaTime(clip.startFrame + clip.durationInFrames, FPS)}`

            return (
              <li
                key={clip.id}
                className={cn(
                  'group relative rounded border border-border bg-secondary/40 p-1 text-xs text-foreground transition-colors hover:bg-secondary/60',
                  isSelected && 'border-ring bg-secondary/70',
                )}
              >
                <button
                  type="button"
                  draggable
                  className="flex w-full min-w-0 cursor-grab items-start gap-2 rounded-sm pr-12 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/40 active:cursor-grabbing"
                  title={`${clip.name} (${clip.type}) · Track ${trackLabel} · ${rangeLabel}`}
                  aria-pressed={isSelected}
                  onDragStart={(event) => {
                    suppressClickRef.current = true
                    event.dataTransfer.effectAllowed = 'copy'
                    event.dataTransfer.setData(EDITOR_CLIP_DRAG_TYPE, clip.id)
                    event.dataTransfer.setData('text/plain', clip.name)
                  }}
                  onClick={() => {
                    if (suppressClickRef.current) {
                      suppressClickRef.current = false
                      return
                    }
                    setSelectedClipId(clip.id)
                  }}
                >
                  <ClipThumbnail clip={clip} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">
                      {clip.name}
                    </span>
                    <span className="block capitalize text-muted-foreground">
                      {clip.type}
                    </span>
                    <span className="block truncate text-[10px] leading-4 text-muted-foreground/80 tabular-nums">
                      Track {trackLabel} · {rangeLabel}
                    </span>
                  </span>
                </button>
                <div className="absolute right-1 bottom-1 flex items-center gap-1">
                  {isPreviewableClip(clip) ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          aria-label={
                            isPreviewing ? `Pause ${clip.name}` : `Play ${clip.name}`
                          }
                          onClick={() => togglePreview(clip)}
                        >
                          {isPreviewing ? (
                            <Pause className="size-3" />
                          ) : (
                            <Play className="size-3" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {isPreviewing ? 'Pause preview' : 'Play preview'}
                      </TooltipContent>
                    </Tooltip>
                  ) : null}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        aria-label={`Delete ${clip.name}`}
                        onClick={() => {
                          if (isPreviewing) stopPreview()
                          removeClip(clip.id)
                        }}
                      >
                        <Trash className="size-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Delete clip</TooltipContent>
                  </Tooltip>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
