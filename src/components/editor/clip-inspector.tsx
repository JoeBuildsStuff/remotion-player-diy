import {
  useMemo,
  useState,
} from 'react'
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
import { ScrollArea } from '@/components/ui/scroll-area'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
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

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

function dbToVolumePercent(db: number) {
  if (db <= -60) return 0
  return clamp(10 ** (db / 20) * 100, 0, 100)
}

function volumePercentToDb(percent: number) {
  if (percent <= 0) return -60
  return 20 * Math.log10(clamp(percent, 0, 100) / 100)
}

const MIN_CLIP_SIZE = 20

type CropSide = 'left' | 'top' | 'right' | 'bottom'

function cropMaxForSide(clip: Clip, side: CropSide) {
  if (side === 'left') {
    return Math.max(0, clip.width + clip.cropLeft - MIN_CLIP_SIZE)
  }
  if (side === 'right') {
    return Math.max(0, clip.width + clip.cropRight - MIN_CLIP_SIZE)
  }
  if (side === 'top') {
    return Math.max(0, clip.height + clip.cropTop - MIN_CLIP_SIZE)
  }

  return Math.max(0, clip.height + clip.cropBottom - MIN_CLIP_SIZE)
}

function cropPatchForSide(
  clip: Clip,
  side: CropSide,
  value: number,
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
  const nextCropValue = clamp(
    Math.round(value),
    0,
    cropMaxForSide(clip, side),
  )
  let nextWidth = clip.width
  let nextHeight = clip.height
  let nextCropLeft = clip.cropLeft
  let nextCropTop = clip.cropTop
  let nextCropRight = clip.cropRight
  let nextCropBottom = clip.cropBottom

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

  const resizeFromCropChange = (currentCrop: number, targetCrop: number) => {
    const delta = currentCrop - targetCrop

    return {
      sizeDelta: delta,
      crop: targetCrop,
    }
  }

  if (side === 'left') {
    const next = resizeFromCropChange(clip.cropLeft, nextCropValue)
    nextWidth = clip.width + next.sizeDelta
    nextCropLeft = next.crop
  }

  if (side === 'right') {
    const next = resizeFromCropChange(clip.cropRight, nextCropValue)
    nextWidth = clip.width + next.sizeDelta
    nextCropRight = next.crop
  }

  if (side === 'top') {
    const next = resizeFromCropChange(clip.cropTop, nextCropValue)
    nextHeight = clip.height + next.sizeDelta
    nextCropTop = next.crop
  }

  if (side === 'bottom') {
    const next = resizeFromCropChange(clip.cropBottom, nextCropValue)
    nextHeight = clip.height + next.sizeDelta
    nextCropBottom = next.crop
  }

  const anchor = anchoredPosition(
    side === 'left' ? 1 : side === 'right' ? 0 : 0.5,
    side === 'top' ? 1 : side === 'bottom' ? 0 : 0.5,
    nextWidth,
    nextHeight,
  )

  return {
    x: Math.round(anchor.x),
    y: Math.round(anchor.y),
    width: Math.round(nextWidth),
    height: Math.round(nextHeight),
    cropLeft: Math.round(nextCropLeft),
    cropTop: Math.round(nextCropTop),
    cropRight: Math.round(nextCropRight),
    cropBottom: Math.round(nextCropBottom),
  }
}

type Props = {
  clip: Clip
}

