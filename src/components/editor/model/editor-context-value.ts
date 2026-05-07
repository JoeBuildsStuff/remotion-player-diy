import { createContext, useContext } from 'react'
import type { PlayerRef } from '@remotion/player'

import type { Clip } from './editor-types'

export type EditorState = {
  fps: number
  width: number
  height: number
  volume: number
  clips: Clip[]
  durationInFrames: number
  currentFrame: number
  isPlaying: boolean
  isLooping: boolean
  timelineZoom: number
  previewZoom: number
  playerRef: React.RefObject<PlayerRef | null>
  selectedClipId: string | null
  setSelectedClipId: (id: string | null) => void
  setVolume: (v: number) => void
  setWidth: (v: number) => void
  setHeight: (v: number) => void
  setCurrentFrame: (f: number) => void
  setIsPlaying: (p: boolean) => void
  setIsLooping: (v: boolean) => void
  setTimelineZoom: (v: number) => void
  zoomTimelineIn: () => void
  zoomTimelineOut: () => void
  resetTimelineZoom: () => void
  zoomPreviewIn: () => void
  zoomPreviewOut: () => void
  resetPreviewZoom: () => void
  addFiles: (files: FileList | File[]) => Promise<void>
  addTextClip: () => void
  updateClip: (id: string, patch: Partial<Clip>) => void
  removeClip: (id: string) => void
  splitClip: (id: string, frame: number) => void
  seekTo: (frame: number) => void
  play: () => void
  pause: () => void
  togglePlay: () => void
}

export const EditorContext = createContext<EditorState | null>(null)

export function useEditor() {
  const ctx = useContext(EditorContext)
  if (!ctx) throw new Error('useEditor must be used inside EditorProvider')
  return ctx
}
