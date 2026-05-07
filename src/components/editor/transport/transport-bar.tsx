import {
  Magnet,
  Maximize,
  Minus,
  Pause,
  Play,
  Plus,
  Repeat,
  Scissors,
  SkipBack,
  SkipForward,
  Trash,
  Volume2,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import { Slider } from '@/components/ui/slider'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

import { useEditor } from '../model/editor-context-value'
import { formatFrame } from './transport-time'

export function TransportBar() {
  const {
    fps,
    currentFrame,
    durationInFrames,
    isPlaying,
    isLooping,
    timelineZoom,
    clips,
    selectedClipId,
    setSelectedClipId,
    togglePlay,
    seekTo,
    setIsLooping,
    setTimelineZoom,
    zoomTimelineIn,
    zoomTimelineOut,
    splitClip,
    removeClip,
  } = useEditor()

  const selectedClip = clips.find((c) => c.id === selectedClipId) ?? null
  const canSplit =
    selectedClip != null &&
    currentFrame > selectedClip.startFrame &&
    currentFrame < selectedClip.startFrame + selectedClip.durationInFrames

  const handleSplit = () => {
    if (!selectedClip || !canSplit) return
    splitClip(selectedClip.id, currentFrame)
    setSelectedClipId(null)
  }

  const handleDeleteSelected = () => {
    if (!selectedClip) return
    removeClip(selectedClip.id)
  }

  return (
    <div className="flex h-9 shrink-0 items-center justify-between gap-2 border-t px-2">
      <ButtonGroup>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              aria-label="Split"
              disabled={!canSplit}
              onClick={handleSplit}
            >
              <Scissors className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Split</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              aria-label="Snap"
            >
              <Magnet className="h-4 w-4 text-editor-selection-border" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Snap</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              aria-label="Delete selected item"
              disabled={!selectedClip}
              onClick={handleDeleteSelected}
            >
              <Trash className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Delete selected item</TooltipContent>
        </Tooltip>
      </ButtonGroup>

      <div className="flex items-center gap-3">
        <span className="font-mono text-xs tabular-nums text-muted-foreground">
          {formatFrame(currentFrame, fps)}
        </span>
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => seekTo(0)}
            className=""
          >
            <SkipBack className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={togglePlay}
            className=""
          >
            {isPlaying ? (
              <Pause className="h-4 w-4 fill-current" />
            ) : (
              <Play className="h-4 w-4 fill-current" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => seekTo(Math.max(0, durationInFrames - 1))}
            className=""
          >
            <SkipForward className="h-4 w-4" />
          </Button>
        </div>
        <span className="font-mono text-xs tabular-nums text-muted-foreground">
          {formatFrame(durationInFrames, fps)}
        </span>
      </div>

      <ButtonGroup>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={isLooping ? 'secondary' : 'outline'}
              size="icon"
              aria-label="Loop"
              aria-pressed={isLooping}
              onClick={() => setIsLooping(!isLooping)}
              className="h-7 w-7"
            >
              <Repeat className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Loop</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              aria-label="Volume"
              className="h-7 w-7"
            >
              <Volume2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Volume</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              aria-label="Fullscreen"
              className="h-7 w-7"
            >
              <Maximize className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Fullscreen</TooltipContent>
        </Tooltip>
        <div className="ml-4 flex items-center gap-1.5">
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label="Timeline zoom out"
            disabled={timelineZoom <= 0.5}
            onClick={zoomTimelineOut}
            className="text-muted-foreground"
          >
            <Minus className="h-3 w-3" />
          </Button>
          <Slider
            aria-label="Timeline zoom"
            value={[Math.round(timelineZoom * 100)]}
            onValueChange={(v) => setTimelineZoom((v[0] ?? 100) / 100)}
            min={50}
            max={400}
            step={1}
            className="w-24"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label="Timeline zoom in"
            disabled={timelineZoom >= 4}
            onClick={zoomTimelineIn}
            className="text-muted-foreground"
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      </ButtonGroup>
    </div>
  )
}
