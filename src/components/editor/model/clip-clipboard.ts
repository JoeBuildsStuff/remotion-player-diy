import type { Clip } from './editor-types'

export const EDITOR_CLIP_DRAG_TYPE = 'application/x-editor-clip'

export function isEditorClipDrag(dataTransfer: DataTransfer) {
  return Array.from(dataTransfer.types).includes(EDITOR_CLIP_DRAG_TYPE)
}

export function trackEndFrame(clips: Clip[], trackIndex: number) {
  let end = 0
  for (const clip of clips) {
    if (clip.trackIndex !== trackIndex) continue
    end = Math.max(end, clip.startFrame + clip.durationInFrames)
  }
  return end
}

export function pasteTrackIndex(
  clips: Clip[],
  selectedClipId: string | null,
  selectedTrackIndex: number | null,
  sourceTrackIndex: number,
) {
  if (selectedClipId) {
    const selected = clips.find((clip) => clip.id === selectedClipId)
    if (selected) return selected.trackIndex
  }
  return selectedTrackIndex ?? sourceTrackIndex
}

export function clipCopyAt(
  source: Clip,
  clips: Clip[],
  placement: { trackIndex: number; startFrame?: number },
  id: string,
): Clip {
  return {
    ...source,
    id,
    trackIndex: placement.trackIndex,
    startFrame:
      placement.startFrame ?? trackEndFrame(clips, placement.trackIndex),
  }
}
