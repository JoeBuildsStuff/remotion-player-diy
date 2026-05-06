import { useRef } from 'react'
import {
  Download,
  Image as ImageIcon,
  Minus,
  MousePointer2,
  Music,
  Plus,
  Redo2,
  Save,
  Square,
  Type,
  Undo2,
  Upload,
  Video,
} from 'lucide-react'

import { Button } from '@/components/ui/button'

import { useEditor } from './editor-context'
import { ToolbarGroup, ToolbarIconButton } from './toolbar-primitives'

export function Toolbar() {
  const { addFiles } = useEditor()
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  return (
    <header className="flex h-11 shrink-0 items-center justify-between gap-2 border-b border-zinc-800 bg-zinc-900 px-2">
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

      <div className="flex items-center gap-1.5">
        <ToolbarGroup>
          <ToolbarIconButton label="Select" active>
            <MousePointer2 className="h-4 w-4" />
          </ToolbarIconButton>
          <ToolbarIconButton label="Rectangle">
            <Square className="h-4 w-4" />
          </ToolbarIconButton>
          <ToolbarIconButton label="Text">
            <Type className="h-4 w-4" />
          </ToolbarIconButton>
          <ToolbarIconButton label="Image">
            <ImageIcon className="h-4 w-4" />
          </ToolbarIconButton>
          <ToolbarIconButton label="Video">
            <Video className="h-4 w-4" />
          </ToolbarIconButton>
          <ToolbarIconButton label="Audio">
            <Music className="h-4 w-4" />
          </ToolbarIconButton>
        </ToolbarGroup>

        <ToolbarGroup>
          <ToolbarIconButton label="Undo">
            <Undo2 className="h-4 w-4" />
          </ToolbarIconButton>
          <ToolbarIconButton label="Redo">
            <Redo2 className="h-4 w-4" />
          </ToolbarIconButton>
        </ToolbarGroup>

        <ToolbarGroup>
          <ToolbarIconButton label="Save">
            <Save className="h-4 w-4" />
          </ToolbarIconButton>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            className="h-7 w-7 text-zinc-300 hover:bg-zinc-700 hover:text-zinc-50"
            title="Import media"
          >
            <Download className="h-4 w-4" />
          </Button>
          <ToolbarIconButton label="Export">
            <Upload className="h-4 w-4" />
          </ToolbarIconButton>
        </ToolbarGroup>
      </div>

      <ToolbarGroup>
        <ToolbarIconButton label="Zoom out">
          <Minus className="h-4 w-4" />
        </ToolbarIconButton>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs text-zinc-200 hover:bg-zinc-700 hover:text-zinc-50"
        >
          Fit
        </Button>
        <ToolbarIconButton label="Zoom in">
          <Plus className="h-4 w-4" />
        </ToolbarIconButton>
      </ToolbarGroup>
    </header>
  )
}
