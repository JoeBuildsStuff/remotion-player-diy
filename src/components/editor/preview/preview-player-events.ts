import { useEffect } from 'react'
import type { PlayerRef } from '@remotion/player'

export function usePreviewPlayerEvents({
  clipsLength,
  playerRef,
  setCurrentFrame,
  setIsPlaying,
}: {
  clipsLength: number
  playerRef: React.RefObject<PlayerRef | null>
  setCurrentFrame: (frame: number) => void
  setIsPlaying: (isPlaying: boolean) => void
}) {
  useEffect(() => {
    const player = playerRef.current
    if (!player) return

    const onFrame = (e: { detail: { frame: number } }) =>
      setCurrentFrame(e.detail.frame)
    const onPlay = () => setIsPlaying(true)
    const onPause = () => setIsPlaying(false)

    player.addEventListener('frameupdate', onFrame)
    player.addEventListener('play', onPlay)
    player.addEventListener('pause', onPause)

    return () => {
      player.removeEventListener('frameupdate', onFrame)
      player.removeEventListener('play', onPlay)
      player.removeEventListener('pause', onPause)
    }
  }, [playerRef, setCurrentFrame, setIsPlaying, clipsLength])
}

export function usePreviewVolume({
  clipsLength,
  playerRef,
  volume,
}: {
  clipsLength: number
  playerRef: React.RefObject<PlayerRef | null>
  volume: number
}) {
  useEffect(() => {
    playerRef.current?.setVolume(volume)
  }, [playerRef, volume, clipsLength])
}
