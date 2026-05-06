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
import { Slider } from '@/components/ui/slider'

import { useEditor } from './editor-context'
import { ToolbarIconButton } from './toolbar-primitives'

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
    <div className="flex h-9 shrink-0 items-center justify-between gap-2 border-t border-zinc-800 bg-zinc-900 px-2">
      <div className="flex items-center gap-1">
        <ToolbarIconButton label="Split">
          <Scissors className="h-4 w-4" />
        </ToolbarIconButton>
        <ToolbarIconButton label="Snap" active>
          <Magnet className="h-4 w-4 text-blue-400" />
        </ToolbarIconButton>
      </div>

      <div className="flex items-center gap-3">
        <span className="font-mono text-xs tabular-nums text-zinc-400">
          {formatFrame(currentFrame, fps)}
        </span>
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => seekTo(0)}
            className="h-7 w-7 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-50"
          >
            <SkipBack className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={togglePlay}
            className="h-7 w-7 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-50"
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
            className="h-7 w-7 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-50"
          >
            <SkipForward className="h-4 w-4" />
          </Button>
        </div>
        <span className="font-mono text-xs tabular-nums text-zinc-400">
          {formatFrame(durationInFrames, fps)}
        </span>
      </div>

      <div className="flex items-center gap-1">
        <ToolbarIconButton label="Loop">
          <Repeat className="h-4 w-4" />
        </ToolbarIconButton>
        <ToolbarIconButton label="Volume">
          <Volume2 className="h-4 w-4" />
        </ToolbarIconButton>
        <ToolbarIconButton label="Fullscreen">
          <Maximize className="h-4 w-4" />
        </ToolbarIconButton>
        <div className="ml-1 flex items-center gap-1.5">
          <Minus className="h-3 w-3 text-zinc-400" />
          <Slider
            value={[Math.round(volume * 100)]}
            onValueChange={(v) => setVolume((v[0] ?? 0) / 100)}
            max={100}
            step={1}
            className="w-24"
          />
          <Plus className="h-3 w-3 text-zinc-400" />
        </div>
      </div>
    </div>
  )
}
