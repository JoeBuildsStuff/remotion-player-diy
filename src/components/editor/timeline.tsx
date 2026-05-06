import { useRef } from 'react'

import { useEditor } from './editor-context'
import { TRACKS } from './types'

const PX_PER_SECOND = 60

export function Timeline() {
  const { clips, fps, durationInFrames, currentFrame, seekTo } = useEditor()
  const trackAreaRef = useRef<HTMLDivElement | null>(null)

  const totalSeconds = Math.max(1, durationInFrames / fps)
  const trackWidth = totalSeconds * PX_PER_SECOND
  const playheadLeft = (currentFrame / fps) * PX_PER_SECOND

  const handleSeek = (e: React.MouseEvent) => {
    const el = trackAreaRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const x = e.clientX - rect.left + el.scrollLeft
    const seconds = Math.max(0, x / PX_PER_SECOND)
    const frame = Math.min(
      durationInFrames - 1,
      Math.max(0, Math.round(seconds * fps)),
    )
    seekTo(frame)
  }

  const tickCount = Math.max(1, Math.ceil(totalSeconds))

  return (
    <div className="relative h-36 shrink-0 border-t border-zinc-800 bg-zinc-950">
      <div
        ref={trackAreaRef}
        onClick={handleSeek}
        className="relative h-full cursor-pointer overflow-x-auto overflow-y-hidden"
      >
        <div
          className="relative h-full"
          style={{ width: Math.max(trackWidth, 1) }}
        >
          {/* Ruler */}
          <div className="sticky top-0 h-5 border-b border-zinc-800 bg-zinc-900">
            <div className="relative h-full">
              {Array.from({ length: tickCount + 1 }).map((_, i) => (
                <div
                  key={i}
                  className="absolute top-0 h-full border-l border-zinc-800"
                  style={{ left: i * PX_PER_SECOND }}
                >
                  <span className="ml-1 font-mono text-[10px] text-zinc-500">
                    {`00:${String(i).padStart(2, '0')}`}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Tracks */}
          <div className="relative">
            {TRACKS.map((track) => (
              <div
                key={track.index}
                className="relative h-8 border-b border-zinc-800/60"
              >
                {clips
                  .filter((c) => c.trackIndex === track.index)
                  .map((clip) => {
                    const left = (clip.startFrame / fps) * PX_PER_SECOND
                    const width = (clip.durationInFrames / fps) * PX_PER_SECOND
                    const color =
                      clip.type === 'video'
                        ? 'bg-blue-600/70 border-blue-400'
                        : clip.type === 'audio'
                          ? 'bg-emerald-600/70 border-emerald-400'
                          : 'bg-violet-600/70 border-violet-400'
                    return (
                      <div
                        key={clip.id}
                        className={`absolute top-0.5 bottom-0.5 overflow-hidden rounded-sm border px-1.5 text-[10px] text-white ${color}`}
                        style={{ left, width }}
                        title={clip.name}
                      >
                        <span className="block truncate leading-7">
                          {clip.name}
                        </span>
                      </div>
                    )
                  })}
              </div>
            ))}
          </div>

          {/* Playhead */}
          <div
            className="pointer-events-none absolute top-0 bottom-0 z-10 w-px bg-blue-500"
            style={{ left: playheadLeft }}
          >
            <div className="absolute -left-1.5 -top-1 h-3 w-3 rotate-45 bg-blue-500" />
          </div>
        </div>
      </div>
    </div>
  )
}
