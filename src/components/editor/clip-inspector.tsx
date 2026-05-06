import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignStartHorizontal,
  AlignStartVertical,
  Cloud,
  DraftingCompass,
  Link2,
  RotateCw,
  Squircle,
} from 'lucide-react'

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

import { useEditor } from './editor-context'
import type { Clip } from './types'
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from '../ui/input-group'

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
    <aside className="flex w-72 shrink-0 flex-col overflow-y-auto border-l">
      <Accordion
        type="multiple"
        defaultValue={['source', 'layout', 'fill', 'crop', 'video', 'audio']}
        className="rounded-none border-0"
      >
        <Section value="source" title="Source">
          <div className="space-y-1">
            <p className="truncate text-xs text-foreground" title={clip.name}>
              {clip.name}
            </p>
            <p className="font-mono text-xs text-muted-foreground">
              {formatClipDuration(clip.durationInFrames, fps)}
            </p>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Cloud className="h-3.5 w-3.5" />
              {formatBytes(fakeBytes)}
            </p>
          </div>
        </Section>

        <Section value="layout" title="Layout">
          <div className="space-y-3">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Alignment</Label>
              <div className="flex gap-1.5">
                <ToggleGroup
                  type="single"
                  variant="outline"
                  className="flex-1"
                >
                  <ToggleGroupItem
                    value="left"
                    className="flex-1"
                  >
                    <AlignStartVertical className="h-4 w-4" />
                  </ToggleGroupItem>
                  <ToggleGroupItem
                    value="center-h"
                    className="flex-1"
                  >
                    <AlignCenterVertical className="h-4 w-4" />
                  </ToggleGroupItem>
                  <ToggleGroupItem
                    value="right"
                    className="flex-1"
                  >
                    <AlignEndVertical className="h-4 w-4" />
                  </ToggleGroupItem>
                </ToggleGroup>
                <ToggleGroup
                  type="single"
                  variant="outline"
                  className="flex-1"
                >
                  <ToggleGroupItem
                    value="top"
                    className="flex-1"
                  >
                    <AlignStartHorizontal className="h-4 w-4" />
                  </ToggleGroupItem>
                  <ToggleGroupItem
                    value="center-v"
                    className="flex-1"
                  >
                    <AlignCenterHorizontal className="h-4 w-4" />
                  </ToggleGroupItem>
                  <ToggleGroupItem
                    value="bottom"
                    className="flex-1"
                  >
                    <AlignEndHorizontal className="h-4 w-4" />
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Position</Label>
              <div className="flex gap-1.5">
                <InputGroup className="flex-1">
                  <InputGroupAddon>
                    <InputGroupText>X</InputGroupText>
                  </InputGroupAddon>
                  <InputGroupInput defaultValue="0" />
                </InputGroup>
                <InputGroup className="flex-1">
                  <InputGroupAddon>
                    <InputGroupText>Y</InputGroupText>
                  </InputGroupAddon>
                  <InputGroupInput defaultValue="556" />
                </InputGroup>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Dimensions</Label>
              <div className="flex items-center gap-1.5">
                <InputGroup className="flex-1">
                  <InputGroupAddon>
                    <InputGroupText>W</InputGroupText>
                  </InputGroupAddon>
                  <InputGroupInput defaultValue={String(width)} />
                </InputGroup>
                <InputGroup className="flex-1">
                  <InputGroupAddon>
                    <InputGroupText>H</InputGroupText>
                  </InputGroupAddon>
                  <InputGroupInput defaultValue={String(height)} />
                </InputGroup>
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0"
                >
                  <Link2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Rotation</Label>
              <div className="flex items-center gap-1.5">
                <InputGroup className="flex-1">
                  <InputGroupAddon>
                    <DraftingCompass className="h-3 w-3 text-muted-foreground" />
                  </InputGroupAddon>
                  <InputGroupInput defaultValue="0" />
                </InputGroup>
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0"
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
              <Label className="text-xs text-muted-foreground">Corner Radius</Label>
              <InputGroup className="flex-1">
                <InputGroupAddon>
                  <Squircle className="h-3 w-3 text-muted-foreground" />
                </InputGroupAddon>
                <InputGroupInput defaultValue="0" />
              </InputGroup>
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
            <p className="text-xs text-muted-foreground">No captions yet.</p>
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
      className={`border-muted-foreground/20 data-open:bg-transparent ${last ? 'border-b' : ''}`}
    >
      <AccordionTrigger className="text-xs font-semibold text-foreground hover:no-underline">
        {title}
      </AccordionTrigger>
      <AccordionContent className="px-1">{children}</AccordionContent>
    </AccordionItem>
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
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="flex items-center gap-3">
        <Slider
          defaultValue={[value]}
          min={min}
          max={max}
          step={step}
          className="flex-1"
        />
        <span className="w-12 shrink-0 text-right font-mono text-xs text-muted-foreground">
          {display}
        </span>
      </div>
    </div>
  )
}
