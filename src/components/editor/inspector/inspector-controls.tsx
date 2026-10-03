import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Slider } from '@/components/ui/slider'
import type { LucideIcon } from 'lucide-react'
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'

import {
  PaletteColorPickerPanel,
  colorSwatchStyle,
  colorValueLabel,
} from './palette-color-picker'

export function Section({
  value,
  title,
  icon: Icon,
  headerAction,
  children,
  onTriggerClick,
}: {
  value: string
  title: string
  icon?: LucideIcon
  headerAction?: React.ReactNode
  children: React.ReactNode
  last?: boolean
  onTriggerClick?: (value: string) => void
}) {
  return (
    <AccordionItem
      value={value}
      className="min-w-0 border-0 not-last:border-b-0 data-open:bg-transparent"
    >
      <AccordionTrigger
        onClick={() => onTriggerClick?.(value)}
        className={`mx-2 my-px min-h-7 items-center overflow-hidden rounded-[calc(var(--radius-sm)+2px)] px-2 py-1.5 text-xs font-semibold text-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:no-underline group-data-[collapsible=icon]:size-7! group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-1.5! group-data-[collapsible=icon]:**:data-section-label:hidden group-data-[collapsible=icon]:**:data-[slot=accordion-trigger-icon]:hidden${
          headerAction ? ' gap-1' : ''
        }`}
      >
        <span className="flex min-w-0 flex-1 items-center gap-2">
          {Icon ? <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /> : null}
          <span data-section-label className="truncate">{title}</span>
        </span>
        {headerAction ? (
          <div
            className="flex shrink-0 items-center gap-0.5 group-data-[collapsible=icon]:hidden"
            onClick={(event) => event.stopPropagation()}
            onPointerDown={(event) => event.stopPropagation()}
          >
            {headerAction}
          </div>
        ) : null}
      </AccordionTrigger>
      <AccordionContent className="min-w-0 px-3 pt-1 group-data-[collapsible=icon]:hidden">{children}</AccordionContent>
    </AccordionItem>
  )
}

export function ColorInput({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="space-y-2">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="flex items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className="h-8 w-10 p-1"
              aria-label={`Choose ${label.toLowerCase()}`}
            >
              <span
                className="h-full w-full rounded-sm border border-border/80"
                style={colorSwatchStyle(value)}
              />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-auto gap-0 p-3">
            <PaletteColorPickerPanel value={value} onChange={onChange} />
          </PopoverContent>
        </Popover>
        <code className="truncate rounded bg-secondary/80 px-2 py-1 font-mono text-[11px] text-muted-foreground">
          {colorValueLabel(value)}
        </code>
      </div>
    </div>
  )
}

export function SliderRow({
  label,
  value,
  min = 0,
  max = 100,
  step = 1,
  suffix,
  format,
  onChange,
}: {
  label: string
  value: number
  min?: number
  max?: number
  step?: number
  suffix?: string
  format?: (v: number) => string
  onChange?: (v: number) => void
}) {
  const display = format ? format(value) : `${value}${suffix ?? ''}`
  return (
    <div className="space-y-2">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="flex items-center gap-3">
        <Slider
          value={[value]}
          min={min}
          max={max}
          step={step}
          className="flex-1"
          onValueChange={(next) => {
            const n = next[0]
            if (n == null) return
            onChange?.(n)
          }}
        />
        <span className="w-12 shrink-0 text-right font-mono text-xs text-muted-foreground">
          {display}
        </span>
      </div>
    </div>
  )
}
