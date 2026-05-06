import { useMemo, useRef } from 'react'
import { Eye, EyeOff, Volume2, VolumeX } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

import { useEditor } from './editor-context'
import { TRACKS } from './types'

const PX_PER_SECOND = 60
const TRACK_HEADER_WIDTH = 122
const RULER_HEIGHT = 24
const TRACK_HEIGHT = 44

export function Timeline() {
  const {
    clips,
    fps,
    durationInFrames,
    currentFrame,
    seekTo,
    selectedClipId,
    setSelectedClipId,
    updateClip,
  } = useEditor()
  const trackAreaRef = useRef<HTMLDivElement | null>(null)
  const dragRef = useRef<{
    clipId: string
    pointerId: number
    startX: number
    startY: number
    startFrame: number
    startTrackIndex: number
  } | null>(null)

  const totalSeconds = Math.max(1, durationInFrames / fps)
  const trackWidth = totalSeconds * PX_PER_SECOND
  const playheadLeft = (currentFrame / fps) * PX_PER_SECOND
  const timelineTracks = useMemo(
    () => [...TRACKS].sort((a, b) => b.index - a.index),
    [],
  )

  const handleSeek = (e: React.MouseEvent) => {
    const el = trackAreaRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const x = e.clientX - rect.left - TRACK_HEADER_WIDTH + el.scrollLeft
    const seconds = Math.max(0, x / PX_PER_SECOND)
    const frame = Math.min(
      durationInFrames - 1,
      Math.max(0, Math.round(seconds * fps)),
    )
    seekTo(frame)
    setSelectedClipId(null)
  }

  const startClipDrag = (
    e: React.PointerEvent<HTMLDivElement>,
    clipId: string,
    startFrame: number,
    startTrackIndex: number,
  ) => {
    if (e.button !== 0) return
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    setSelectedClipId(clipId)
    dragRef.current = {
      clipId,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      startFrame,
      startTrackIndex,
    }
  }

  const trackIndexFromPointerY = (clientY: number) => {
    const el = trackAreaRef.current
    if (!el) return null
    const rect = el.getBoundingClientRect()
    const y = clientY - rect.top - RULER_HEIGHT
    const row = Math.floor(y / TRACK_HEIGHT)
    if (row < 0 || row >= timelineTracks.length) return null
    return timelineTracks[row].index
  }

  const handleClipDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== e.pointerId) return
    const deltaFrames = Math.round(
      ((e.clientX - drag.startX) / PX_PER_SECOND) * fps,
    )
    const nextTrackIndex =
      trackIndexFromPointerY(e.clientY) ?? drag.startTrackIndex

    if (deltaFrames === 0 && nextTrackIndex === drag.startTrackIndex) return
    updateClip(drag.clipId, {
      startFrame: Math.max(0, drag.startFrame + deltaFrames),
      trackIndex: nextTrackIndex,
    })
  }

  const endClipDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== e.pointerId) return
    dragRef.current = null
  }

  const toggleTrackVisibility = (trackIndex: number) => {
    const trackClips = clips.filter(
      (clip) => clip.trackIndex === trackIndex && clip.type !== 'audio',
    )
    const shouldShow = !trackClips.some((clip) => clip.visible !== false)
    trackClips.forEach((clip) => updateClip(clip.id, { visible: shouldShow }))
  }

  const toggleTrackMute = (trackIndex: number) => {
    const trackClips = clips.filter(
      (clip) =>
        clip.trackIndex === trackIndex &&
        (clip.type === 'video' || clip.type === 'audio'),
    )
    const shouldUnmute = trackClips.every((clip) => clip.muted)
    trackClips.forEach((clip) => updateClip(clip.id, { muted: !shouldUnmute }))
  }

  const tickCount = Math.max(1, Math.ceil(totalSeconds))

  return (
    <div className="relative h-40 shrink-0 border-t border-border bg-background">
      <div
        className="absolute left-0 top-0 z-20 border-r border-border bg-background"
        style={{ width: TRACK_HEADER_WIDTH }}
      >
        <div
          className="border-b border-border bg-secondary/40"
          style={{ height: RULER_HEIGHT }}
        />
        {timelineTracks.map((track) => {
          const trackClips = clips.filter(
            (clip) => clip.trackIndex === track.index,
          )
          const visualClips = trackClips.filter((clip) => clip.type !== 'audio')
          const audibleClips = trackClips.filter(
            (clip) => clip.type === 'video' || clip.type === 'audio',
          )
          const isVisible =
            visualClips.length > 0 &&
            visualClips.some((clip) => clip.visible !== false)
          const isMuted =
            audibleClips.length > 0 && audibleClips.every((clip) => clip.muted)

          return (
            <div
              key={track.index}
              className="grid grid-cols-[2rem_1.75rem_1.75rem] items-center gap-1 border-b border-border/60 px-2 text-muted-foreground"
              style={{ height: TRACK_HEIGHT }}
            >
              <span className="text-center font-mono text-xs tabular-nums">
                {track.index + 1}
              </span>

              <TimelineIconButton
                label={isVisible ? 'Hide layer' : 'Show layer'}
                disabled={visualClips.length === 0}
                onClick={() => toggleTrackVisibility(track.index)}
              >
                {isVisible ? (
                  <Eye className="h-3.5 w-3.5" />
                ) : (
                  <EyeOff className="h-3.5 w-3.5" />
                )}
              </TimelineIconButton>

              <TimelineIconButton
                label={isMuted ? 'Unmute layer' : 'Mute layer'}
                disabled={audibleClips.length === 0}
                onClick={() => toggleTrackMute(track.index)}
              >
                {isMuted ? (
                  <VolumeX className="h-3.5 w-3.5" />
                ) : (
                  <Volume2 className="h-3.5 w-3.5" />
                )}
              </TimelineIconButton>
            </div>
          )
        })}
      </div>

      <div
        ref={trackAreaRef}
        onClick={handleSeek}
        className="relative h-full cursor-pointer overflow-x-auto overflow-y-hidden"
        style={{ paddingLeft: TRACK_HEADER_WIDTH }}
      >
        <div
          className="relative h-full min-w-full"
          style={{ width: Math.max(trackWidth, 1) }}
        >
          {/* Ruler */}
          <div className="sticky top-0 h-6 border-b border-border bg-secondary/40">
            <div className="relative h-full">
              {Array.from({ length: tickCount + 1 }).map((_, i) => (
                <div
                  key={i}
                  className="absolute top-0 h-full border-l border-border"
                  style={{ left: i * PX_PER_SECOND }}
                >
                  <span className="absolute left-1 top-1/2 -translate-y-1/2 font-mono text-[10px] text-muted-foreground">
                    {`00:${String(i).padStart(2, '0')}`}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Tracks */}
          <div className="relative">
            {timelineTracks.map((track) => (
              <div
                key={track.index}
                className="relative border-b border-border/60"
                style={{ height: TRACK_HEIGHT }}
              >
                {clips
                  .filter((c) => c.trackIndex === track.index)
                  .map((clip) => {
                    const left = (clip.startFrame / fps) * PX_PER_SECOND
                    const width = (clip.durationInFrames / fps) * PX_PER_SECOND
                    const color =
                      clip.type === 'video'
                        ? 'bg-editor-selection-fill border-editor-selection-border'
                        : clip.type === 'audio'
                          ? 'bg-secondary border-border'
                          : 'bg-muted border-border'
                    const isSelected = selectedClipId === clip.id
                    const isHidden = clip.visible === false
                    return (
                      <div
                        key={clip.id}
                        onPointerDown={(e) =>
                          startClipDrag(
                            e,
                            clip.id,
                            clip.startFrame,
                            clip.trackIndex,
                          )
                        }
                        onPointerMove={handleClipDrag}
                        onPointerUp={endClipDrag}
                        onPointerCancel={endClipDrag}
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedClipId(clip.id)
                        }}
                        className={`absolute top-1 bottom-1 touch-none select-none overflow-hidden rounded-sm border px-1.5 text-[10px] text-foreground shadow-sm ${
                          isHidden ? 'opacity-45' : ''
                        } ${color} ${
                          isSelected ? 'ring-2 ring-editor-selection ring-offset-1 ring-offset-background' : ''
                        }`}
                        style={{ left, width }}
                        title={clip.name}
                      >
                        <span className="block truncate leading-9">
                          {clip.name}
                        </span>
                      </div>
                    )
                  })}
              </div>
            ))}
          </div>

          {/* Playhead */}
          <div
            className="pointer-events-none absolute top-0 bottom-0 z-10 w-px bg-editor-selection"
            style={{ left: playheadLeft }}
          >
            <div className="absolute -left-1.5 -top-1 h-3 w-3 rotate-45 bg-editor-selection" />
          </div>
        </div>
      </div>
    </div>
  )
}

function TimelineIconButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string
  disabled: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label={label}
          disabled={disabled}
          onClick={(e) => {
            e.stopPropagation()
            onClick()
          }}
          className="text-muted-foreground hover:text-foreground"
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}
