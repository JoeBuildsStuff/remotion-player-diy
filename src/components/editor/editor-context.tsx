import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { PlayerRef } from '@remotion/player'

import type { Clip, ClipType } from './types'

type EditorState = {
  fps: number
  width: number
  height: number
  volume: number
  clips: Clip[]
  durationInFrames: number
  currentFrame: number
  isPlaying: boolean
  playerRef: React.RefObject<PlayerRef | null>
  selectedClipId: string | null
  setSelectedClipId: (id: string | null) => void
  setVolume: (v: number) => void
  setWidth: (v: number) => void
  setHeight: (v: number) => void
  setCurrentFrame: (f: number) => void
  setIsPlaying: (p: boolean) => void
  addFiles: (files: FileList | File[]) => Promise<void>
  updateClip: (id: string, patch: Partial<Clip>) => void
  removeClip: (id: string) => void
  splitClip: (id: string, frame: number) => void
  seekTo: (frame: number) => void
  play: () => void
  pause: () => void
  togglePlay: () => void
}

const EditorContext = createContext<EditorState | null>(null)

const FPS = 30
const IMAGE_DEFAULT_SECONDS = 5

type MediaMetadata = {
  durationInSeconds: number
  width: number | null
  height: number | null
}

function fileTypeOf(file: File): ClipType | null {
  if (file.type.startsWith('video/')) return 'video'
  if (file.type.startsWith('audio/')) return 'audio'
  if (file.type.startsWith('image/')) return 'image'
  return null
}

function trackFor(type: ClipType, clips: Clip[]): number {
  const existingTrack = clips.find((clip) => clip.type === type)?.trackIndex
  if (existingTrack != null) return existingTrack

  if (clips.length === 0) return 0

  return Math.max(...clips.map((clip) => clip.trackIndex)) + 1
}

function fitWithinCanvas(
  mediaWidth: number | null,
  mediaHeight: number | null,
  canvasWidth: number,
  canvasHeight: number,
) {
  if (!mediaWidth || !mediaHeight) {
    return {
      x: 0,
      y: 0,
      width: canvasWidth,
      height: canvasHeight,
    }
  }

  const scale = Math.min(canvasWidth / mediaWidth, canvasHeight / mediaHeight)
  const width = Math.max(1, Math.round(mediaWidth * scale))
  const height = Math.max(1, Math.round(mediaHeight * scale))

  return {
    x: Math.round((canvasWidth - width) / 2),
    y: Math.round((canvasHeight - height) / 2),
    width,
    height,
  }
}

function probeMediaMetadata(src: string, type: ClipType): Promise<MediaMetadata> {
  if (type === 'image') {
    return new Promise((resolve) => {
      const img = new Image()
      img.src = src
      img.onload = () => {
        resolve({
          durationInSeconds: IMAGE_DEFAULT_SECONDS,
          width: img.naturalWidth || null,
          height: img.naturalHeight || null,
        })
      }
      img.onerror = () => {
        resolve({
          durationInSeconds: IMAGE_DEFAULT_SECONDS,
          width: null,
          height: null,
        })
      }
    })
  }

  return new Promise((resolve) => {
    const el = document.createElement(type) as HTMLMediaElement
    el.preload = 'metadata'
    el.src = src
    el.onloadedmetadata = () => {
      const d = Number.isFinite(el.duration) && el.duration > 0 ? el.duration : 5
      resolve({
        durationInSeconds: d,
        width:
          type === 'video' && el instanceof HTMLVideoElement
            ? el.videoWidth || null
            : null,
        height:
          type === 'video' && el instanceof HTMLVideoElement
            ? el.videoHeight || null
            : null,
      })
    }
    el.onerror = () => {
      resolve({
        durationInSeconds: 5,
        width: null,
        height: null,
      })
    }
  })
}

