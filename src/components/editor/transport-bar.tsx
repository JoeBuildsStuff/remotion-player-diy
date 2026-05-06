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

import { useEditor } from './editor-context'

function formatFrame(frame: number, fps: number) {
  const totalSeconds = frame / fps
  const m = Math.floor(totalSeconds / 60)
  const s = Math.floor(totalSeconds % 60)
  const cs = Math.floor((totalSeconds * 100) % 100)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`
}

export function TransportBar() {
  const {
    fps,
    currentFrame,
    durationInFrames,
    isPlaying,
    volume,
    togglePlay,
    seekTo,
    setVolume,
  } = useEditor()

  return (
    <div className="flex h-9 shrink-0 items-center justify-between gap-2 border-t px-2">
      <ButtonGroup>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              aria-label="Split"
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
              variant="outline"
              size="icon"
              aria-label="Loop"
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
          <Minus className="h-3 w-3 text-muted-foreground" />
          <Slider
            value={[Math.round(volume * 100)]}
            onValueChange={(v) => setVolume((v[0] ?? 0) / 100)}
            max={100}
            step={1}
            className="w-24"
          />
          <Plus className="h-3 w-3 text-muted-foreground" />
        </div>
      </ButtonGroup>
    </div>
  )
}
