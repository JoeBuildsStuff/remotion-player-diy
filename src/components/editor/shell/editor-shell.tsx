import type { CSSProperties } from 'react'

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'

import { Inspector } from '../inspector/inspector'
import { Preview } from '../preview/preview'
import { Timeline } from '../timeline/timeline'
import { TransportBar } from '../transport/transport-bar'

export function EditorShell() {
  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-background text-foreground">
      <ResizablePanelGroup orientation="vertical" className="min-h-0 flex-1">
        <ResizablePanel defaultSize="76%" minSize="35%">
          <SidebarProvider
            defaultOpen
            className="relative h-full min-h-0 flex-1"
            style={
              {
                '--sidebar-width': '18rem',
                '--sidebar-width-icon': '3rem',
              } as CSSProperties
            }
          >
            <Inspector />
            <SidebarInset className="min-w-0 bg-transparent">
              <header className="absolute left-0 top-0 z-20 flex h-10 shrink-0 items-center gap-2 px-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-10">
                <SidebarTrigger
                  aria-label="Toggle inspector"
                  size="icon"
                  className="bg-secondary"
                />
              </header>
              <Preview />
            </SidebarInset>
          </SidebarProvider>
        </ResizablePanel>

        <ResizableHandle />

        <ResizablePanel defaultSize="24%" minSize="24%" maxSize="60%">
          <div className="flex h-full min-h-0 flex-col">
            <TransportBar />
            <Timeline />
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}
