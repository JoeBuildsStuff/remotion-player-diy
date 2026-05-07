import type { CSSProperties } from 'react'

import type { Clip } from '../model/editor-types'

export type ResizeHandle = 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw'

export type ClipDragData = {
  clipId: string
  x: number
  y: number
  scale: number
}

export type ActiveClipDrag = ClipDragData

export const HANDLE_SIZE = 12
export const HANDLE_HIT_SIZE = 20
export const ROTATION_HANDLE_OFFSET = 28

const MIN_CLIP_SIZE = 20

export const RESIZE_HANDLES: {
  handle: ResizeHandle
  cursor: string
  x: 'left' | 'center' | 'right'
  y: 'top' | 'center' | 'bottom'
}[] = [
  { handle: 'nw', cursor: 'nwse-resize', x: 'left', y: 'top' },
  { handle: 'n', cursor: 'ns-resize', x: 'center', y: 'top' },
  { handle: 'ne', cursor: 'nesw-resize', x: 'right', y: 'top' },
  { handle: 'e', cursor: 'ew-resize', x: 'right', y: 'center' },
  { handle: 'se', cursor: 'nwse-resize', x: 'right', y: 'bottom' },
  { handle: 's', cursor: 'ns-resize', x: 'center', y: 'bottom' },
  { handle: 'sw', cursor: 'nesw-resize', x: 'left', y: 'bottom' },
  { handle: 'w', cursor: 'ew-resize', x: 'left', y: 'center' },
]

export function resizeClip(
  clip: Clip,
  handle: ResizeHandle,
  dx: number,
  dy: number,
): Pick<
  Clip,
  | 'x'
  | 'y'
  | 'width'
  | 'height'
  | 'cropLeft'
  | 'cropTop'
  | 'cropRight'
  | 'cropBottom'
