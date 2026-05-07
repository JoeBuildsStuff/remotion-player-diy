import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'

export function Section({
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
      className={`min-w-0 border-muted-foreground/20 data-open:bg-transparent ${last ? 'border-b' : ''}`}
    >
      <AccordionTrigger className="text-xs font-semibold text-foreground hover:no-underline">
        {title}
      </AccordionTrigger>
      <AccordionContent className="min-w-0 px-1">{children}</AccordionContent>
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
