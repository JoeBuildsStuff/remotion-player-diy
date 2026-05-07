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
    selectedClipId,
  } = useEditor()

  const selectedClip = selectedClipId
    ? clips.find((clip) => clip.id === selectedClipId) ?? null
    : null

  if (selectedClip) {
    return <ClipInspector clip={selectedClip} />
  }

  return (
    <CanvasInspector
      width={width}
      height={height}
      durationInFrames={durationInFrames}
      fps={fps}
      clips={clips}
      setWidth={setWidth}
      setHeight={setHeight}
    />
  )
}
