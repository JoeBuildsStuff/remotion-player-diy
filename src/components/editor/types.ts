export type ClipType = 'video' | 'audio' | 'image'

export type Clip = {
  id: string
  type: ClipType
  src: string
  name: string
  startFrame: number
  durationInFrames: number
  trackIndex: number
}

export const TRACKS: { index: number; type: ClipType | 'any'; label: string }[] = [
  { index: 0, type: 'video', label: 'Video' },
  { index: 1, type: 'image', label: 'Overlay' },
  { index: 2, type: 'audio', label: 'Audio' },
]
