import { useLayoutEffect, useRef, useState } from 'react'
import { Player } from '@remotion/player'

import { VideoComposition } from '../composition/video-composition'
import { useEditor } from '../model/editor-context-value'
import { CanvasGuidesOverlay, useCanvasGuides } from './canvas-guides'
import { CanvasRulers, RULER_SIZE } from './canvas-rulers'
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
    showCanvasRulers,
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
  const canvasWrapperRef = useRef<HTMLDivElement | null>(null)
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 })
  const [previewSize, setPreviewSize] = useState({ width: 0, height: 0 })
  const [canvasOrigin, setCanvasOrigin] = useState({ x: 0, y: 0 })
  const rulerOffset = showCanvasRulers ? RULER_SIZE : 0

  useLayoutEffect(() => {
    const el = previewRef.current
    if (!el) return

    const measure = () => {
      const availableWidth = Math.max(0, el.clientWidth - rulerOffset - 16)
      const availableHeight = Math.max(0, el.clientHeight - rulerOffset - 16)
      const scale = Math.min(availableWidth / width, availableHeight / height)

      setCanvasSize({
        width: Math.max(1, Math.floor(width * scale)),
        height: Math.max(1, Math.floor(height * scale)),
      })
      setPreviewSize({
        width: el.clientWidth,
        height: el.clientHeight,
      })
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [height, rulerOffset, width])

  useLayoutEffect(() => {
    const previewEl = previewRef.current
    const canvasEl = canvasWrapperRef.current
    if (!previewEl || !canvasEl) return

    const previewRect = previewEl.getBoundingClientRect()
    const canvasRect = canvasEl.getBoundingClientRect()
    setCanvasOrigin({
      x: canvasRect.left - previewRect.left,
      y: canvasRect.top - previewRect.top,
    })
  }, [
    canvasSize.width,
    canvasSize.height,
    previewSize.width,
    previewSize.height,
    previewZoom,
    clips.length,
    showCanvasRulers,
  ])

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

  const canvasDisplayWidth = canvasSize.width * previewZoom
  const canvasDisplayHeight = canvasSize.height * previewZoom

  const guides = useCanvasGuides({
    compositionWidth: width,
    compositionHeight: height,
    canvasOriginX: canvasOrigin.x,
    canvasOriginY: canvasOrigin.y,
    canvasDisplayWidth,
    canvasDisplayHeight,
  })

  return (
    <div
      ref={previewRef}
      data-preview-pane
      className="relative flex min-w-0 flex-1 overflow-auto bg-secondary dark:bg-secondary/40"
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
      style={{ paddingLeft: rulerOffset, paddingTop: rulerOffset }}
    >
      <div
        ref={(node) => {
          fullscreenElementRef.current = node
          canvasWrapperRef.current = node
        }}
        className="relative m-auto flex cursor-pointer items-center justify-center overflow-visible rounded-md bg-background fullscreen:bg-background"
        style={{
          width: isFullscreen
            ? `min(100vw, ${(width / height) * 100}vh)`
            : canvasDisplayWidth,
          height: isFullscreen
            ? `min(100vh, ${(height / width) * 100}vw)`
            : canvasDisplayHeight,
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

      {!isFullscreen && canvasSize.width > 0 ? (
        <>
          <CanvasGuidesOverlay
            guides={guides.guides}
            drag={guides.drag}
            startMoveExisting={guides.startMoveExisting}
            canvasOriginX={canvasOrigin.x}
            canvasOriginY={canvasOrigin.y}
            canvasDisplayWidth={canvasDisplayWidth}
            canvasDisplayHeight={canvasDisplayHeight}
            compositionWidth={width}
            compositionHeight={height}
            previewWidth={previewSize.width}
            previewHeight={previewSize.height}
          />
          {showCanvasRulers ? (
            <CanvasRulers
              previewWidth={previewSize.width}
              previewHeight={previewSize.height}
              canvasOriginX={canvasOrigin.x}
              canvasOriginY={canvasOrigin.y}
              canvasDisplayWidth={canvasDisplayWidth}
              canvasDisplayHeight={canvasDisplayHeight}
              compositionWidth={width}
              compositionHeight={height}
              onRulerPointerDown={guides.startCreateFromRuler}
            />
          ) : null}
        </>
      ) : null}
    </div>
  )
}
