import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignStartHorizontal,
  AlignStartVertical,
  Cloud,
  Link2,
  RotateCw,
  Squircle,
  Triangle,
} from 'lucide-react'

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

import { useEditor } from './editor-context'
import type { Clip } from './types'

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(0)} MB`
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`
}

function formatClipDuration(frames: number, fps: number): string {
  const totalSeconds = frames / fps
  const m = Math.floor(totalSeconds / 60)
  const s = Math.floor(totalSeconds % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

type Props = {
  clip: Clip
}

export function ClipInspector({ clip }: Props) {
  const { fps, width, height } = useEditor()
  const fakeBytes = 63 * 1024 * 1024

  return (
    <aside className="flex w-72 shrink-0 flex-col overflow-y-auto border-l border-zinc-800 bg-zinc-900">
      <Accordion
        type="multiple"
        defaultValue={['source', 'layout', 'fill', 'crop', 'video', 'audio']}
        className="rounded-none border-0"
      >
        <Section value="source" title="Source">
          <div className="space-y-1">
            <p className="truncate text-xs text-zinc-300" title={clip.name}>
              {clip.name}
            </p>
            <p className="font-mono text-xs text-zinc-400">
              {formatClipDuration(clip.durationInFrames, fps)}
            </p>
            <p className="flex items-center gap-1.5 text-xs text-zinc-400">
              <Cloud className="h-3.5 w-3.5" />
              {formatBytes(fakeBytes)}
            </p>
          </div>
        </Section>

        <Section value="layout" title="Layout">
          <div className="space-y-3">
            <div className="space-y-2">
              <Label className="text-xs text-zinc-400">Alignment</Label>
              <div className="flex gap-1.5">
                <ToggleGroup
                  type="single"
                  className="flex-1 rounded-md bg-zinc-800/80 p-0.5"
                >
                  <ToggleGroupItem
                    value="left"
                    className="h-7 flex-1 text-zinc-300 data-[state=on]:bg-zinc-700 data-[state=on]:text-zinc-50"
                  >
                    <AlignStartVertical className="h-4 w-4" />
                  </ToggleGroupItem>
                  <ToggleGroupItem
                    value="center-h"
                    className="h-7 flex-1 text-zinc-300 data-[state=on]:bg-zinc-700 data-[state=on]:text-zinc-50"
                  >
                    <AlignCenterVertical className="h-4 w-4" />
                  </ToggleGroupItem>
                  <ToggleGroupItem
                    value="right"
                    className="h-7 flex-1 text-zinc-300 data-[state=on]:bg-zinc-700 data-[state=on]:text-zinc-50"
                  >
                    <AlignEndVertical className="h-4 w-4" />
                  </ToggleGroupItem>
                </ToggleGroup>
                <ToggleGroup
                  type="single"
                  className="flex-1 rounded-md bg-zinc-800/80 p-0.5"
                >
                  <ToggleGroupItem
                    value="top"
                    className="h-7 flex-1 text-zinc-300 data-[state=on]:bg-zinc-700 data-[state=on]:text-zinc-50"
                  >
                    <AlignStartHorizontal className="h-4 w-4" />
                  </ToggleGroupItem>
                  <ToggleGroupItem
                    value="center-v"
                    className="h-7 flex-1 text-zinc-300 data-[state=on]:bg-zinc-700 data-[state=on]:text-zinc-50"
                  >
                    <AlignCenterHorizontal className="h-4 w-4" />
                  </ToggleGroupItem>
                  <ToggleGroupItem
                    value="bottom"
                    className="h-7 flex-1 text-zinc-300 data-[state=on]:bg-zinc-700 data-[state=on]:text-zinc-50"
                  >
                    <AlignEndHorizontal className="h-4 w-4" />
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-zinc-400">Position</Label>
              <div className="flex gap-1.5">
                <PrefixedInput prefix="X" defaultValue="0" />
                <PrefixedInput prefix="Y" defaultValue="556" />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-zinc-400">Dimensions</Label>
              <div className="flex items-center gap-1.5">
                <PrefixedInput prefix="W" defaultValue={String(width)} />
                <PrefixedInput prefix="H" defaultValue={String(height)} />
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 shrink-0 border-zinc-700 bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 hover:text-blue-300"
                >
                  <Link2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-zinc-400">Rotation</Label>
              <div className="flex items-center gap-1.5">
                <PrefixedInput
                  prefix={
                    <Triangle className="h-3 w-3 -rotate-90 fill-zinc-500 text-zinc-500" />
                  }
                  defaultValue="0"
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 shrink-0 border-zinc-700 bg-zinc-800 text-zinc-200 hover:bg-zinc-700 hover:text-zinc-50"
                >
                  <RotateCw className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </Section>

        <Section value="fill" title="Fill">
          <div className="space-y-3">
            <SliderRow label="Opacity" value={100} suffix="%" max={100} />
            <div className="space-y-2">
              <Label className="text-xs text-zinc-400">Corner Radius</Label>
              <PrefixedInput
                prefix={<Squircle className="h-3 w-3 text-zinc-500" />}
                defaultValue="0"
              />
            </div>
          </div>
        </Section>

        <Section value="crop" title="Crop">
          <div className="space-y-3">
            <SliderRow label="Left" value={0} suffix="px" max={500} />
            <SliderRow label="Top" value={0} suffix="px" max={500} />
            <SliderRow label="Right" value={0} suffix="px" max={500} />
            <SliderRow label="Bottom" value={0} suffix="px" max={500} />
          </div>
        </Section>

        {clip.type === 'video' && (
          <Section value="video" title="Video">
            <div className="space-y-3">
              <SliderRow
                label="Playback Rate"
                value={1}
                min={0.25}
                max={4}
                step={0.05}
                format={(v) => `${v.toFixed(2)}x`}
              />
              <SliderRow
                label="Fade In"
                value={0}
                max={5}
                step={0.1}
                format={(v) => `${v.toFixed(1)}s`}
              />
              <SliderRow
                label="Fade Out"
                value={0}
                max={5}
                step={0.1}
                format={(v) => `${v.toFixed(1)}s`}
              />
            </div>
          </Section>
        )}

        {(clip.type === 'video' || clip.type === 'audio') && (
          <Section value="audio" title="Audio">
            <div className="space-y-3">
              <SliderRow
                label="Volume"
                value={0}
                min={-60}
                max={12}
                step={0.1}
                format={(v) => `${v.toFixed(1)} dB`}
              />
              <SliderRow
                label="Fade In"
                value={0}
                max={5}
                step={0.1}
                format={(v) => `${v.toFixed(1)}s`}
              />
              <SliderRow
                label="Fade Out"
                value={0}
                max={5}
                step={0.1}
                format={(v) => `${v.toFixed(1)}s`}
              />
            </div>
          </Section>
        )}

        {clip.type === 'video' && (
          <Section value="captions" title="Captions" last>
            <p className="text-xs text-zinc-500">No captions yet.</p>
          </Section>
        )}
      </Accordion>
    </aside>
  )
}

function Section({
  value,
  title,
  children,
  last,
}: {
  value: string
  title: string
  children: React.ReactNode
  last?: boolean
}) {
  return (
    <AccordionItem
      value={value}
      className={`border-zinc-800 data-open:bg-transparent ${last ? 'border-b' : ''}`}
    >
      <AccordionTrigger className="px-3 text-xs font-semibold text-zinc-100 hover:no-underline">
        {title}
      </AccordionTrigger>
      <AccordionContent className="px-3">{children}</AccordionContent>
    </AccordionItem>
  )
}

function PrefixedInput({
  prefix,
  defaultValue,
}: {
  prefix: React.ReactNode
  defaultValue: string
}) {
  return (
    <div className="relative flex-1">
      <span className="pointer-events-none absolute left-2.5 top-1/2 flex -translate-y-1/2 items-center text-xs text-zinc-500">
        {prefix}
      </span>
      <Input
        defaultValue={defaultValue}
        className="h-7 border-zinc-700 bg-zinc-800 pl-6 text-xs text-zinc-100"
      />
    </div>
  )
}

function SliderRow({
  label,
  value,
  min = 0,
  max = 100,
  step = 1,
  suffix,
  format,
}: {
  label: string
  value: number
  min?: number
  max?: number
  step?: number
  suffix?: string
  format?: (v: number) => string
}) {
  const display = format ? format(value) : `${value}${suffix ?? ''}`
  return (
    <div className="space-y-2">
      <Label className="text-xs text-zinc-400">{label}</Label>
      <div className="flex items-center gap-3">
        <Slider
          defaultValue={[value]}
          min={min}
          max={max}
          step={step}
          className="flex-1"
        />
        <span className="w-12 shrink-0 text-right font-mono text-xs text-zinc-400">
          {display}
        </span>
      </div>
    </div>
  )
}
