import { useRef } from 'react'

import { useEditor } from './editor-context'
import { TRACKS } from './types'

const PX_PER_SECOND = 60

export function Timeline() {
  const {
    clips,
    fps,
    durationInFrames,
    currentFrame,
    seekTo,
    selectedClipId,
    setSelectedClipId,
  } = useEditor()
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
    setSelectedClipId(null)
  }

  const tickCount = Math.max(1, Math.ceil(totalSeconds))

  return (
    <div className="relative h-36 shrink-0 border-t border-border bg-background">
      <div
        ref={trackAreaRef}
        onClick={handleSeek}
        className="relative h-full cursor-pointer overflow-x-auto overflow-y-hidden"
      >
        <div
          className="relative h-full min-w-full"
          style={{ width: Math.max(trackWidth, 1) }}
        >
          {/* Ruler */}
          <div className="sticky top-0 h-5 border-b border-border bg-secondary/40">
            <div className="relative h-full">
              {Array.from({ length: tickCount + 1 }).map((_, i) => (
                <div
                  key={i}
                  className="absolute top-0 h-full border-l border-border"
                  style={{ left: i * PX_PER_SECOND }}
                >
                  <span className="absolute left-1 top-1/2 -translate-y-1/2 font-mono text-[10px] text-muted-foreground">
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
                className="relative h-8 border-b border-border/60"
              >
                {clips
                  .filter((c) => c.trackIndex === track.index)
                  .map((clip) => {
                    const left = (clip.startFrame / fps) * PX_PER_SECOND
                    const width = (clip.durationInFrames / fps) * PX_PER_SECOND
                    const color =
                      clip.type === 'video'
                        ? 'bg-editor-selection-fill border-editor-selection-border'
                        : clip.type === 'audio'
                          ? 'bg-emerald-600/70 border-emerald-400'
                          : 'bg-violet-600/70 border-violet-400'
                    const isSelected = selectedClipId === clip.id
                    return (
                      <div
                        key={clip.id}
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedClipId(clip.id)
                        }}
                        className={`absolute top-0.5 bottom-0.5 overflow-hidden rounded-sm border px-1.5 text-[10px] text-white ${color} ${
                          isSelected ? 'ring-2 ring-editor-selection ring-offset-1 ring-offset-zinc-950' : ''
                        }`}
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
            className="pointer-events-none absolute top-0 bottom-0 z-10 w-px bg-editor-selection"
            style={{ left: playheadLeft }}
          >
            <div className="absolute -left-1.5 -top-1 h-3 w-3 rotate-45 bg-editor-selection" />
          </div>
        </div>
      </div>
    </div>
  )
}
