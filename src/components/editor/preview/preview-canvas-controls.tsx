import { useState } from 'react'
import {
  ArrowRight,
  ArrowUpRight,
  Minus,
  Plus,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Slider } from '@/components/ui/slider'

import {
  EditorActionControls,
  EditorHistoryControls,
} from '../controls/editor-action-controls'
import { EditorSettingsMenu } from '../controls/editor-settings-menu'
import { RenderDialog } from '../controls/render-dialog'
import {
  MAX_PREVIEW_ZOOM,
  MIN_PREVIEW_ZOOM,
} from '../model/editor-constants'
import {
  useEditor,
  type ExportSettings,
} from '../model/editor-context-value'
import { RENDERING_AVAILABLE } from '../model/render-mode'
import { RULER_SIZE } from './canvas-rulers'

const SHARE_QUALITY_OPTIONS = [
  {
    value: '480',
    label: '480p',
    description: 'Standard quality',
    longEdge: 854,
    quality: 65,
    audioBitrateKbps: 128,
  },
  {
    value: '720',
    label: '720p',
    description: 'Standard quality, HD',
    longEdge: 1280,
    quality: 75,
    audioBitrateKbps: 160,
  },
  {
    value: '1080',
    label: '1080p',
    description: 'High quality, FHD',
    longEdge: 1920,
    quality: 85,
    audioBitrateKbps: 192,
  },
  {
    value: '2160',
    label: '2160p',
    description: 'High quality, 4K',
    longEdge: 3840,
    quality: 95,
    audioBitrateKbps: 256,
  },
] as const

type ShareQualityOption = (typeof SHARE_QUALITY_OPTIONS)[number]
type ShareQualityValue = ShareQualityOption['value']

const DEFAULT_SHARE_QUALITY: ShareQualityValue = '1080'
const OVERLAY_GAP = 8

function exportSettingsForShareQuality({
  currentSettings,
  height,
  option,
  width,
}: {
  currentSettings: ExportSettings
  height: number
  option: ShareQualityOption
  width: number
}): ExportSettings {
  const longEdge = Math.max(width, height)
  const resolutionScale = Math.min(
    400,
    Math.max(25, Math.round((option.longEdge / longEdge) * 100)),
  )

  return {
    ...currentSettings,
    audioBitrateKbps: option.audioBitrateKbps,
    quality: option.quality,
    resolutionScale,
  }
}

export function PreviewCanvasControls() {
  const {
    addTextClip,
    showCanvasRulers,
    toggleCanvasRulers,
  } = useEditor()

  const topOffset = showCanvasRulers
    ? `${RULER_SIZE + OVERLAY_GAP}px`
    : `${OVERLAY_GAP}px`
  const leftOffset = showCanvasRulers
    ? `${RULER_SIZE + OVERLAY_GAP}px`
    : `${OVERLAY_GAP}px`

  return (
    <>
      <div
        className="pointer-events-none absolute left-1/2 z-30 -translate-x-1/2"
        style={{ top: topOffset }}
      >
        <div className="pointer-events-auto">
          <EditorActionControls
            addTextClip={addTextClip}
            showCanvasRulers={showCanvasRulers}
            toggleCanvasRulers={toggleCanvasRulers}
          />
        </div>
      </div>

      <div
        className="pointer-events-none absolute bottom-2 z-30"
        style={{ left: leftOffset }}
      >
        <div className="pointer-events-auto flex flex-col items-start gap-2">
          <PreviewZoomControls />
        </div>
      </div>

      <div
        className="pointer-events-none absolute right-2 z-30"
        style={{ top: topOffset }}
      >
        <div className="pointer-events-auto flex items-center gap-1.5">
          <PreviewShareMenu />
          <EditorSettingsMenu />
        </div>
      </div>

      <div className="pointer-events-none absolute right-2 bottom-2 z-30">
        <div className="pointer-events-auto">
          <EditorHistoryControls />
        </div>
      </div>
    </>
  )
}

