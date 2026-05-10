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
                '--sidebar-width-icon': '0rem',
              } as CSSProperties
            }
          >
            <Inspector />
            <SidebarInset className="min-w-0 bg-transparent">
              <Preview />
            </SidebarInset>
            <div className="absolute left-2 top-2 z-20 transition-[left] duration-200 ease-linear md:peer-data-[state=expanded]:left-[calc(var(--sidebar-width)+0.5rem)]">
              <SidebarTrigger
                aria-label="Toggle inspector"
                size="icon"
              />
            </div>
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
