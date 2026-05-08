import { useLayoutEffect, useRef, useState } from 'react'
import { Player } from '@remotion/player'

import { VideoComposition } from '../composition/video-composition'
import { useEditor } from '../model/editor-context-value'
import { usePreviewPlayerEvents, usePreviewVolume } from './preview-player-events'

export function Preview() {
  const {
    playerRef,
    clips,
    fps,
    width,
    height,
    durationInFrames,
    volume,
    isLooping,
    previewZoom,
    fullscreenElementRef,
    selectedClipId,
    setSelectedClipId,
    addFiles,
    updateClip,
    setCurrentFrame,
    setIsPlaying,
  } = useEditor()
  const [isDragging, setDragging] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const previewRef = useRef<HTMLDivElement | null>(null)
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 })

  useLayoutEffect(() => {
    const el = previewRef.current
    if (!el) return

    const measure = () => {
      const availableWidth = Math.max(0, el.clientWidth - 32)
      const availableHeight = Math.max(0, el.clientHeight - 32)
      const scale = Math.min(availableWidth / width, availableHeight / height)

      setCanvasSize({
        width: Math.max(1, Math.floor(width * scale)),
        height: Math.max(1, Math.floor(height * scale)),
      })
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [height, width])

  useLayoutEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === fullscreenElementRef.current)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [fullscreenElementRef])

  usePreviewPlayerEvents({
    clipsLength: clips.length,
    playerRef,
    setCurrentFrame,
    setIsPlaying,
  })
  usePreviewVolume({ clipsLength: clips.length, playerRef, volume })

  return (
    <div
      ref={previewRef}
      className="relative flex min-w-0 flex-1 overflow-auto bg-secondary dark:bg-secondary/40 p-4"
      onDragOver={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragging(false)
        if (e.dataTransfer.files.length) {
          void addFiles(e.dataTransfer.files)
        }
      }}
    >
      <div
        ref={fullscreenElementRef}
        className="relative m-auto flex cursor-pointer items-center justify-center overflow-visible rounded-md bg-background fullscreen:bg-background"
        style={{
          width: isFullscreen
            ? `min(100vw, ${(width / height) * 100}vh)`
            : canvasSize.width * previewZoom,
          height: isFullscreen
            ? `min(100vh, ${(height / width) * 100}vw)`
            : canvasSize.height * previewZoom,
        }}
      >
        {clips.length === 0 ? (
          <p className="px-6 text-center text-sm text-muted-foreground">
            Drop videos, images, or audio
            <br />
            here to get started.
          </p>
        ) : (
          <Player
            ref={playerRef}
            component={VideoComposition}
            inputProps={{
              clips,
              selectedClipId,
              setSelectedClipId,
              updateClip,
            }}
            durationInFrames={Math.max(1, durationInFrames)}
            fps={fps}
            compositionWidth={width}
            compositionHeight={height}
            controls={false}
            loop={isLooping}
            overflowVisible
            style={{ width: '100%', height: '100%' }}
            acknowledgeRemotionLicense
          />
        )}
        {isDragging && (
          <div className="pointer-events-none absolute inset-0 border-2 border-dashed border-editor-selection" />
        )}
      </div>
    </div>
  )
}