export function ClipInspector({ clip }: Props) {
  const {
    fps,
    width: canvasWidth,
    height: canvasHeight,
    updateClip,
  } = useEditor()
  const fakeBytes = 63 * 1024 * 1024
  const [lockAspectRatio, setLockAspectRatio] = useState(false)

  const horizontalAlignment = useMemo(() => {
    if (clip.x === 0) return 'left'
    if (Math.round(clip.x) === Math.round((canvasWidth - clip.width) / 2)) {
      return 'center-h'
    }
    if (Math.round(clip.x) === canvasWidth - clip.width) return 'right'
    return undefined
  }, [canvasWidth, clip.width, clip.x])

  const verticalAlignment = useMemo(() => {
    if (clip.y === 0) return 'top'
    if (Math.round(clip.y) === Math.round((canvasHeight - clip.height) / 2)) {
      return 'center-v'
    }
    if (Math.round(clip.y) === canvasHeight - clip.height) return 'bottom'
    return undefined
  }, [canvasHeight, clip.height, clip.y])

  const toNumber = (value: string) => {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }

  const secondsToFrames = (seconds: number) => Math.round(seconds * fps)
  const framesToSeconds = (frames: number) => frames / fps

  const alignHorizontally = (value: string) => {
    if (!value) return
    if (value === 'left') updateClip(clip.id, { x: 0 })
    if (value === 'center-h') {
      updateClip(clip.id, { x: Math.round((canvasWidth - clip.width) / 2) })
    }
    if (value === 'right') updateClip(clip.id, { x: canvasWidth - clip.width })
  }

  const alignVertically = (value: string) => {
    if (!value) return
    if (value === 'top') updateClip(clip.id, { y: 0 })
    if (value === 'center-v') {
      updateClip(clip.id, { y: Math.round((canvasHeight - clip.height) / 2) })
    }
    if (value === 'bottom') updateClip(clip.id, { y: canvasHeight - clip.height })
  }

  const handleWidthChange = (value: string) => {
    const nextWidth = toNumber(value)
    if (nextWidth == null || nextWidth <= 0) return
    if (!lockAspectRatio || clip.width === 0) {
      updateClip(clip.id, { width: nextWidth })
      return
    }
    const nextHeight = Math.max(
      1,
      Math.round((nextWidth / clip.width) * clip.height),
    )
    updateClip(clip.id, { width: nextWidth, height: nextHeight })
  }

  const handleHeightChange = (value: string) => {
    const nextHeight = toNumber(value)
    if (nextHeight == null || nextHeight <= 0) return
    if (!lockAspectRatio || clip.height === 0) {
      updateClip(clip.id, { height: nextHeight })
      return
    }
    const nextWidth = Math.max(
      1,
      Math.round((nextHeight / clip.height) * clip.width),
    )
    updateClip(clip.id, { width: nextWidth, height: nextHeight })
  }

  const handleTrimBeforeChange = (seconds: number) => {
    const nextTrimBefore = clamp(
      secondsToFrames(seconds),
      0,
      Math.max(0, clip.sourceDurationInFrames - 1),
    )
    const nextTrimAfter =
      clip.trimAfterFrames != null && clip.trimAfterFrames <= nextTrimBefore
        ? nextTrimBefore + 1
        : clip.trimAfterFrames
    updateClip(clip.id, {
      trimBeforeFrames: nextTrimBefore,
      trimAfterFrames: nextTrimAfter,
    })
  }

  const handleTrimAfterChange = (seconds: number) => {
    const nextTrimAfter = seconds <= 0
      ? null
      : clamp(
          secondsToFrames(seconds),
          clip.trimBeforeFrames + 1,
          clip.sourceDurationInFrames,
        )
    updateClip(clip.id, { trimAfterFrames: nextTrimAfter })
  }

  return (
    <aside className="flex w-72 shrink-0 flex-col overflow-hidden border-l">
      <ScrollArea className="min-h-0 w-full flex-1 overflow-hidden [&>[data-radix-scroll-area-viewport]>div]:!block [&>[data-radix-scroll-area-viewport]>div]:!w-full">
        <Accordion
          type="multiple"
          defaultValue={['source', 'timing', 'layout', 'fill', 'crop', 'video', 'audio']}
          className="min-w-0 rounded-none border-0"
        >
          <Section value="source" title="Source">
            <div className="min-w-0 space-y-1">
              <p className="w-full min-w-0 truncate text-xs text-foreground" title={clip.name}>
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

        <Section value="timing" title="Timing">
          <div className="space-y-3">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Timeline</Label>
              <div className="flex gap-1.5">
                <InputGroup className="flex-1">
                  <InputGroupAddon>
                    <InputGroupText>Start</InputGroupText>
                  </InputGroupAddon>
                  <InputGroupInput
                    type="number"
                    min={0}
                    step={0.1}
                    value={framesToSeconds(clip.startFrame).toFixed(1)}
                    onChange={(e) => {
                      const n = toNumber(e.target.value)
                      if (n == null) return
                      updateClip(clip.id, {
                        startFrame: Math.max(0, secondsToFrames(n)),
                      })
                    }}
                  />
                  <InputGroupAddon>
                    <InputGroupText>s</InputGroupText>
                  </InputGroupAddon>
                </InputGroup>
                <InputGroup className="flex-1">
                  <InputGroupAddon>
                    <InputGroupText>Length</InputGroupText>
                  </InputGroupAddon>
                  <InputGroupInput
                    type="number"
                    min={1 / fps}
                    step={0.1}
                    value={framesToSeconds(clip.durationInFrames).toFixed(1)}
                    onChange={(e) => {
                      const n = toNumber(e.target.value)
                      if (n == null) return
                      updateClip(clip.id, {
                        durationInFrames: Math.max(1, secondsToFrames(n)),
                      })
                    }}
                  />
                  <InputGroupAddon>
                    <InputGroupText>s</InputGroupText>
                  </InputGroupAddon>
                </InputGroup>
              </div>
            </div>

            {(clip.type === 'video' || clip.type === 'audio') && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Source Trim</Label>
                <div className="flex gap-1.5">
                  <InputGroup className="flex-1">
                    <InputGroupAddon>
                      <InputGroupText>In</InputGroupText>
                    </InputGroupAddon>
                    <InputGroupInput
                      type="number"
                      min={0}
                      step={0.1}
                      value={framesToSeconds(clip.trimBeforeFrames).toFixed(1)}
                      onChange={(e) => {
                        const n = toNumber(e.target.value)
                        if (n == null) return
                        handleTrimBeforeChange(n)
                      }}
                    />
                    <InputGroupAddon>
                      <InputGroupText>s</InputGroupText>
                    </InputGroupAddon>
                  </InputGroup>
                  <InputGroup className="flex-1">
                    <InputGroupAddon>
                      <InputGroupText>Out</InputGroupText>
                    </InputGroupAddon>
                    <InputGroupInput
                      type="number"
                      min={0}
                      step={0.1}
                      value={
                        clip.trimAfterFrames == null
                          ? '0.0'
                          : framesToSeconds(clip.trimAfterFrames).toFixed(1)
                      }
                      onChange={(e) => {
                        const n = toNumber(e.target.value)
                        if (n == null) return
                        handleTrimAfterChange(n)
                      }}
                    />
                    <InputGroupAddon>
                      <InputGroupText>s</InputGroupText>
                    </InputGroupAddon>
                  </InputGroup>
                </div>
              </div>
            )}
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
                  value={horizontalAlignment ?? ''}
                  onValueChange={alignHorizontally}
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
                  value={verticalAlignment ?? ''}
                  onValueChange={alignVertically}
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
                  <InputGroupInput
                    type="number"
                    value={String(clip.x)}
                    onChange={(e) => {
                      const n = toNumber(e.target.value)
                      if (n == null) return
                      updateClip(clip.id, { x: n })
                    }}
                  />
                </InputGroup>
                <InputGroup className="flex-1">
                  <InputGroupAddon>
                    <InputGroupText>Y</InputGroupText>
                  </InputGroupAddon>
                  <InputGroupInput
                    type="number"
                    value={String(clip.y)}
                    onChange={(e) => {
                      const n = toNumber(e.target.value)
                      if (n == null) return
                      updateClip(clip.id, { y: n })
                    }}
                  />
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
                  <InputGroupInput
                    type="number"
                    min={1}
                    value={String(clip.width)}
                    onChange={(e) => handleWidthChange(e.target.value)}
                  />
                </InputGroup>
                <InputGroup className="flex-1">
                  <InputGroupAddon>
                    <InputGroupText>H</InputGroupText>
                  </InputGroupAddon>
                  <InputGroupInput
                    type="number"
                    min={1}
                    value={String(clip.height)}
                    onChange={(e) => handleHeightChange(e.target.value)}
                  />
                </InputGroup>
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0"
                  aria-pressed={lockAspectRatio}
                  onClick={() => setLockAspectRatio((prev) => !prev)}
                >
                  <Link2
                    className={`h-3.5 w-3.5 ${
                      lockAspectRatio ? 'text-foreground' : 'text-muted-foreground'
                    }`}
                  />
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
                  <InputGroupInput
                    type="number"
                    value={String(clip.rotation)}
                    onChange={(e) => {
                      const n = toNumber(e.target.value)
                      if (n == null) return
                      updateClip(clip.id, { rotation: n })
                    }}
                  />
                </InputGroup>
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0"
                  onClick={() =>
                    updateClip(clip.id, {
                      rotation: (clip.rotation + 90) % 360,
                    })
                  }
                >
                  <RotateCw className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </Section>

        <Section value="fill" title="Fill">
          <div className="space-y-3">
            <SliderRow
              label="Opacity"
              value={Math.round(clip.opacity * 100)}
              suffix="%"
              max={100}
              onChange={(v) => updateClip(clip.id, { opacity: v / 100 })}
            />
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Corner Radius</Label>
              <InputGroup className="flex-1">
                <InputGroupAddon>
                  <Squircle className="h-3 w-3 text-muted-foreground" />
                </InputGroupAddon>
                <InputGroupInput
                  type="number"
                  min={0}
                  value={String(clip.borderRadius)}
                  onChange={(e) => {
                    const n = toNumber(e.target.value)
                    if (n == null) return
                    updateClip(clip.id, { borderRadius: Math.max(0, n) })
                  }}
                />
              </InputGroup>
            </div>
          </div>
        </Section>

        <Section value="crop" title="Crop">
          <div className="space-y-3">
            <SliderRow
              label="Left"
              value={clip.cropLeft}
              suffix="px"
              max={cropMaxForSide(clip, 'left')}
              onChange={(v) =>
                updateClip(clip.id, cropPatchForSide(clip, 'left', v))
              }
            />
            <SliderRow
              label="Top"
              value={clip.cropTop}
              suffix="px"
              max={cropMaxForSide(clip, 'top')}
              onChange={(v) =>
                updateClip(clip.id, cropPatchForSide(clip, 'top', v))
              }
            />
            <SliderRow
              label="Right"
              value={clip.cropRight}
              suffix="px"
              max={cropMaxForSide(clip, 'right')}
              onChange={(v) =>
                updateClip(clip.id, cropPatchForSide(clip, 'right', v))
              }
            />
            <SliderRow
              label="Bottom"
              value={clip.cropBottom}
              suffix="px"
              max={cropMaxForSide(clip, 'bottom')}
              onChange={(v) =>
                updateClip(clip.id, cropPatchForSide(clip, 'bottom', v))
              }
            />
          </div>
        </Section>

        {clip.type === 'video' && (
          <Section value="video" title="Video">
            <div className="space-y-3">
              <SliderRow
                label="Playback Rate"
                value={clip.playbackRate}
                min={0.25}
                max={4}
                step={0.05}
                format={(v) => `${v.toFixed(2)}x`}
                onChange={(v) => updateClip(clip.id, { playbackRate: v })}
              />
              <SliderRow
                label="Fade In"
                value={framesToSeconds(clip.videoFadeInFrames)}
                max={5}
                step={0.1}
                format={(v) => `${v.toFixed(1)}s`}
                onChange={(v) =>
                  updateClip(clip.id, { videoFadeInFrames: secondsToFrames(v) })
                }
              />
              <SliderRow
                label="Fade Out"
                value={framesToSeconds(clip.videoFadeOutFrames)}
                max={5}
                step={0.1}
                format={(v) => `${v.toFixed(1)}s`}
                onChange={(v) =>
                  updateClip(clip.id, { videoFadeOutFrames: secondsToFrames(v) })
                }
              />
            </div>
          </Section>
        )}

        {(clip.type === 'video' || clip.type === 'audio') && (
          <Section value="audio" title="Audio">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <Label className="text-xs text-muted-foreground">Muted</Label>
                <Switch
                  checked={clip.muted}
                  onCheckedChange={(muted) => updateClip(clip.id, { muted })}
                />
              </div>
              <SliderRow
                label="Volume"
                value={dbToVolumePercent(clip.volumeDb)}
                max={100}
                step={1}
                format={(v) => `${Math.round(v)}%`}
                onChange={(v) =>
                  updateClip(clip.id, { volumeDb: volumePercentToDb(v) })
                }
              />
              <SliderRow
                label="Fade In"
                value={framesToSeconds(clip.audioFadeInFrames)}
                max={5}
                step={0.1}
                format={(v) => `${v.toFixed(1)}s`}
                onChange={(v) =>
                  updateClip(clip.id, { audioFadeInFrames: secondsToFrames(v) })
                }
              />
              <SliderRow
                label="Fade Out"
                value={framesToSeconds(clip.audioFadeOutFrames)}
                max={5}
                step={0.1}
                format={(v) => `${v.toFixed(1)}s`}
                onChange={(v) =>
                  updateClip(clip.id, { audioFadeOutFrames: secondsToFrames(v) })
                }
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
      </ScrollArea>
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
      className={`min-w-0 border-muted-foreground/20 data-open:bg-transparent ${last ? 'border-b' : ''}`}
    >
      <AccordionTrigger className="text-xs font-semibold text-foreground hover:no-underline">
        {title}
      </AccordionTrigger>
      <AccordionContent className="min-w-0 px-1">{children}</AccordionContent>
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
