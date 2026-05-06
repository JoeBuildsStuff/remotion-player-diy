import { TooltipProvider } from '@/components/ui/tooltip'

import { EditorProvider } from './editor-context'
import { Inspector } from './inspector'
import { Preview } from './preview'
import { Timeline } from './timeline'
import { Toolbar } from './toolbar'
import { TransportBar } from './transport-bar'

export function Editor() {
  return (
    <EditorProvider>
      <TooltipProvider>
        <div className="dark flex h-screen w-screen flex-col overflow-hidden bg-background text-foreground">
          <Toolbar />
          <div className="flex min-h-0 flex-1">
            <Preview />
            <Inspector />
          </div>

          <TransportBar />
          <Timeline />
        </div>
      </TooltipProvider>
    </EditorProvider>
  )
}
