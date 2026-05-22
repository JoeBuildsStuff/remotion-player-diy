import { useState, type CSSProperties } from 'react'
import { ChevronLeft, X } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
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

import { useEditor } from '../model/editor-context-value'
import { RENDERING_AVAILABLE } from '../model/render-mode'
import { RULER_SIZE } from '../preview/canvas-rulers'
import { Inspector } from '../inspector/inspector'
import { Preview } from '../preview/preview'
import { Timeline } from '../timeline/timeline'
import { TransportBar } from '../transport/transport-bar'

export function EditorShell() {
  const { showCanvasRulers, projectId } = useEditor()
  const sidebarTriggerOffset = showCanvasRulers ? `${RULER_SIZE}px` : '0px'
  const [demoBannerDismissed, setDemoBannerDismissed] = useState(false)
  const showDemoBanner = !RENDERING_AVAILABLE && !demoBannerDismissed

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-background text-foreground">
      {showDemoBanner ? (
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-200">
          <span>
            Demo mode — changes won&rsquo;t be saved and rendering is disabled.{' '}
            <a
              href="https://github.com/joeBlockchain/remotion-player-diy#self-hosting"
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2 hover:text-amber-100"
            >
              Self-host
            </a>{' '}
            to enable saving and rendering.
          </span>
          <button
            type="button"
            aria-label="Dismiss demo notice"
            onClick={() => setDemoBannerDismissed(true)}
            className="rounded p-0.5 hover:bg-amber-500/20"
          >
            <X className="size-3.5" />
          </button>
        </div>
      ) : null}
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
              <header
                className="absolute z-20 flex h-10 shrink-0 items-center gap-2 px-2 transition-[width,height,left,top] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-10"
                style={{
                  left: sidebarTriggerOffset,
                  top: sidebarTriggerOffset,
                }}
              >
                <SidebarTrigger
                  aria-label="Toggle inspector"
                  size="icon"
                  className="bg-secondary"
                />
                {projectId ? (
                  <Button asChild variant="secondary" className="gap-1.5">
                    <Link to="/" aria-label="Back to projects">
                      <ChevronLeft />
                      Projects
                    </Link>
                  </Button>
                ) : null}
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
