import { useEffect, useRef, useState } from 'react'
import {
  AudioLines,
  Image as ImageIcon,
  Pause,
  Play,
  Trash,
  Music,
  Type,
  Video,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

import { AudioWaveform } from '../media/audio-waveform'
import type { Clip } from '../model/editor-types'

type MediaInspectorProps = {
  clips: Clip[]
  onAddMedia: () => void
  removeClip: (id: string) => void
  selectedClipId: string | null
  setSelectedClipId: (id: string | null) => void
}

function isPreviewableClip(clip: Clip) {
  return Boolean(clip.src) && (clip.type === 'audio' || clip.type === 'video')
}

function ClipThumbnail({ clip }: { clip: Clip }) {
  return (
    <span className="relative h-10 w-14 shrink-0 overflow-hidden rounded bg-secondary/70">
      {clip.type === 'image' ? (
        <img
          src={clip.src}
          alt={clip.name}
          loading="lazy"
          className="h-full w-full object-cover"
        />
      ) : null}
      {clip.type === 'video' ? (
        <video
          src={clip.src}
          muted
          preload="metadata"
          className="h-full w-full object-cover"
        />
      ) : null}
      {clip.type === 'audio' ? (
        clip.src ? (
          <AudioWaveform
            src={clip.src}
            width={56}
            height={40}
            color="var(--editor-audio-border)"
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
  removeClip,
  selectedClipId,
  setSelectedClipId,
}: MediaInspectorProps) {
  const [previewingClipId, setPreviewingClipId] = useState<string | null>(null)
  const previewMediaRef = useRef<HTMLMediaElement | null>(null)

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
        <Empty className="gap-2 rounded-lg border border-border px-3 py-4">
          <EmptyHeader className="gap-1">
            <EmptyMedia className="relative mb-2 h-10 w-20" aria-hidden>
              <div className="absolute left-0 top-1/2 z-10 flex size-8 translate-y-[-40%] -rotate-12 items-center justify-center rounded-md border border-border bg-background text-muted-foreground shadow-sm">
                <ImageIcon className="size-4" />
              </div>
              <div className="absolute left-1/2 top-1/2 z-20 flex size-8 -translate-x-1/2 translate-y-[-60%] items-center justify-center rounded-md border border-border bg-background text-foreground shadow-sm">
                <Video className="size-4" />
              </div>
              <div className="absolute right-0 top-1/2 z-10 flex size-8 translate-y-[-40%] rotate-12 items-center justify-center rounded-md border border-border bg-background text-muted-foreground shadow-sm">
                <Music className="size-4" />
              </div>
            </EmptyMedia>
            <EmptyTitle>No media yet</EmptyTitle>
            <EmptyDescription>Add video, image, or audio to begin.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button type="button" size="sm" onClick={onAddMedia}>
              Add media
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <ul className="space-y-1">
          {clips.map((clip) => {
            const isSelected = selectedClipId === clip.id
            const isPreviewing = previewingClipId === clip.id

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
                  className="flex w-full min-w-0 items-center gap-2 rounded-sm pr-12 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                  title={`${clip.name} (${clip.type})`}
                  aria-pressed={isSelected}
                  onClick={() => setSelectedClipId(clip.id)}
                >
                  <ClipThumbnail clip={clip} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">
                      {clip.name}
                    </span>
                    <span className="block capitalize text-muted-foreground">
                      {clip.type}
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
