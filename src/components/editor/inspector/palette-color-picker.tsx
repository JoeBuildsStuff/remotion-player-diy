import { useEffect, useState, type CSSProperties } from 'react'
import { HexColorPicker } from 'react-colorful'
import { ChevronLeftIcon, ChevronsUpDownIcon, PipetteIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  TRANSPARENT_COLOR,
  checkerboardStyle,
  hexToHsv,
  hexToRgb,
  hsvToHex,
  normalizeHex,
  rgbToHex,
} from '@/lib/color'
import {
  TAILWIND_COLOR_NAMES,
  TAILWIND_COLORS,
  TAILWIND_SHADES,
} from '@/lib/tailwind-colors'
import { cn } from '@/lib/utils'

type ColorFormat = 'hex' | 'rgb'
type PickerView = 'presets' | 'custom'

export { TRANSPARENT_COLOR }

const RAINBOW_GRADIENT =
  'conic-gradient(from 0deg, #ef4444, #f59e0b, #eab308, #22c55e, #06b6d4, #3b82f6, #8b5cf6, #ec4899, #ef4444)'

export const CHECKERBOARD_SWATCH_STYLE: CSSProperties = checkerboardStyle()

function HueSlider({
  hue,
  onChange,
}: {
  hue: number
  onChange: (hue: number) => void
}) {
  return (
    <input
      type="range"
      min={0}
      max={360}
      step={1}
      value={hue}
      aria-label="Hue"
      onChange={(e) => onChange(Number(e.target.value))}
      className={cn(
        'h-3 w-full cursor-pointer appearance-none rounded-full',
        'bg-[linear-gradient(to_right,#f00_0%,#ff0_17%,#0f0_33%,#0ff_50%,#00f_67%,#f0f_83%,#f00_100%)]',
        '[&::-webkit-slider-thumb]:size-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full',
        '[&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white',
        '[&::-webkit-slider-thumb]:bg-(--thumb-color)',
        '[&::-moz-range-thumb]:size-3.5 [&::-moz-range-thumb]:rounded-full',
        '[&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white',
        '[&::-moz-range-thumb]:bg-(--thumb-color)',
      )}
      style={
        {
          '--thumb-color': `hsl(${hue} 100% 50%)`,
        } as CSSProperties
      }
    />
  )
}

function SwatchButton({
  label,
  color,
  selected,
  onSelect,
  className,
  style,
}: {
  label: string
  color?: string
  selected?: boolean
  onSelect: () => void
  className?: string
  style?: CSSProperties
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onSelect}
      className={cn(
        'size-4 shrink-0 rounded-sm border border-border transition-[outline]',
        'hover:scale-110 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
        selected && 'ring-2 ring-ring ring-offset-1 ring-offset-popover',
        className,
      )}
      style={color ? { backgroundColor: color, ...style } : style}
    />
  )
}

