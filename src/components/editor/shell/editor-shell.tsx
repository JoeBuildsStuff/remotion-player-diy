import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable'

import { Inspector } from '../inspector/inspector'
import { Preview } from '../preview/preview'
import { Timeline } from '../timeline/timeline'
import { Toolbar } from '../toolbar/toolbar'
import { TransportBar } from '../transport/transport-bar'

export function EditorShell() {
  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-background text-foreground">
      <Toolbar />

      <ResizablePanelGroup orientation="vertical" className="min-h-0 flex-1">
        <ResizablePanel defaultSize="68%" minSize="35%">
          <div className="flex h-full min-h-0">
            <Inspector />
            <Preview />
          </div>
        </ResizablePanel>

        <ResizableHandle />

        <ResizablePanel defaultSize="32%" minSize="24%" maxSize="60%">
          <div className="flex h-full min-h-0 flex-col">
            <TransportBar />
            <Timeline />
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}
