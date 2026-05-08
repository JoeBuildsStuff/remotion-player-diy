import { useMemo, useState } from 'react'
import {
  RectangleHorizontal,
  RectangleVertical,
  RotateCw,
  Square,
} from 'lucide-react'

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
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { ExportSettings } from '../model/editor-context-value'
import { RenderDialog } from '../toolbar/render-dialog'
import type { Clip } from '../model/editor-types'
import { SliderRow } from './inspector-controls'

function formatDuration(frames: number, fps: number) {
  const totalSeconds = frames / fps
  const m = Math.floor(totalSeconds / 60)
  const s = Math.floor(totalSeconds % 60)
  const cs = Math.floor((totalSeconds * 100) % 100)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`
}

const CANVAS_SIZE_PRESETS = [
  {
    label: 'Social',
    options: [
      { id: 'youtube', name: 'YouTube', size: '1920 x 1080', ratio: '16:9', width: 1920, height: 1080 },
      { id: 'youtube-shorts', name: 'YouTube Shorts', size: '1080 x 1920', ratio: '9:16', width: 1080, height: 1920 },
      { id: 'tiktok', name: 'TikTok', size: '1080 x 1920', ratio: '9:16', width: 1080, height: 1920 },
      { id: 'instagram-story-reels', name: 'Instagram Story & Reels', size: '1080 x 1920', ratio: '9:16', width: 1080, height: 1920 },
      { id: 'instagram-square', name: 'Instagram Post Square', size: '1080 x 1080', ratio: '1:1', width: 1080, height: 1080 },
      { id: 'instagram-post', name: 'Instagram Post', size: '1080 x 1350', ratio: '4:5', width: 1080, height: 1350 },
      { id: 'spotify-canvas', name: 'Spotify Canvas', size: '1080 x 1920', ratio: '9:16', width: 1080, height: 1920 },
      { id: 'facebook-story', name: 'Facebook Story', size: '1080 x 1920', ratio: '9:16', width: 1080, height: 1920 },
      { id: 'snapchat-story', name: 'Snapchat Story', size: '1080 x 1920', ratio: '9:16', width: 1080, height: 1920 },
    ],
  },
  {
    label: 'Common',
    options: [
      { id: 'widescreen', name: 'Widescreen', size: '1920 x 1080', ratio: '16:9', width: 1920, height: 1080 },
      { id: 'full-portrait', name: 'Full Portrait', size: '1080 x 1920', ratio: '9:16', width: 1080, height: 1920 },
      { id: 'square', name: 'Square', size: '1080 x 1080', ratio: '1:1', width: 1080, height: 1080 },
      { id: 'landscape', name: 'Landscape', size: '1440 x 1080', ratio: '4:3', width: 1440, height: 1080 },
      { id: 'portrait', name: 'Portrait', size: '1080 x 1350', ratio: '4:5', width: 1080, height: 1350 },
      { id: 'landscape-post', name: 'Landscape Post', size: '1350 x 1080', ratio: '5:4', width: 1350, height: 1080 },
      { id: 'vertical', name: 'Vertical', size: '1080 x 1620', ratio: '2:3', width: 1080, height: 1620 },
      { id: 'ultrawide', name: 'Ultrawide', size: '2560 x 1080', ratio: '21:9', width: 2560, height: 1080 },
    ],
  },
]

const CANVAS_SIZE_OPTIONS = CANVAS_SIZE_PRESETS.flatMap(
  (group) => group.options,
)

function CanvasPresetIcon({ width, height }: { width: number; height: number }) {
  if (width === height) return <Square className="size-3.5 text-muted-foreground" />
  if (width > height) {
    return <RectangleHorizontal className="size-3.5 text-muted-foreground" />
  }
  return <RectangleVertical className="size-3.5 text-muted-foreground" />
}

export function CanvasInspector({
  width,
  height,
  durationInFrames,
  fps,
  clips,
  exportSettings,
  setExportSettings,
  setWidth,
  setHeight,
}: {
  width: number
  height: number
  durationInFrames: number
  fps: number
  clips: Clip[]
  exportSettings: ExportSettings
  setExportSettings: (settings: ExportSettings) => void
  setWidth: (value: number) => void
  setHeight: (value: number) => void
}) {
  const [selectedCanvasPresetId, setSelectedCanvasPresetId] = useState('custom')
  const [renderOpen, setRenderOpen] = useState(false)

  const updateExportSetting = <K extends keyof ExportSettings>(
    key: K,
    value: ExportSettings[K],
  ) => {
    setExportSettings({ ...exportSettings, [key]: value })
  }

  const selectedCanvasPreset = useMemo(() => {
    const selected = CANVAS_SIZE_OPTIONS.find(
      (option) => option.id === selectedCanvasPresetId,
    )

    if (selected?.width === width && selected.height === height) {
      return selected
    }

    return CANVAS_SIZE_OPTIONS.find(
      (option) => option.width === width && option.height === height,
    )
  }, [height, selectedCanvasPresetId, width])

  return (
    <aside className="flex w-72 shrink-0 flex-col gap-4 border-l p-3">
      <section className="space-y-2">
        <Label className="">Canvas</Label>
        <Select
          value={selectedCanvasPreset?.id ?? 'custom'}
          onValueChange={(value) => {
            if (value === 'custom') return

            const preset = CANVAS_SIZE_OPTIONS.find(
              (option) => option.id === value,
            )
            if (!preset) return

            setSelectedCanvasPresetId(preset.id)
            setWidth(preset.width)
            setHeight(preset.height)
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select size">
              {selectedCanvasPreset ? (
                <span className="flex min-w-0 items-center gap-1.5">
                  <CanvasPresetIcon
                    width={selectedCanvasPreset.width}
                    height={selectedCanvasPreset.height}
                  />
                  <span className="truncate">{selectedCanvasPreset.name}</span>
                  <span className="shrink-0 text-muted-foreground">
                    {selectedCanvasPreset.ratio}
                  </span>
                </span>
              ) : (
                <span className="text-muted-foreground">Custom</span>
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent
            position="popper"
            align="end"
            className="w-80 max-w-[calc(100vw-1rem)]"
          >
            <SelectItem value="custom">Custom</SelectItem>
            <SelectSeparator />
            {CANVAS_SIZE_PRESETS.map((group, groupIndex) => (
              <SelectGroup key={group.label}>
                <SelectLabel>{group.label}</SelectLabel>
                {group.options.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    <span className="flex min-w-0 flex-1 items-center gap-2 pr-5">
                      <CanvasPresetIcon
                        width={option.width}
                        height={option.height}
                      />
                      <span className="min-w-0 flex-1 truncate">
                        {option.name}
                      </span>
                      <span className="shrink-0 text-muted-foreground">
                        {option.size} · {option.ratio}
                      </span>
                    </span>
                  </SelectItem>
                ))}
                {groupIndex < CANVAS_SIZE_PRESETS.length - 1 ? (
                  <SelectSeparator />
                ) : null}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1.5">
          <InputGroup className="flex-1">
            <InputGroupAddon>
              <InputGroupText>W</InputGroupText>
            </InputGroupAddon>
            <InputGroupInput
              value={width}
              onChange={(e) => {
                setSelectedCanvasPresetId('custom')
                setWidth(Number(e.target.value) || 0)
              }}
            />
          </InputGroup>
          <InputGroup className="flex-1">
            <InputGroupAddon>
              <InputGroupText>H</InputGroupText>
            </InputGroupAddon>
            <InputGroupInput
              value={height}
              onChange={(e) => {
                setSelectedCanvasPresetId('custom')
                setHeight(Number(e.target.value) || 0)
              }}
            />
          </InputGroup>
          <Button
            variant="ghost"
            onClick={() => {
              setSelectedCanvasPresetId('custom')
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
            {clips.map((clip) => (
              <li
                key={clip.id}
                className="truncate rounded bg-secondary/40 px-2 py-1 text-xs text-foreground"
                title={clip.name}
              >
                {clip.name}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-2 w-full">
        <Label className="">Export</Label>
        <Select value="mp4">
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="mp4">MP4 (H.264)</SelectItem>
          </SelectContent>
        </Select>
        <div className="space-y-3 rounded-md border border-border bg-secondary/20 p-2">
          <SliderRow
            label="Resolution"
            value={exportSettings.resolutionScale}
            min={25}
            max={100}
            step={25}
            suffix="%"
            onChange={(value) => updateExportSetting('resolutionScale', value)}
          />
          <SliderRow
            label="Quality"
            value={exportSettings.quality}
            min={1}
            max={100}
            step={1}
            suffix="%"
            onChange={(value) => updateExportSetting('quality', value)}
          />
          <SliderRow
            label="Audio"
            value={exportSettings.audioBitrateKbps}
            min={64}
            max={320}
            step={32}
            suffix="K"
            onChange={(value) => updateExportSetting('audioBitrateKbps', value)}
          />
        </div>
        <Button
          disabled={clips.length === 0}
          onClick={() => setRenderOpen(true)}
          size="default"
          variant="secondary"
          className="w-full"
        >
          Render video
        </Button>
      </section>

      <RenderDialog open={renderOpen} onOpenChange={setRenderOpen} />
    </aside>
  )
}