function TailwindColorGrid({
  value,
  onChange,
  onOpenCustom,
}: {
  value: string
  onChange: (value: string) => void
  onOpenCustom: () => void
}) {
  const isNone = value === TRANSPARENT_COLOR
  const hex = isNone ? '' : (normalizeHex(value)?.toLowerCase() ?? '')

  return (
    <div className="flex w-[260px] flex-col gap-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <SwatchButton
          label="Custom color"
          selected={false}
          onSelect={onOpenCustom}
          className="size-5"
          style={{ background: RAINBOW_GRADIENT }}
        />
        <SwatchButton
          label="White"
          color="#ffffff"
          selected={hex === '#ffffff'}
          onSelect={() => onChange('#ffffff')}
          className="size-5"
        />
        <SwatchButton
          label="Black"
          color="#000000"
          selected={hex === '#000000'}
          onSelect={() => onChange('#000000')}
          className="size-5"
        />
        <SwatchButton
          label="Transparent"
          selected={isNone}
          onSelect={() => onChange(TRANSPARENT_COLOR)}
          className="size-5"
          style={CHECKERBOARD_SWATCH_STYLE}
        />
      </div>

      <div className="flex max-h-[280px] flex-col gap-1 overflow-y-auto pr-0.5">
        {TAILWIND_COLOR_NAMES.map((name) => (
          <div key={name} className="flex items-center gap-1">
            <span className="w-12 shrink-0 truncate text-[10px] text-muted-foreground capitalize">
              {name}
            </span>
            <div className="flex gap-0.5">
              {TAILWIND_SHADES.map((shade) => {
                const color = TAILWIND_COLORS[name][shade]
                return (
                  <SwatchButton
                    key={shade}
                    label={`${name}-${shade}`}
                    color={color}
                    selected={hex === color}
                    onSelect={() => onChange(color)}
                    className="size-3.5 rounded-[3px]"
                  />
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ColorPickerPanel({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  const hex = normalizeHex(value) ?? '#000000'
  const rgb = hexToRgb(hex) ?? { r: 0, g: 0, b: 0 }
  const hsv = hexToHsv(hex) ?? { h: 0, s: 0, v: 0 }
  const [format, setFormat] = useState<ColorFormat>('rgb')
  const [hexDraft, setHexDraft] = useState(hex)
  const supportsEyeDropper =
    typeof window !== 'undefined' && 'EyeDropper' in window

  useEffect(() => {
    setHexDraft(hex)
  }, [hex])

  function setFromHue(h: number) {
    onChange(hsvToHex(h, hsv.s, hsv.v))
  }

  function setRgbChannel(channel: 'r' | 'g' | 'b', raw: string) {
    const n = Number(raw)
    if (!Number.isFinite(n)) return
    onChange(
      rgbToHex(
        channel === 'r' ? n : rgb.r,
        channel === 'g' ? n : rgb.g,
        channel === 'b' ? n : rgb.b,
      ),
    )
  }

  async function pickFromScreen() {
    if (!supportsEyeDropper) return
    try {
      const EyeDropperCtor = (
        window as unknown as {
          EyeDropper: new () => { open: () => Promise<{ sRGBHex: string }> }
        }
      ).EyeDropper
      const result = await new EyeDropperCtor().open()
      const next = normalizeHex(result.sRGBHex)
      if (next) onChange(next)
    } catch {
      // User cancelled the eyedropper.
    }
  }

  return (
    <div className="flex w-[220px] flex-col gap-3">
      <HexColorPicker
        color={hex}
        onChange={(nextColor) => {
          const next = normalizeHex(nextColor)
          if (next) onChange(next)
        }}
        className="palette-color-picker"
      />

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          disabled={!supportsEyeDropper}
          aria-label="Pick color from screen"
          title={
            supportsEyeDropper
              ? 'Pick color from screen'
              : 'Eyedropper not supported in this browser'
          }
          onClick={() => void pickFromScreen()}
        >
          <PipetteIcon />
        </Button>
        <span
          className="size-7 shrink-0 rounded-full border border-border"
          style={{ backgroundColor: hex }}
          aria-hidden
        />
        <div className="min-w-0 flex-1 px-0.5">
          <HueSlider hue={hsv.h} onChange={setFromHue} />
        </div>
      </div>

      <div className="flex items-start gap-1.5">
        {format === 'hex' ? (
          <div className="grid min-w-0 flex-1 gap-y-1">
            <Input
              value={hexDraft}
              onChange={(e) => {
                const next = e.target.value
                setHexDraft(next)
                const parsed = normalizeHex(next)
                if (parsed) onChange(parsed)
              }}
              onBlur={() => setHexDraft(hex)}
              spellCheck={false}
              aria-label="Hex"
              className="font-mono uppercase"
            />
            <span className="text-center text-[10px] text-muted-foreground">
              Hex
            </span>
          </div>
        ) : (
          <div className="grid min-w-0 flex-1 grid-cols-3 gap-x-1.5 gap-y-1">
            {(
              [
                ['r', rgb.r],
                ['g', rgb.g],
                ['b', rgb.b],
              ] as const
            ).map(([channel, channelValue]) => (
              <Input
                key={channel}
                type="number"
                min={0}
                max={255}
                value={channelValue}
                onChange={(e) => setRgbChannel(channel, e.target.value)}
                aria-label={channel.toUpperCase()}
                className="px-1 text-center tabular-nums"
              />
            ))}
            {(['r', 'g', 'b'] as const).map((channel) => (
              <span
                key={channel}
                className="text-center text-[10px] text-muted-foreground uppercase"
              >
                {channel}
              </span>
            ))}
          </div>
        )}
        <FormatSelect format={format} onChange={setFormat} />
      </div>
    </div>
  )
}

function FormatSelect({
  format,
  onChange,
}: {
  format: ColorFormat
  onChange: (format: ColorFormat) => void
}) {
  return (
    <Select value={format} onValueChange={(next) => onChange(next as ColorFormat)}>
      <SelectTrigger
        size="sm"
        aria-label="Color format"
        className="size-7! shrink-0 justify-center px-0 [&>svg:last-child]:hidden"
      >
        <ChevronsUpDownIcon className="size-3.5 opacity-70" />
        <SelectValue className="sr-only" />
      </SelectTrigger>
      <SelectContent align="end">
        <SelectGroup>
          <SelectItem value="hex">Hex</SelectItem>
          <SelectItem value="rgb">RGB</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}

export function PaletteColorPickerPanel({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  const [view, setView] = useState<PickerView>('presets')
  const hex = value === TRANSPARENT_COLOR ? null : normalizeHex(value)

  return view === 'presets' ? (
    <TailwindColorGrid
      value={value}
      onChange={onChange}
      onOpenCustom={() => setView('custom')}
    />
  ) : (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 w-fit gap-1 px-1.5 text-xs"
        onClick={() => setView('presets')}
      >
        <ChevronLeftIcon className="size-3.5" />
        Tailwind colors
      </Button>
      <ColorPickerPanel value={hex ?? '#000000'} onChange={onChange} />
    </div>
  )
}

export function colorSwatchStyle(value: string): CSSProperties {
  if (value === TRANSPARENT_COLOR) return CHECKERBOARD_SWATCH_STYLE
  return { backgroundColor: value }
}

export function colorValueLabel(value: string) {
  if (value === TRANSPARENT_COLOR) return 'none'
  return normalizeHex(value) ?? value
}
