import type { CSSProperties } from "react"

/** CSS color used when the user picks the checkerboard swatch. */
export const TRANSPARENT_COLOR = "transparent"

export function checkerboardStyle(tile = 8): CSSProperties {
  const half = tile / 2
  return {
    backgroundColor: "#d4d4d8",
    backgroundImage:
      "linear-gradient(45deg,#a1a1aa 25%,transparent 25%),linear-gradient(-45deg,#a1a1aa 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#a1a1aa 75%),linear-gradient(-45deg,transparent 75%,#a1a1aa 75%)",
    backgroundSize: `${tile}px ${tile}px`,
    backgroundPosition: `0 0, 0 ${half}px, ${half}px -${half}px, -${half}px 0`,
  }
}

/** Normalize to #rrggbb lowercase, or null if invalid. */
export function normalizeHex(value: string): string | null {
  const raw = value.trim().replace(/^#/, "")
  if (/^[0-9a-fA-F]{3}$/.test(raw)) {
    const [r, g, b] = raw.split("")
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase()
  }
  if (/^[0-9a-fA-F]{6}$/.test(raw)) {
    return `#${raw.toLowerCase()}`
  }
  return null
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const n = normalizeHex(hex)
  if (!n) return null
  return {
    r: Number.parseInt(n.slice(1, 3), 16),
    g: Number.parseInt(n.slice(3, 5), 16),
    b: Number.parseInt(n.slice(5, 7), 16),
  }
}

export function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)))
  return (
    "#" +
    [clamp(r), clamp(g), clamp(b)]
      .map((n) => n.toString(16).padStart(2, "0"))
      .join("")
  )
}

export type Hsv = { h: number; s: number; v: number }

export function hexToHsv(hex: string): Hsv | null {
  const rgb = hexToRgb(hex)
  if (!rgb) return null
  const r = rgb.r / 255
  const g = rgb.g / 255
  const b = rgb.b / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const d = max - min
  let h = 0
  if (d !== 0) {
    switch (max) {
      case r:
        h = ((g - b) / d) % 6
        break
      case g:
        h = (b - r) / d + 2
        break
      default:
        h = (r - g) / d + 4
    }
    h *= 60
    if (h < 0) h += 360
  }
  const s = max === 0 ? 0 : d / max
  return { h, s, v: max }
}

export function hsvToHex(h: number, s: number, v: number): string {
  const c = v * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = v - c
  let r: number
  let g: number
  let b: number
  if (h < 60) [r, g, b] = [c, x, 0]
  else if (h < 120) [r, g, b] = [x, c, 0]
  else if (h < 180) [r, g, b] = [0, c, x]
  else if (h < 240) [r, g, b] = [0, x, c]
  else if (h < 300) [r, g, b] = [x, 0, c]
  else [r, g, b] = [c, 0, x]
  return rgbToHex((r + m) * 255, (g + m) * 255, (b + m) * 255)
}