export function EditorProvider({ children }: { children: React.ReactNode }) {
  const playerRef = useRef<PlayerRef | null>(null)
  const [width, setWidth] = useState(1080)
  const [height, setHeight] = useState(1920)
  const [volume, setVolume] = useState(0.4)
  const [clips, setClips] = useState<Clip[]>([])
  const [currentFrame, setCurrentFrame] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null)

  const durationInFrames = useMemo(() => {
    if (clips.length === 0) return FPS * 10 // empty timeline placeholder: 10s
    return Math.max(
      1,
      ...clips.map((c) => c.startFrame + c.durationInFrames),
    )
  }, [clips])

  const addFiles = useCallback(async (files: FileList | File[]) => {
    const list = Array.from(files)
    const additions: Clip[] = []
    for (const file of list) {
      const type = fileTypeOf(file)
      if (!type) continue
      const src = URL.createObjectURL(file)
      const metadata = await probeMediaMetadata(src, type)
      const layout = fitWithinCanvas(
        metadata.width,
        metadata.height,
        width,
        height,
      )
      const pendingClips = additions.concat(clips)
      const trackIndex = trackFor(type, pendingClips)
      // Append after the last clip on that track.
      const lastEnd = pendingClips
        .filter((c) => c.trackIndex === trackIndex)
        .reduce((m, c) => Math.max(m, c.startFrame + c.durationInFrames), 0)
      additions.push({
        id: crypto.randomUUID(),
        type,
        src,
        name: file.name,
        sourceDurationInFrames: Math.max(
          1,
          Math.round(metadata.durationInSeconds * FPS),
        ),
        startFrame: lastEnd,
        durationInFrames: Math.max(
          1,
          Math.round(metadata.durationInSeconds * FPS),
        ),
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
      })
    }
    if (additions.length) setClips((prev) => [...prev, ...additions])
  }, [clips, height, width])

  const updateClip = useCallback((id: string, patch: Partial<Clip>) => {
    setClips((prev) =>
      prev.map((clip) => (clip.id === id ? { ...clip, ...patch } : clip)),
    )
  }, [])

  const splitClip = useCallback((id: string, frame: number) => {
    setClips((prev) => {
      const clip = prev.find((c) => c.id === id)
      if (!clip) return prev
      const offset = frame - clip.startFrame
      if (offset <= 0 || offset >= clip.durationInFrames) return prev
      const firstDuration = offset
      const secondDuration = clip.durationInFrames - offset
      const first: Clip = {
        ...clip,
        durationInFrames: firstDuration,
      }
      const second: Clip = {
        ...clip,
        id: crypto.randomUUID(),
        startFrame: clip.startFrame + offset,
        durationInFrames: secondDuration,
        trimBeforeFrames: clip.trimBeforeFrames + offset,
        videoFadeInFrames: 0,
        audioFadeInFrames: 0,
      }
      const firstWithFades: Clip = {
        ...first,
        videoFadeOutFrames: 0,
        audioFadeOutFrames: 0,
      }
      const idx = prev.indexOf(clip)
      const next = prev.slice()
      next.splice(idx, 1, firstWithFades, second)
      return next
    })
  }, [])

  const removeClip = useCallback((id: string) => {
    setClips((prev) => prev.filter((c) => c.id !== id))
    setSelectedClipId((prev) => (prev === id ? null : prev))
  }, [])

  const seekTo = useCallback((frame: number) => {
    playerRef.current?.seekTo(frame)
  }, [])

  const play = useCallback(() => {
    playerRef.current?.play()
  }, [])

  const pause = useCallback(() => {
    playerRef.current?.pause()
  }, [])

  const togglePlay = useCallback(() => {
    const p = playerRef.current
    if (!p) return
    if (p.isPlaying()) p.pause()
    else p.play()
  }, [])

  const value: EditorState = {
    fps: FPS,
    width,
    height,
    volume,
    clips,
    durationInFrames,
    currentFrame,
    isPlaying,
    playerRef,
    selectedClipId,
    setSelectedClipId,
    setVolume,
    setWidth,
    setHeight,
    setCurrentFrame,
    setIsPlaying,
    addFiles,
    updateClip,
    removeClip,
    splitClip,
    seekTo,
    play,
    pause,
    togglePlay,
  }

  return (
    <EditorContext.Provider value={value}>{children}</EditorContext.Provider>
  )
}

export function useEditor() {
  const ctx = useContext(EditorContext)
  if (!ctx) throw new Error('useEditor must be used inside EditorProvider')
  return ctx
}
