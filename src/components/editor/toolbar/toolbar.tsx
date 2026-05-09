import { useRef, useState } from 'react'
import { Minus, Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

import { useEditor } from '../model/editor-context-value'
import { RenderDialog } from './render-dialog'
import { ToolbarActionGroups } from './toolbar-action-groups'
import { ToolbarLogo } from './toolbar-logo'
import { ToolbarSettingsMenu } from './toolbar-settings-menu'

export function Toolbar() {
  const {
    addFiles,
    addTextClip,
    previewZoom,
    resetPreviewZoom,
    showCanvasRulers,
    toggleCanvasRulers,
    zoomPreviewIn,
    zoomPreviewOut,
  } = useEditor()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [renderOpen, setRenderOpen] = useState(false)

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
        onExport={() => setRenderOpen(true)}
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

        <ToolbarSettingsMenu />
      </div>

      <RenderDialog open={renderOpen} onOpenChange={setRenderOpen} />
    </header>
  )
}