function PreviewZoomControls() {
  const {
    previewZoom,
    resetPreviewZoom,
    setPreviewZoom,
    zoomPreviewIn,
    zoomPreviewOut,
  } = useEditor()
  const zoomPercent = Math.round(previewZoom * 100)
  const minPreviewZoomPercent = Math.round(MIN_PREVIEW_ZOOM * 100)
  const maxPreviewZoomPercent = Math.round(MAX_PREVIEW_ZOOM * 100)

  return (
    <div className="flex w-28 flex-col gap-3 group">
      <Slider
        aria-label="Preview zoom"
        value={[zoomPercent]}
        min={minPreviewZoomPercent}
        max={maxPreviewZoomPercent}
        step={1}
        onValueChange={(value) => {
          const nextZoomPercent = value[0]
          if (nextZoomPercent == null) return
          setPreviewZoom(nextZoomPercent / 100)
        }}
        className="mx-[2px] w-[calc(100%-4px)] opacity-0 transition-opacity group-hover:opacity-100"
      />
      <ButtonGroup className="w-28">
        <Button
          variant="secondary"
          size="icon"
          aria-label="Zoom out"
          disabled={previewZoom <= MIN_PREVIEW_ZOOM}
          onClick={zoomPreviewOut}
        >
          <Minus />
        </Button>
        <Button
          variant="secondary"
          aria-label={`Current zoom ${zoomPercent} percent. Fit preview`}
          onClick={resetPreviewZoom}
          className="w-14 tabular-nums"
        >
          {zoomPercent}%
        </Button>
        <Button
          variant="secondary"
          size="icon"
          aria-label="Zoom in"
          disabled={previewZoom >= MAX_PREVIEW_ZOOM}
          onClick={zoomPreviewIn}
        >
          <Plus />
        </Button>
      </ButtonGroup>
    </div>
  )
}

function PreviewShareMenu() {
  const {
    clips,
    exportSettings,
    height,
    setExportSettings,
    width,
  } = useEditor()
  const [renderOpen, setRenderOpen] = useState(false)
  const [shareQuality, setShareQuality] = useState<ShareQualityValue>(
    DEFAULT_SHARE_QUALITY,
  )

  const applyShareQuality = (value: ShareQualityValue) => {
    const option =
      SHARE_QUALITY_OPTIONS.find((item) => item.value === value) ??
      SHARE_QUALITY_OPTIONS[2]

    setShareQuality(value)
    setExportSettings(
      exportSettingsForShareQuality({
        currentSettings: exportSettings,
        height,
        option,
        width,
      }),
    )
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="secondary" className="gap-1.5">
            <div className="hidden sm:inline">Export</div>
            <ArrowUpRight />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuRadioGroup
            value={shareQuality}
            onValueChange={(value) =>
              applyShareQuality(value as ShareQualityValue)
            }
          >
            {SHARE_QUALITY_OPTIONS.map((option) => (
              <DropdownMenuRadioItem
                key={option.value}
                value={option.value}
                className="items-start py-2"
              >
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="font-medium">{option.label}</span>
                  <span className="text-muted-foreground">
                    {option.description}
                  </span>
                </span>
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
          <DropdownMenuSeparator />
          <Button
            disabled={clips.length === 0 || !RENDERING_AVAILABLE}
            onClick={() => {
              applyShareQuality(shareQuality)
              setRenderOpen(true)
            }}
            variant="secondary"
            className="w-full justify-center"
            title={
              RENDERING_AVAILABLE
                ? undefined
                : 'Server rendering is disabled on this public demo. Self-host to export.'
            }
          >
            Render
            <ArrowRight />
          </Button>
          {RENDERING_AVAILABLE ? null : (
            <p className="px-2 pt-1 pb-1 text-xs text-muted-foreground">
              Export is disabled on this public demo. See the{' '}
              <a
                href="https://github.com/JoeBuildsStuff/remotion-player-diy#deployment-modes"
                target="_blank"
                rel="noreferrer"
                className="underline"
              >
                README
              </a>{' '}
              to self-host.
            </p>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <RenderDialog open={renderOpen} onOpenChange={setRenderOpen} />
    </>
  )
}
