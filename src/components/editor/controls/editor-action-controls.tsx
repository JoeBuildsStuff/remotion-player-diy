import {
  MousePointer2,
  Redo2,
  Ruler,
  Square,
  Type,
  Undo2,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

type EditorActionControlsProps = {
  addTextClip: () => void
  showCanvasRulers: boolean
  toggleCanvasRulers: () => void
}

export function EditorActionControls({
  addTextClip,
  showCanvasRulers,
  toggleCanvasRulers,
}: EditorActionControlsProps) {
  return (
    <ButtonGroup>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="secondary" size="icon" aria-label="Select">
            <MousePointer2 />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Select</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="secondary" size="icon" aria-label="Rectangle">
            <Square />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Rectangle</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="secondary"
            size="icon"
            aria-label="Text"
            onClick={addTextClip}
          >
            <Type />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Text</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="secondary"
            size="icon"
            type="button"
            aria-pressed={showCanvasRulers}
            aria-label={showCanvasRulers ? 'Hide rulers' : 'Show rulers'}
            onClick={toggleCanvasRulers}
            className="aria-pressed:bg-muted aria-pressed:text-foreground"
          >
            <Ruler />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {showCanvasRulers ? 'Hide rulers' : 'Show rulers'}
        </TooltipContent>
      </Tooltip>
    </ButtonGroup>
  )
}

export function EditorHistoryControls() {
  return (
    <ButtonGroup>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="secondary" size="icon" aria-label="Undo">
            <Undo2 />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Undo</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="secondary" size="icon" aria-label="Redo">
            <Redo2 />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Redo</TooltipContent>
      </Tooltip>
    </ButtonGroup>
  )
}
