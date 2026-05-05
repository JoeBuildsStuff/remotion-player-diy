import {
  MousePointer2,
  Square,
  Type,
  Image as ImageIcon,
  Video,
  Music,
  Undo2,
  Redo2,
  Save,
  Download,
  Upload,
  Minus,
  Plus,
  Scissors,
  Magnet,
  SkipBack,
  SkipForward,
  Play,
  Repeat,
  Volume2,
  Maximize,
  RotateCw,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

function ToolbarIconButton({
  children,
  label,
  active,
}: {
  children: React.ReactNode
  label: string
  active?: boolean
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={
            active
              ? 'h-7 w-7 bg-zinc-700 text-zinc-50 hover:bg-zinc-700'
              : 'h-7 w-7 text-zinc-300 hover:bg-zinc-700 hover:text-zinc-50'
          }
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

function ToolbarGroup({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-0.5 rounded-md bg-zinc-800/80 p-0.5">
      {children}
    </div>
  )
}

function App() {
  return (
    <TooltipProvider>
      <div className="dark flex h-screen w-screen flex-col overflow-hidden bg-zinc-900 text-zinc-100">
      {/* Top toolbar */}
      <header className="flex h-11 shrink-0 items-center justify-between gap-2 border-b border-zinc-800 bg-zinc-900 px-2">
        <div className="flex items-center gap-1.5">
          <ToolbarGroup>
            <ToolbarIconButton label="Select" active>
              <MousePointer2 className="h-4 w-4" />
            </ToolbarIconButton>
            <ToolbarIconButton label="Rectangle">
              <Square className="h-4 w-4" />
            </ToolbarIconButton>
            <ToolbarIconButton label="Text">
              <Type className="h-4 w-4" />
            </ToolbarIconButton>
            <ToolbarIconButton label="Image">
              <ImageIcon className="h-4 w-4" />
            </ToolbarIconButton>
            <ToolbarIconButton label="Video">
              <Video className="h-4 w-4" />
            </ToolbarIconButton>
            <ToolbarIconButton label="Audio">
              <Music className="h-4 w-4" />
            </ToolbarIconButton>
          </ToolbarGroup>

          <ToolbarGroup>
            <ToolbarIconButton label="Undo">
              <Undo2 className="h-4 w-4" />
            </ToolbarIconButton>
            <ToolbarIconButton label="Redo">
              <Redo2 className="h-4 w-4" />
            </ToolbarIconButton>
          </ToolbarGroup>

          <ToolbarGroup>
            <ToolbarIconButton label="Save">
              <Save className="h-4 w-4" />
            </ToolbarIconButton>
            <ToolbarIconButton label="Import">
              <Download className="h-4 w-4" />
            </ToolbarIconButton>
            <ToolbarIconButton label="Export">
              <Upload className="h-4 w-4" />
            </ToolbarIconButton>
          </ToolbarGroup>
        </div>

        <ToolbarGroup>
          <ToolbarIconButton label="Zoom out">
            <Minus className="h-4 w-4" />
          </ToolbarIconButton>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-zinc-200 hover:bg-zinc-700 hover:text-zinc-50"
          >
            Fit
          </Button>
          <ToolbarIconButton label="Zoom in">
            <Plus className="h-4 w-4" />
          </ToolbarIconButton>
        </ToolbarGroup>
      </header>

      {/* Main area: preview + right inspector */}
      <div className="flex min-h-0 flex-1">
        {/* Preview */}
        <div className="flex flex-1 items-center justify-center bg-zinc-900 p-4">
          <div className="flex aspect-9/16 h-full max-h-full items-center justify-center rounded-md bg-black shadow-2xl">
            <p className="px-6 text-center text-sm text-zinc-500">
              Drop videos and images
              <br />
              here to get started.
            </p>
          </div>
        </div>

        {/* Right inspector */}
        <aside className="flex w-72 shrink-0 flex-col gap-4 border-l border-zinc-800 bg-zinc-900 p-3">
          <section className="space-y-2">
            <Label className="text-xs font-semibold text-zinc-100">
              Canvas
            </Label>
            <div className="flex items-center gap-1.5">
              <div className="relative flex-1">
                <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-zinc-500">
                  W
                </span>
                <Input
                  defaultValue="1080"
                  className="h-8 border-zinc-700 bg-zinc-800 pl-6 text-xs text-zinc-100"
                />
              </div>
              <div className="relative flex-1">
                <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-zinc-500">
                  H
                </span>
                <Input
                  defaultValue="1920"
                  className="h-8 border-zinc-700 bg-zinc-800 pl-6 text-xs text-zinc-100"
                />
              </div>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 border-zinc-700 bg-zinc-800 text-zinc-200 hover:bg-zinc-700 hover:text-zinc-50"
              >
                <RotateCw className="h-3.5 w-3.5" />
              </Button>
            </div>
          </section>

          <section className="space-y-1">
            <Label className="text-xs font-semibold text-zinc-100">
              Duration
            </Label>
            <p className="font-mono text-xs text-zinc-400">00:00.00</p>
          </section>

          <section className="space-y-2">
            <Label className="text-xs font-semibold text-zinc-100">
              Export
            </Label>
            <Select defaultValue="mp4">
              <SelectTrigger className="h-8 border-zinc-700 bg-zinc-800 text-xs text-zinc-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mp4">MP4 (H.264)</SelectItem>
                <SelectItem value="webm">WebM (VP9)</SelectItem>
                <SelectItem value="mov">MOV (ProRes)</SelectItem>
                <SelectItem value="gif">GIF</SelectItem>
              </SelectContent>
            </Select>
            <Button
              disabled
              size="sm"
              className="h-8 w-full bg-zinc-800 text-xs text-zinc-500 hover:bg-zinc-800"
            >
              Render video
            </Button>
          </section>
        </aside>
      </div>

      {/* Transport bar */}
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
            00:00.00
          </span>
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-50"
            >
              <SkipBack className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-50"
            >
              <Play className="h-4 w-4 fill-current" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-50"
            >
              <SkipForward className="h-4 w-4" />
            </Button>
          </div>
          <span className="font-mono text-xs tabular-nums text-zinc-400">
            00:00.00
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
              defaultValue={[40]}
              max={100}
              step={1}
              className="w-24"
            />
            <Plus className="h-3 w-3 text-zinc-400" />
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="relative h-36 shrink-0 border-t border-zinc-800 bg-zinc-950">
        {/* Ruler */}
        <div className="relative h-5 border-b border-zinc-800 bg-zinc-900">
          <div className="absolute inset-0 flex">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="relative flex-1 border-r border-zinc-800"
              >
                <span className="absolute left-1 top-0.5 font-mono text-[10px] text-zinc-500">
                  {`00:${String(i).padStart(2, '0')}`}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Tracks */}
        <div className="relative h-[calc(100%-1.25rem)] overflow-hidden">
          {/* Playhead */}
          <div className="absolute left-3 top-0 bottom-0 z-10 w-px bg-blue-500">
            <div className="absolute -left-1.5 -top-1 h-3 w-3 rotate-45 bg-blue-500" />
          </div>

          {/* Empty track lanes */}
          <div className="flex h-full flex-col">
            <div className="h-8 border-b border-zinc-800/60" />
            <div className="h-8 border-b border-zinc-800/60" />
            <div className="h-8 border-b border-zinc-800/60" />
          </div>
        </div>
      </div>
      </div>
    </TooltipProvider>
  )
}

export default App
