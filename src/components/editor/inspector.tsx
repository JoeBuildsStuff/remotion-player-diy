import { RotateCw } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from '@/components/ui/input-group'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import { ClipInspector } from './clip-inspector'
import { useEditor } from './editor-context'

function formatDuration(frames: number, fps: number) {
  const totalSeconds = frames / fps
  const m = Math.floor(totalSeconds / 60)
  const s = Math.floor(totalSeconds % 60)
  const cs = Math.floor((totalSeconds * 100) % 100)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`
}

export function Inspector() {
  const {
    width,
    height,
    setWidth,
    setHeight,
    durationInFrames,
    fps,
    clips,
    selectedClipId,
  } = useEditor()

  const selectedClip = selectedClipId
    ? clips.find((c) => c.id === selectedClipId) ?? null
    : null

  if (selectedClip) {
    return <ClipInspector clip={selectedClip} />
  }

  return (
    <aside className="flex w-72 shrink-0 flex-col gap-4 border-l p-3">
      <section className="space-y-2">
        <Label className="">Canvas</Label>
        <div className="flex items-center gap-1.5">
          <InputGroup className="flex-1">
            <InputGroupAddon>
              <InputGroupText>W</InputGroupText>
            </InputGroupAddon>
            <InputGroupInput
              value={width}
              onChange={(e) => setWidth(Number(e.target.value) || 0)}
            />
          </InputGroup>
          <InputGroup className="flex-1">
            <InputGroupAddon>
              <InputGroupText>H</InputGroupText>
            </InputGroupAddon>
            <InputGroupInput
              value={height}
              onChange={(e) => setHeight(Number(e.target.value) || 0)}
            />
          </InputGroup>
          <Button
            variant="ghost"
            onClick={() => {
              setWidth(height)
              setHeight(width)
            }}
            className="h-8 w-8"
          >
            <RotateCw className="size-3" />
          </Button>
        </div>
      </section>

      <section className="space-y-1">
        <Label className="">Duration</Label>
        <p className="font-mono text-xs text-muted-foreground">
          {formatDuration(durationInFrames, fps)}
        </p>
      </section>

      <section className="space-y-2">
        <Label className="">Clips</Label>
        {clips.length === 0 ? (
          <p className="text-xs text-muted-foreground">No media yet.</p>
        ) : (
          <ul className="space-y-1">
            {clips.map((c) => (
              <li
                key={c.id}
                className="truncate rounded bg-secondary/40 px-2 py-1 text-xs text-foreground"
                title={c.name}
              >
                {c.name}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-2 w-full">
        <Label className="">Export</Label>
        <Select defaultValue="mp4">
          <SelectTrigger className="w-full">
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
          size="default"
          variant="secondary"
          className="w-full"
        >
          Render video
        </Button>
      </section>
    </aside>
  )
}
