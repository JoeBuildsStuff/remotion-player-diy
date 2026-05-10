import { useRef, useState } from 'react'
import { Check, ChevronDown, Minus, Plus, Share2 } from 'lucide-react'

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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

import { useEditor } from '../model/editor-context-value'
import { RENDERING_AVAILABLE } from '../model/render-mode'
import { RenderDialog } from './render-dialog'
import { ToolbarActionGroups } from './toolbar-action-groups'
import { ToolbarLogo } from './toolbar-logo'
import { ToolbarSettingsMenu } from './toolbar-settings-menu'

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
    value: '1080',
    label: '1080p',
    description: 'High quality, FHD',
    longEdge: 1920,
    quality: 85,
    audioBitrateKbps: 192,
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
    value: '2160',
    label: '2160p',
    description: 'High quality, 4K',
    longEdge: 3840,
    quality: 95,
    audioBitrateKbps: 256,
  },
] as const

type ShareQualityValue = (typeof SHARE_QUALITY_OPTIONS)[number]['value']

export function Toolbar() {
  const {
    addFiles,
    addTextClip,
    clips,
    exportSettings,
    height,
    previewZoom,
    resetPreviewZoom,
    setExportSettings,
    showCanvasRulers,
    toggleCanvasRulers,
    width,
    zoomPreviewIn,
    zoomPreviewOut,
  } = useEditor()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [renderOpen, setRenderOpen] = useState(false)
  const [shareQuality, setShareQuality] = useState<ShareQualityValue>('1080')
  const selectedShareQuality =
    SHARE_QUALITY_OPTIONS.find((option) => option.value === shareQuality) ??
    SHARE_QUALITY_OPTIONS[1]

  const applyShareQuality = (value: ShareQualityValue) => {
    const option =
      SHARE_QUALITY_OPTIONS.find((item) => item.value === value) ??
      selectedShareQuality
    const longEdge = Math.max(width, height)
    const resolutionScale = Math.min(
      400,
      Math.max(25, Math.round((option.longEdge / longEdge) * 100)),
    )

    setShareQuality(value)
    setExportSettings({
      ...exportSettings,
      audioBitrateKbps: option.audioBitrateKbps,
      quality: option.quality,
      resolutionScale,
    })
  }

  return (
    <header className="grid h-11 shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-2 border-b px-2">
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*,audio/*,image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) void addFiles(e.target.files)
          e.target.value = ''
        }}
      />

      <ToolbarLogo />

      <ToolbarActionGroups
        addTextClip={addTextClip}
        showCanvasRulers={showCanvasRulers}
        toggleCanvasRulers={toggleCanvasRulers}
        onImportMedia={() => fileInputRef.current?.click()}
      />

      <div className="flex items-center justify-self-end gap-1.5">
        <ButtonGroup>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                aria-label="Zoom out"
                disabled={previewZoom <= 0.25}
                onClick={zoomPreviewOut}
                className="h-7 w-7"
              >
                <Minus className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Zoom out</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                aria-label="Fit"
                onClick={resetPreviewZoom}
              >
                Fit
              </Button>
            </TooltipTrigger>
            <TooltipContent>Fit</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                aria-label="Zoom in"
                disabled={previewZoom >= 3}
                onClick={zoomPreviewIn}
                className="h-7 w-7"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Zoom in</TooltipContent>
          </Tooltip>
        </ButtonGroup>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="h-7 gap-1.5">
              <Share2 className="h-4 w-4" />
              <span>Share</span>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
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
              className="w-full justify-center"
              title={
                RENDERING_AVAILABLE
                  ? undefined
                  : 'Server rendering is disabled on this public demo. Self-host to export.'
              }
            >
              <Check className="h-4 w-4" />
              Render
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

        <ToolbarSettingsMenu />
      </div>

      <RenderDialog open={renderOpen} onOpenChange={setRenderOpen} />
    </header>
  )
}
