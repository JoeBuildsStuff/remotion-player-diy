import { FPS, TEXT_DEFAULT_SECONDS } from './editor-constants'
import { fitWithinCanvas } from './clip-geometry'
import type { Clip, ClipType } from './editor-types'
import type { ImportedMedia } from './media-import'

function trackFor(type: ClipType, clips: Clip[]): number {
  const existingTrack = clips.find((clip) => clip.type === type)?.trackIndex
  if (existingTrack != null) return existingTrack

  if (clips.length === 0) return 0

  return Math.max(...clips.map((clip) => clip.trackIndex)) + 1
}

function lastEndForTrack(clips: Clip[], trackIndex: number) {
  return clips
    .filter((clip) => clip.trackIndex === trackIndex)
    .reduce((max, clip) => Math.max(max, clip.startFrame + clip.durationInFrames), 0)
}

export function createMediaClip(
  item: ImportedMedia,
  clips: Clip[],
  canvasWidth: number,
  canvasHeight: number,
): Clip {
  const { file, metadata, src, type } = item
  const layout = fitWithinCanvas(
    metadata.width,
    metadata.height,
    canvasWidth,
    canvasHeight,
  )
  const trackIndex = trackFor(type, clips)
  const durationInFrames = Math.max(
    1,
    Math.round(metadata.durationInSeconds * FPS),
  )

  return {
    id: crypto.randomUUID(),
    type,
    src,
    uploadStatus: 'idle',
    name: file.name,
    sourceDurationInFrames: durationInFrames,
    startFrame: lastEndForTrack(clips, trackIndex),
    durationInFrames,
    trimBeforeFrames: 0,
    trimAfterFrames: null,
    trackIndex,
    x: layout.x,
    y: layout.y,
    width: layout.width,
    height: layout.height,
    rotation: 0,
    opacity: 1,
    borderRadius: 0,
    cropLeft: 0,
    cropTop: 0,
    cropRight: 0,
    cropBottom: 0,
    playbackRate: 1,
    volumeDb: 0,
    muted: false,
    visible: true,
    videoFadeInFrames: 0,
    videoFadeOutFrames: 0,
    audioFadeInFrames: 0,
    audioFadeOutFrames: 0,
  }
}

export function createTextClip(
  id: string,
  clips: Clip[],
  canvasWidth: number,
  canvasHeight: number,
): Clip {
  const clipWidth = Math.min(520, Math.round(canvasWidth * 0.72))
  const clipHeight = 120
  const trackIndex = trackFor('text', clips)

  return {
    id,
    type: 'text',
    src: '',
    name: 'Text',
    sourceDurationInFrames: FPS * 60 * 60,
    startFrame: lastEndForTrack(clips, trackIndex),
    durationInFrames: TEXT_DEFAULT_SECONDS * FPS,
    trimBeforeFrames: 0,
    trimAfterFrames: null,
    trackIndex,
    x: Math.round((canvasWidth - clipWidth) / 2),
    y: Math.round((canvasHeight - clipHeight) / 2),
    width: clipWidth,
    height: clipHeight,
    rotation: 0,
    opacity: 1,
    borderRadius: 0,
    cropLeft: 0,
    cropTop: 0,
    cropRight: 0,
    cropBottom: 0,
    playbackRate: 1,
    volumeDb: 0,
    muted: false,
    visible: true,
    videoFadeInFrames: 0,
    videoFadeOutFrames: 0,
    audioFadeInFrames: 0,
    audioFadeOutFrames: 0,
    text: 'Text',
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 80,
    lineHeight: 1.2,
    letterSpacing: 0,
    textAlign: 'center',
    textDirection: 'ltr',
    textColor: '#ffffff',
    strokeColor: '#000000',
    strokeWidth: 0,
    backgroundColor: '#000000',
    backgroundPaddingX: 40,
    backgroundBorderRadius: 20,
  }
}
