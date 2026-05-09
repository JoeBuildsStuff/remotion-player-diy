import {
  Download,
  Image as ImageIcon,
  MousePointer2,
  Music,
  Redo2,
  Ruler,
  Save,
  Square,
  Type,
  Undo2,
  Upload,
  Video,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

export function ToolbarActionGroups({
  addTextClip,
  showCanvasRulers,
  toggleCanvasRulers,
  onImportMedia,
  onExport,
}: {
  addTextClip: () => void
  showCanvasRulers: boolean
  toggleCanvasRulers: () => void
  onImportMedia: () => void
  onExport: () => void
}) {
  return (
    <div className="flex items-center justify-self-center gap-1.5">
      <ButtonGroup>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              aria-label="Select"
              className="h-7 w-7"
            >
              <MousePointer2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Select</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              aria-label="Rectangle"
              className="h-7 w-7"
            >
              <Square className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Rectangle</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              aria-label="Text"
              onClick={addTextClip}
              className="h-7 w-7"
            >
              <Type className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Text</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              type="button"
              aria-pressed={showCanvasRulers}
              aria-label={showCanvasRulers ? 'Hide rulers' : 'Show rulers'}
              onClick={toggleCanvasRulers}
              className="h-7 w-7 aria-pressed:bg-muted aria-pressed:text-foreground"
            >
              <Ruler className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {showCanvasRulers ? 'Hide rulers' : 'Show rulers'}
          </TooltipContent>
        </Tooltip>
      </ButtonGroup>

      <ButtonGroup>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              aria-label="Image"
              className="h-7 w-7"
            >
              <ImageIcon className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Image</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              aria-label="Video"
              className="h-7 w-7"
            >
              <Video className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Video</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              aria-label="Audio"
              className="h-7 w-7"
            >
              <Music className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Audio</TooltipContent>
        </Tooltip>
      </ButtonGroup>

      <ButtonGroup>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              aria-label="Undo"
              className="h-7 w-7"
            >
              <Undo2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Undo</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              aria-label="Redo"
              className="h-7 w-7"
            >
              <Redo2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Redo</TooltipContent>
        </Tooltip>
      </ButtonGroup>

      <ButtonGroup>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              aria-label="Save"
              className="h-7 w-7"
            >
              <Save className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Save</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              onClick={onImportMedia}
              aria-label="Import media"
            >
              <Download className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Import media</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              aria-label="Export"
              onClick={onExport}
              className="h-7 w-7"
            >
              <Upload className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Export</TooltipContent>
        </Tooltip>
      </ButtonGroup>
    </div>
  )
}
