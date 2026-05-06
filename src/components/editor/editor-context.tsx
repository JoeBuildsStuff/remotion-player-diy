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
  removeClip: (id: string) => void
  seekTo: (frame: number) => void
  play: () => void
  pause: () => void
  togglePlay: () => void
}

const EditorContext = createContext<EditorState | null>(null)

const FPS = 30
const IMAGE_DEFAULT_SECONDS = 5

function fileTypeOf(file: File): ClipType | null {
  if (file.type.startsWith('video/')) return 'video'
  if (file.type.startsWith('audio/')) return 'audio'
  if (file.type.startsWith('image/')) return 'image'
  return null
}

function trackFor(type: ClipType): number {
  if (type === 'video') return 0
  if (type === 'image') return 1
  return 2
}

function probeMediaDuration(src: string, type: ClipType): Promise<number> {
  if (type === 'image') return Promise.resolve(IMAGE_DEFAULT_SECONDS)
  return new Promise((resolve) => {
    const el = document.createElement(type) as HTMLMediaElement
    el.preload = 'metadata'
    el.src = src
    el.onloadedmetadata = () => {
      const d = Number.isFinite(el.duration) && el.duration > 0 ? el.duration : 5
      resolve(d)
    }
    el.onerror = () => resolve(5)
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
      const seconds = await probeMediaDuration(src, type)
      const trackIndex = trackFor(type)
      // Append after the last clip on that track.
      const lastEnd = additions
        .concat(clips)
        .filter((c) => c.trackIndex === trackIndex)
        .reduce((m, c) => Math.max(m, c.startFrame + c.durationInFrames), 0)
      additions.push({
        id: crypto.randomUUID(),
        type,
        src,
        name: file.name,
        startFrame: lastEnd,
        durationInFrames: Math.max(1, Math.round(seconds * FPS)),
        trackIndex,
      })
    }
    if (additions.length) setClips((prev) => [...prev, ...additions])
  }, [clips])

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
    removeClip,
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
