export type ClipType = 'video' | 'audio' | 'image' | 'text'

export type UploadStatus = 'idle' | 'uploading' | 'ready' | 'error'

export type Clip = {
  id: string
  type: ClipType
  src: string
  /** Public https URL of the source media on Vercel Blob. Required for server-side rendering. */
  remoteSrc?: string
  /** Upload state for the source media. 'idle' for text clips (no upload needed). */
  uploadStatus?: UploadStatus
  uploadError?: string
  sourceFileSizeBytes?: number
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
  text?: string
  fontFamily?: string
  fontWeight?: string
  fontSize?: number
  lineHeight?: number
  letterSpacing?: number
  textAlign?: 'left' | 'center' | 'right'
  textDirection?: 'ltr' | 'rtl'
  textColor?: string
  strokeColor?: string
  strokeWidth?: number
  backgroundColor?: string
  backgroundPaddingX?: number
  backgroundBorderRadius?: number
}
