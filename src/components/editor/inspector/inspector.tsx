import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar'
import {
  Clapperboard,
} from 'lucide-react'

import { useEditor } from '../model/editor-context-value'
import { CanvasInspector } from './canvas-inspector'
import { ClipInspector } from './clip-inspector'

export function Inspector() {
  const {
    width,
    height,
    setWidth,
    setHeight,
    durationInFrames,
    fps,
    clips,
    addFiles,
    removeClip,
    selectedClipId,
    setSelectedClipId,
  } = useEditor()

  const selectedClip = selectedClipId
    ? clips.find((clip) => clip.id === selectedClipId) ?? null
    : null

  return (
    <Sidebar
      collapsible="icon"
      className="absolute h-full border-r-0"
    >
      <SidebarHeader className="bg-background">
      <SidebarMenu>
    <SidebarMenuItem>
          <SidebarMenuButton
            size="lg"
            className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
          >
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
              <Clapperboard className="size-6" strokeWidth={1.5}/>
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold">Remotion Player DIY</span>
            </div>
          </SidebarMenuButton>
    </SidebarMenuItem>
  </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="bg-background text-foreground">
        {selectedClip ? (
          <ClipInspector clip={selectedClip} />
        ) : (
          <CanvasInspector
            width={width}
            height={height}
            durationInFrames={durationInFrames}
            fps={fps}
            clips={clips}
            addFiles={addFiles}
            removeClip={removeClip}
            selectedClipId={selectedClipId}
            setSelectedClipId={setSelectedClipId}
            setWidth={setWidth}
            setHeight={setHeight}
          />
        )}
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}
