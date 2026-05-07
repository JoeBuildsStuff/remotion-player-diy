import { TooltipProvider } from '@/components/ui/tooltip'

import { EditorProvider } from './model/editor-context'
import { EditorShell } from './shell/editor-shell'

export function Editor() {
  return (
    <EditorProvider>
      <TooltipProvider>
        <EditorShell />
      </TooltipProvider>
    </EditorProvider>
  )
}
