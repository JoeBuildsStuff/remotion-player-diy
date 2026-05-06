import { RotateCw } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import { useEditor } from './editor-context'

function formatDuration(frames: number, fps: number) {
  const totalSeconds = frames / fps
  const m = Math.floor(totalSeconds / 60)
  const s = Math.floor(totalSeconds % 60)
  const cs = Math.floor((totalSeconds * 100) % 100)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`
}

export function Inspector() {
  const { width, height, setWidth, setHeight, durationInFrames, fps, clips } =
    useEditor()

  return (
    <aside className="flex w-72 shrink-0 flex-col gap-4 border-l border-zinc-800 bg-zinc-900 p-3">
      <section className="space-y-2">
        <Label className="text-xs font-semibold text-zinc-100">Canvas</Label>
        <div className="flex items-center gap-1.5">
          <div className="relative flex-1">
            <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-zinc-500">
              W
            </span>
            <Input
              value={width}
              onChange={(e) => setWidth(Number(e.target.value) || 0)}
              className="h-8 border-zinc-700 bg-zinc-800 pl-6 text-xs text-zinc-100"
            />
          </div>
          <div className="relative flex-1">
            <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-zinc-500">
              H
            </span>
            <Input
              value={height}
              onChange={(e) => setHeight(Number(e.target.value) || 0)}
              className="h-8 border-zinc-700 bg-zinc-800 pl-6 text-xs text-zinc-100"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              setWidth(height)
              setHeight(width)
            }}
            className="h-8 w-8 border-zinc-700 bg-zinc-800 text-zinc-200 hover:bg-zinc-700 hover:text-zinc-50"
          >
            <RotateCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </section>

      <section className="space-y-1">
        <Label className="text-xs font-semibold text-zinc-100">Duration</Label>
        <p className="font-mono text-xs text-zinc-400">
          {formatDuration(durationInFrames, fps)}
        </p>
      </section>

      <section className="space-y-2">
        <Label className="text-xs font-semibold text-zinc-100">Clips</Label>
        {clips.length === 0 ? (
          <p className="text-xs text-zinc-500">No media yet.</p>
        ) : (
          <ul className="space-y-1">
            {clips.map((c) => (
              <li
                key={c.id}
                className="truncate rounded bg-zinc-800/60 px-2 py-1 text-xs text-zinc-300"
                title={c.name}
              >
                {c.name}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <Label className="text-xs font-semibold text-zinc-100">Export</Label>
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
  )
}
