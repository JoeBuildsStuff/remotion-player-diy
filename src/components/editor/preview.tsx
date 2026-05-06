import { useEffect, useState } from 'react'
import { Player } from '@remotion/player'

import { VideoComposition } from './composition'
import { useEditor } from './editor-context'

export function Preview() {
  const {
    playerRef,
    clips,
    fps,
    width,
    height,
    durationInFrames,
    volume,
    selectedClipId,
    setSelectedClipId,
    addFiles,
    updateClip,
    setCurrentFrame,
    setIsPlaying,
  } = useEditor()
  const [isDragging, setDragging] = useState(false)

  useEffect(() => {
    const p = playerRef.current
    if (!p) return
    const onFrame = (e: { detail: { frame: number } }) =>
      setCurrentFrame(e.detail.frame)
    const onPlay = () => setIsPlaying(true)
    const onPause = () => setIsPlaying(false)
    p.addEventListener('frameupdate', onFrame)
    p.addEventListener('play', onPlay)
    p.addEventListener('pause', onPause)
    return () => {
      p.removeEventListener('frameupdate', onFrame)
      p.removeEventListener('play', onPlay)
      p.removeEventListener('pause', onPause)
    }
  }, [playerRef, setCurrentFrame, setIsPlaying, clips.length])

  useEffect(() => {
    playerRef.current?.setVolume(volume)
  }, [playerRef, volume, clips.length])

  return (
    <div
      className="relative flex flex-1 items-center justify-center bg-secondary/40 p-4"
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
        className="relative flex h-full max-h-full cursor-pointer items-center justify-center overflow-visible rounded-md bg-background shadow-2xl"
        style={{ aspectRatio: `${width} / ${height}` }}
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
            loop={false}
            overflowVisible
            style={{ width: '100%', height: '100%' }}
            acknowledgeRemotionLicense
          />
        )}
        {isDragging && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center border-2 border-dashed border-ring bg-ring/10 text-sm text-foreground">
            Drop to add to timeline
          </div>
        )}
      </div>
    </div>
  )
}
