import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import type { LucideIcon } from 'lucide-react'
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'

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
          className={`mx-2 my-px min-h-8 overflow-hidden rounded-[calc(var(--radius-sm)+2px)] px-2 py-2 text-xs font-semibold text-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:no-underline group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-2! group-data-[collapsible=icon]:**:data-section-label:hidden group-data-[collapsible=icon]:**:data-[slot=accordion-trigger-icon]:hidden ${
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
      <AccordionContent className="min-w-0 px-3 group-data-[collapsible=icon]:hidden">{children}</AccordionContent>
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
  const normalizedValue = /^#[0-9a-fA-F]{6}$/.test(value) ? value : '#000000'

  return (
    <div className="space-y-2">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <input
        type="color"
        aria-label={label}
        value={normalizedValue}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 w-16 rounded-md border border-input bg-input/20 p-1"
      />
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
