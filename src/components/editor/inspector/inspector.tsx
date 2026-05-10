import {
  Sidebar,
  SidebarContent,
  SidebarRail,
} from '@/components/ui/sidebar'

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
      collapsible="offcanvas"
      className="absolute h-full border-r"
    >
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
