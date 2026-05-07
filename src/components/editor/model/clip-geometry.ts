export type ClipLayout = {
  x: number
  y: number
  width: number
  height: number
}

export function fitWithinCanvas(
  mediaWidth: number | null,
  mediaHeight: number | null,
  canvasWidth: number,
  canvasHeight: number,
): ClipLayout {
  if (!mediaWidth || !mediaHeight) {
    return {
      x: 0,
      y: 0,
      width: canvasWidth,
      height: canvasHeight,
    }
  }

  const scale = Math.min(canvasWidth / mediaWidth, canvasHeight / mediaHeight)
  const width = Math.max(1, Math.round(mediaWidth * scale))
  const height = Math.max(1, Math.round(mediaHeight * scale))

  return {
    x: Math.round((canvasWidth - width) / 2),
    y: Math.round((canvasHeight - height) / 2),
    width,
    height,
  }
}
