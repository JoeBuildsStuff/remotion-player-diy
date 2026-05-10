import { Button } from '@/components/ui/button'
import {
  ColorPicker,
  ColorPickerAlpha,
  ColorPickerEyeDropper,
  ColorPickerFormat,
  ColorPickerHue,
  ColorPickerOutput,
  ColorPickerSelection,
} from '@/components/ui/color-picker'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Slider } from '@/components/ui/slider'
import type { LucideIcon } from 'lucide-react'
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'

function normalizeColorInputValue(value: string) {
  return /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(value)
    ? value.toLowerCase()
    : '#000000'
}

function toHexComponent(value: number) {
  return Math.round(value).toString(16).padStart(2, '0')
}

function rgbaArrayToColorString(color: number[]) {
  const [r = 0, g = 0, b = 0, alpha = 1] = color
  const nextAlpha = Math.max(0, Math.min(1, alpha))

  if (nextAlpha < 1) {
    return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${nextAlpha.toFixed(3)})`
  }

  return `#${toHexComponent(r)}${toHexComponent(g)}${toHexComponent(b)}`
}

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
      <div className="relative">
        <AccordionTrigger
          onClick={() => onTriggerClick?.(value)}
          className={`mx-2 my-px min-h-7 overflow-hidden rounded-[calc(var(--radius-sm)+2px)] px-2 py-1.5 text-xs font-semibold text-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:no-underline group-data-[collapsible=icon]:size-7! group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-1.5! group-data-[collapsible=icon]:**:data-section-label:hidden group-data-[collapsible=icon]:**:data-[slot=accordion-trigger-icon]:hidden ${
            headerAction
              ? 'pr-8 group-data-[collapsible=icon]:pr-2!'
              : ''
          }`}
        >
          <span className="flex min-w-0 items-center gap-2">
            {Icon ? <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /> : null}
            <span data-section-label className="truncate">{title}</span>
          </span>
        </AccordionTrigger>
        {headerAction ? (
          <div className="absolute top-1/2 right-2 z-10 -translate-y-1/2 group-data-[collapsible=icon]:hidden">
            {headerAction}
          </div>
        ) : null}
      </div>
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
  const normalizedValue = normalizeColorInputValue(value)

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
                style={{ backgroundColor: value }}
              />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-72 p-3">
            <ColorPicker
              value={value}
              defaultValue={normalizedValue}
              className="h-auto w-full"
              onChange={(nextValue) => {
                onChange(rgbaArrayToColorString(nextValue as number[]))
              }}
            >
              <ColorPickerSelection className="h-32 rounded-md" />
              <ColorPickerHue />
              <ColorPickerAlpha />
              <div className="flex items-center gap-2">
                <ColorPickerEyeDropper />
                <ColorPickerOutput />
                <ColorPickerFormat />
              </div>
            </ColorPicker>
          </PopoverContent>
        </Popover>
        <code className="truncate rounded bg-secondary/80 px-2 py-1 font-mono text-[11px] text-muted-foreground">
          {normalizedValue}
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
