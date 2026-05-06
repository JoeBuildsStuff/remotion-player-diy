export type ClipType = 'video' | 'audio' | 'image'

export type Clip = {
  id: string
  type: ClipType
  src: string
  name: string
  sourceDurationInFrames: number
  startFrame: number
  durationInFrames: number
  trimBeforeFrames: number
  trimAfterFrames: number | null
  trackIndex: number
  x: number
  y: number
  width: number
  height: number
  rotation: number
  opacity: number
  borderRadius: number
  cropLeft: number
  cropTop: number
  cropRight: number
  cropBottom: number
  playbackRate: number
  volumeDb: number
  muted: boolean
  visible: boolean
  videoFadeInFrames: number
  videoFadeOutFrames: number
  audioFadeInFrames: number
  audioFadeOutFrames: number
}
