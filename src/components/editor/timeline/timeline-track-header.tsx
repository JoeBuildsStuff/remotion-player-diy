import { Eye, EyeOff, Trash, Volume2, VolumeX } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { Clip } from '../model/editor-types'
import {
  RULER_HEIGHT,
  TRACK_HEIGHT,
  type TimelineTrackModel,
} from './timeline-geometry'

export function TimelineTrackHeaders({
  clips,
  tracks,
  onToggleTrackVisibility,
  onToggleTrackMute,
  onDeleteTrack,
}: {
  clips: Clip[]
  tracks: TimelineTrackModel[]
  onToggleTrackVisibility: (trackIndex: number) => void
  onToggleTrackMute: (trackIndex: number) => void
  onDeleteTrack: (trackIndex: number) => void
}) {
  return (
    <div className="w-fit shrink-0 self-start border-r border-border bg-background">
      <div
        className="border-b border-border bg-secondary/40"
        style={{ height: RULER_HEIGHT }}
      />
      {tracks.map((track, rowIndex) => {
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
            className="grid grid-cols-[2rem_1.75rem_1.75rem_1.75rem] items-center border-b border-border/60 px-2 text-muted-foreground"
            style={{ height: TRACK_HEIGHT }}
          >
            <span className="text-center font-mono text-xs tabular-nums">
              {tracks.length - rowIndex}
            </span>

            <TimelineIconButton
              label={isVisible ? 'Hide layer' : 'Show layer'}
              disabled={visualClips.length === 0}
              onClick={() => onToggleTrackVisibility(track.index)}
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
              onClick={() => onToggleTrackMute(track.index)}
            >
              {isMuted ? (
                <VolumeX className="h-3.5 w-3.5" />
              ) : (
                <Volume2 className="h-3.5 w-3.5" />
              )}
            </TimelineIconButton>

            <TimelineIconButton
              label="Delete row"
              disabled={trackClips.length === 0}
              onClick={() => onDeleteTrack(track.index)}
            >
              <Trash className="h-3.5 w-3.5" />
            </TimelineIconButton>
          </div>
        )
      })}
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