> {
  const radians = (clip.rotation * Math.PI) / 180
  const cos = Math.cos(radians)
  const sin = Math.sin(radians)
  const localDx = cos * dx + sin * dy
  const localDy = -sin * dx + cos * dy

  const isCorner = handle.length === 2

  const anchoredPosition = (
    anchorXRatio: number,
    anchorYRatio: number,
    width: number,
    height: number,
  ) => {
    const oldCenterX = clip.width / 2
    const oldCenterY = clip.height / 2
    const oldAnchorX = anchorXRatio * clip.width
    const oldAnchorY = anchorYRatio * clip.height
    const oldAnchorOffsetX =
      oldCenterX +
      cos * (oldAnchorX - oldCenterX) -
      sin * (oldAnchorY - oldCenterY)
    const oldAnchorOffsetY =
      oldCenterY +
      sin * (oldAnchorX - oldCenterX) +
      cos * (oldAnchorY - oldCenterY)
    const oldAnchorScreenX = clip.x + oldAnchorOffsetX
    const oldAnchorScreenY = clip.y + oldAnchorOffsetY

    const nextCenterX = width / 2
    const nextCenterY = height / 2
    const nextAnchorX = anchorXRatio * width
    const nextAnchorY = anchorYRatio * height
    const nextAnchorOffsetX =
      nextCenterX +
      cos * (nextAnchorX - nextCenterX) -
      sin * (nextAnchorY - nextCenterY)
    const nextAnchorOffsetY =
      nextCenterY +
      sin * (nextAnchorX - nextCenterX) +
      cos * (nextAnchorY - nextCenterY)

    return {
      x: oldAnchorScreenX - nextAnchorOffsetX,
      y: oldAnchorScreenY - nextAnchorOffsetY,
    }
  }

  let nextX = clip.x
  let nextY = clip.y
  let nextWidth = clip.width
  let nextHeight = clip.height
  let nextCropLeft = clip.cropLeft
  let nextCropTop = clip.cropTop
  let nextCropRight = clip.cropRight
  let nextCropBottom = clip.cropBottom
  let hasAnchoredPosition = false

  const applyScaleFromAnchor = (
    scale: number,
    anchorXRatio: number,
    anchorYRatio: number,
  ) => {
    nextWidth *= scale
    nextHeight *= scale
    nextCropLeft *= scale
    nextCropTop *= scale
    nextCropRight *= scale
    nextCropBottom *= scale

    const anchor = anchoredPosition(
      anchorXRatio,
      anchorYRatio,
      nextWidth,
      nextHeight,
    )
    nextX = anchor.x
    nextY = anchor.y
    hasAnchoredPosition = true
  }

  const anchorWithoutScale = (anchorXRatio: number, anchorYRatio: number) => {
    if (hasAnchoredPosition) return

    const anchor = anchoredPosition(
      anchorXRatio,
      anchorYRatio,
      nextWidth,
      nextHeight,
    )
    nextX = anchor.x
    nextY = anchor.y
  }

  const resizeVerticalSide = (
    localDelta: number,
    crop: number,
    direction: 1 | -1,
    anchorYRatio: number,
  ) => {
    const signedDelta = direction * localDelta

    if (signedDelta < 0) {
      const boundedDelta = Math.max(
        -(clip.height - MIN_CLIP_SIZE),
        signedDelta,
      )
      nextHeight = clip.height + boundedDelta

      return {
        crop: crop - boundedDelta,
      }
    }

    const uncrop = Math.min(signedDelta, crop)
    const scaleDistance = signedDelta - uncrop
    nextHeight = clip.height + uncrop

    if (scaleDistance > 0) {
      applyScaleFromAnchor(1 + scaleDistance / nextHeight, 0.5, anchorYRatio)
    }

    return {
      crop: crop - uncrop,
    }
  }

  const resizeHorizontalSide = (
    localDelta: number,
    crop: number,
    direction: 1 | -1,
    anchorXRatio: number,
  ) => {
    const signedDelta = direction * localDelta

    if (signedDelta < 0) {
      const boundedDelta = Math.max(
        -(clip.width - MIN_CLIP_SIZE),
        signedDelta,
      )
      nextWidth = clip.width + boundedDelta

      return {
        crop: crop - boundedDelta,
      }
    }

    const uncrop = Math.min(signedDelta, crop)
    const scaleDistance = signedDelta - uncrop
    nextWidth = clip.width + uncrop

    if (scaleDistance > 0) {
      applyScaleFromAnchor(1 + scaleDistance / nextWidth, anchorXRatio, 0.5)
    }

    return {
      crop: crop - uncrop,
    }
  }

  if (isCorner) {
    const horizontalSign = handle.includes('e') ? 1 : -1
    const verticalSign = handle.includes('s') ? 1 : -1
    const horizontalDelta = (horizontalSign * localDx) / clip.width
    const verticalDelta = (verticalSign * localDy) / clip.height
    const scaleDelta =
      Math.abs(horizontalDelta) > Math.abs(verticalDelta)
        ? horizontalDelta
        : verticalDelta
    const nextScale = Math.max(
      MIN_CLIP_SIZE / Math.min(clip.width, clip.height),
      1 + scaleDelta,
    )

    nextWidth = clip.width * nextScale
    nextHeight = clip.height * nextScale

    const anchor = anchoredPosition(
      handle.includes('e') ? 0 : 1,
      handle.includes('s') ? 0 : 1,
      nextWidth,
      nextHeight,
    )
    nextX = anchor.x
    nextY = anchor.y

    return {
      x: Math.round(nextX),
      y: Math.round(nextY),
      width: Math.round(nextWidth),
      height: Math.round(nextHeight),
      cropLeft: Math.round(nextCropLeft),
      cropTop: Math.round(nextCropTop),
      cropRight: Math.round(nextCropRight),
      cropBottom: Math.round(nextCropBottom),
    }
  }

  if (handle === 'e' || handle === 'w') {
    if (handle === 'e') {
      nextCropRight = resizeHorizontalSide(
        localDx,
        clip.cropRight,
        1,
        0,
      ).crop
      anchorWithoutScale(0, 0.5)
    } else {
      nextCropLeft = resizeHorizontalSide(
        localDx,
        clip.cropLeft,
        -1,
        1,
      ).crop
      anchorWithoutScale(1, 0.5)
    }
  }

  if (handle.includes('s')) {
    nextCropBottom = resizeVerticalSide(localDy, clip.cropBottom, 1, 0).crop
    anchorWithoutScale(0.5, 0)
  }
  if (handle.includes('n')) {
    nextCropTop = resizeVerticalSide(localDy, clip.cropTop, -1, 1).crop
    anchorWithoutScale(0.5, 1)
  }

  return {
    x: Math.round(nextX),
    y: Math.round(nextY),
    width: Math.round(nextWidth),
    height: Math.round(nextHeight),
    cropLeft: Math.round(nextCropLeft),
    cropTop: Math.round(nextCropTop),
    cropRight: Math.round(nextCropRight),
    cropBottom: Math.round(nextCropBottom),
  }
}

export function handlePositionStyle(
  x: 'left' | 'center' | 'right',
  y: 'top' | 'center' | 'bottom',
  hitSize: number,
): CSSProperties {
  const offset = -hitSize / 2
  const style: CSSProperties = {
    position: 'absolute',
    width: hitSize,
    height: hitSize,
    background: 'transparent',
    border: 0,
    padding: 0,
  }

  if (x === 'left') style.left = offset
  if (x === 'center') {
    style.left = '50%'
    style.marginLeft = offset
  }
  if (x === 'right') style.right = offset

  if (y === 'top') style.top = offset
  if (y === 'center') {
    style.top = '50%'
    style.marginTop = offset
  }
  if (y === 'bottom') style.bottom = offset

  return style
}

export function normalizeRotation(degrees: number) {
  return Math.round(((degrees % 360) + 360) % 360)
}

export function sortOutlines(
  clips: Clip[],
  selectedClipId: string | null | undefined,
) {
  const visualClips = clips.filter(
    (clip) => clip.type !== 'audio' && clip.visible !== false,
  )
  const selectedClips = visualClips.filter((clip) => clip.id === selectedClipId)
  const unselectedClips = visualClips.filter((clip) => clip.id !== selectedClipId)

  return [...unselectedClips, ...selectedClips]
}

export function sortClipsForComposition(clips: Clip[]) {
  return [...clips].sort((a, b) => a.trackIndex - b.trackIndex)
}
