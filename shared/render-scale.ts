export interface NormalizeRenderScaleInput {
  width: number
  height: number
  requestedPercent: number
}

export interface NormalizeRenderScaleResult {
  requestedPercent: number
  percent: number
  scale: number
  outputWidth: number
  outputHeight: number
  adjusted: boolean
}

const MIN_SCALE_PERCENT = 25
const MAX_SCALE_PERCENT = 400

/**
 * Finds a scale percentage that keeps output dimensions integer + even
 * (required by h264) for a given composition width/height.
 */
export function normalizeRenderScalePercent(
  input: NormalizeRenderScaleInput,
): NormalizeRenderScaleResult {
  const requestedPercent = clampPercent(Math.round(input.requestedPercent))
  const direct = dimsFor(input.width, input.height, requestedPercent)
  if (direct) {
    return {
      requestedPercent,
      percent: requestedPercent,
      scale: requestedPercent / 100,
      outputWidth: direct.width,
      outputHeight: direct.height,
      adjusted: false,
    }
  }

  let bestPercent: number | null = null
  let bestDistance = Number.POSITIVE_INFINITY
  for (let percent = MIN_SCALE_PERCENT; percent <= MAX_SCALE_PERCENT; percent++) {
    const dims = dimsFor(input.width, input.height, percent)
    if (!dims) continue
    const distance = Math.abs(percent - requestedPercent)
    if (
      distance < bestDistance ||
      (distance === bestDistance &&
        bestPercent !== null &&
        percent > bestPercent)
    ) {
      bestDistance = distance
      bestPercent = percent
    }
  }

  const percent = bestPercent ?? 100
  const dims = dimsFor(input.width, input.height, percent) ?? {
    width: ensureEven(Math.max(2, Math.round(input.width * (percent / 100)))),
    height: ensureEven(Math.max(2, Math.round(input.height * (percent / 100)))),
  }

  return {
    requestedPercent,
    percent,
    scale: percent / 100,
    outputWidth: dims.width,
    outputHeight: dims.height,
    adjusted: percent !== requestedPercent,
  }
}

function dimsFor(
  width: number,
  height: number,
  percent: number,
): { width: number; height: number } | null {
  const scaledWidth = (width * percent) / 100
  const scaledHeight = (height * percent) / 100
  if (!Number.isInteger(scaledWidth) || !Number.isInteger(scaledHeight)) {
    return null
  }
  if (scaledWidth % 2 !== 0 || scaledHeight % 2 !== 0) {
    return null
  }
  return { width: scaledWidth, height: scaledHeight }
}

function ensureEven(value: number): number {
  return value % 2 === 0 ? value : value + 1
}

function clampPercent(value: number): number {
  return Math.min(MAX_SCALE_PERCENT, Math.max(MIN_SCALE_PERCENT, value))
}
