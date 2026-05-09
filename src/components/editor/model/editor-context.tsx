import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { PlayerRef } from '@remotion/player'

import { uploadSourceFile } from '@/lib/upload-client'

import { createMediaClip, createTextClip } from './clip-factory'
import {
  FPS,
  MAX_PREVIEW_ZOOM,
  MAX_TIMELINE_ZOOM,
  MIN_PREVIEW_ZOOM,
  MIN_TIMELINE_ZOOM,
  PREVIEW_ZOOM_STEP,
  TIMELINE_ZOOM_STEP,
} from './editor-constants'
import type { Clip } from './editor-types'
import {
  EditorContext,
  type EditorState,
  type ExportSettings,
} from './editor-context-value'
import { importMediaFiles } from './media-import'
import { clamp, durationInFramesFor } from './time'

export function EditorProvider({ children }: { children: React.ReactNode }) {
  const playerRef = useRef<PlayerRef | null>(null)
  const fullscreenElementRef = useRef<HTMLDivElement | null>(null)
  const [width, setWidth] = useState(1080)
  const [height, setHeight] = useState(1920)
  const [volume, setVolume] = useState(0.4)
  const [exportSettings, setExportSettings] = useState<ExportSettings>({
    quality: 70,
    audioBitrateKbps: 128,
    resolutionScale: 100,
  })
  const [clips, setClips] = useState<Clip[]>([])
  const [currentFrame, setCurrentFrame] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLooping, setIsLooping] = useState(false)
  const [timelineZoom, setTimelineZoom] = useState(1)
  const [previewZoom, setPreviewZoom] = useState(1)
  const [showCanvasRulers, setShowCanvasRulers] = useState(true)
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null)

  const durationInFrames = useMemo(
    () => durationInFramesFor(clips, FPS),
    [clips],
  )

  const addFiles = useCallback(async (files: FileList | File[]) => {
    const imports = await importMediaFiles(files)
    if (imports.length === 0) return

    // Build new clips synchronously so the editor sees them immediately,
    // playing from the local blob URL while the Blob upload runs in the
    // background. Each upload patches its clip with `remoteSrc` on success.
    const newClips: Array<{ clip: Clip; file: File }> = []

    setClips((prev) => {
      const next = prev.slice()

      for (const item of imports) {
        const clip: Clip = {
          ...createMediaClip(item, next, width, height),
          uploadStatus: 'uploading',
        }
        next.push(clip)
        newClips.push({ clip, file: item.file })
      }

      return next
    })

    const patch = (id: string, p: Partial<Clip>) => {
      setClips((prev) =>
        prev.map((clip) => (clip.id === id ? { ...clip, ...p } : clip)),
      )
    }

    // Fire uploads in parallel. Failures are recorded on the clip; we don't
    // throw because that would tear down the whole import batch.
    for (const { clip, file } of newClips) {
      uploadSourceFile(file)
        .then((result) => {
          patch(clip.id, { remoteSrc: result.url, uploadStatus: 'ready' })
        })
        .catch((err: unknown) => {
          patch(clip.id, {
            uploadStatus: 'error',
            uploadError: err instanceof Error ? err.message : String(err),
          })
        })
    }
  }, [height, width])

  const addTextClip = useCallback(() => {
    const id = crypto.randomUUID()

    setClips((prev) => [...prev, createTextClip(id, prev, width, height)])
    setSelectedClipId(id)
  }, [height, width])

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

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Delete' && event.key !== 'Backspace') return
      if (event.metaKey || event.ctrlKey || event.altKey) return

      const target = event.target
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        (target instanceof HTMLElement && target.isContentEditable)
      ) {
        return
      }

      if (!selectedClipId) return

      event.preventDefault()
      removeClip(selectedClipId)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [removeClip, selectedClipId])

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

  const updateTimelineZoom = useCallback((value: number) => {
    setTimelineZoom(clamp(value, MIN_TIMELINE_ZOOM, MAX_TIMELINE_ZOOM))
  }, [])

  const zoomTimelineIn = useCallback(() => {
    setTimelineZoom((prev) =>
      clamp(prev + TIMELINE_ZOOM_STEP, MIN_TIMELINE_ZOOM, MAX_TIMELINE_ZOOM),
    )
  }, [])

  const zoomTimelineOut = useCallback(() => {
    setTimelineZoom((prev) =>
      clamp(prev - TIMELINE_ZOOM_STEP, MIN_TIMELINE_ZOOM, MAX_TIMELINE_ZOOM),
    )
  }, [])

  const resetTimelineZoom = useCallback(() => {
    setTimelineZoom(1)
  }, [])

  const zoomPreviewIn = useCallback(() => {
    setPreviewZoom((prev) =>
      clamp(prev + PREVIEW_ZOOM_STEP, MIN_PREVIEW_ZOOM, MAX_PREVIEW_ZOOM),
    )
  }, [])

  const zoomPreviewOut = useCallback(() => {
    setPreviewZoom((prev) =>
      clamp(prev - PREVIEW_ZOOM_STEP, MIN_PREVIEW_ZOOM, MAX_PREVIEW_ZOOM),
    )
  }, [])

  const resetPreviewZoom = useCallback(() => {
    setPreviewZoom(1)
  }, [])

  const toggleCanvasRulers = useCallback(() => {
    setShowCanvasRulers((prev) => !prev)
  }, [])

  const value: EditorState = useMemo(
    () => ({
      fps: FPS,
      width,
      height,
      volume,
      exportSettings,
      clips,
      durationInFrames,
      currentFrame,
      isPlaying,
      isLooping,
      timelineZoom,
      previewZoom,
      showCanvasRulers,
      playerRef,
      fullscreenElementRef,
      selectedClipId,
      setSelectedClipId,
      setVolume,
      setExportSettings,
      setWidth,
      setHeight,
      setCurrentFrame,
      setIsPlaying,
      setIsLooping,
      setTimelineZoom: updateTimelineZoom,
      zoomTimelineIn,
      zoomTimelineOut,
      resetTimelineZoom,
      zoomPreviewIn,
      zoomPreviewOut,
      resetPreviewZoom,
      setShowCanvasRulers,
      toggleCanvasRulers,
      addFiles,
      addTextClip,
      updateClip,
      removeClip,
      splitClip,
      seekTo,
      play,
      pause,
      togglePlay,
    }),
    [
      addFiles,
      addTextClip,
      clips,
      currentFrame,
      durationInFrames,
      exportSettings,
      fullscreenElementRef,
      height,
      isLooping,
      isPlaying,
      pause,
      play,
      previewZoom,
      removeClip,
      resetPreviewZoom,
      resetTimelineZoom,
      seekTo,
      selectedClipId,
      showCanvasRulers,
      splitClip,
      timelineZoom,
      togglePlay,
      toggleCanvasRulers,
      updateClip,
      updateTimelineZoom,
      volume,
      width,
      zoomPreviewIn,
      zoomPreviewOut,
      zoomTimelineIn,
      zoomTimelineOut,
    ],
  )

  return (
    <EditorContext.Provider value={value}>{children}</EditorContext.Provider>
  )
}
