import { AbsoluteFill, Sequence, useVideoConfig } from 'remotion'

import type { Clip } from '../model/editor-types'
import { ClipRenderer } from './clip-renderer'
import { sortClipsForComposition } from './composition-geometry'

export type VideoCompositionRenderProps = {
  clips: Clip[]
}

/**
 * Pure-render variant of {@link VideoComposition} — no DnD, no selection
 * outlines, no editor callbacks. Used by the registered Remotion
 * {@link Composition} for server-side rendering via Vercel Sandbox.
 *
 * The editor preview keeps using {@link VideoComposition} so users still get
 * drag-resize-select handles in the canvas.
 */
export function VideoCompositionRender({ clips }: VideoCompositionRenderProps) {
  const { fps } = useVideoConfig()

  return (
    <AbsoluteFill style={{ backgroundColor: 'black' }}>
      <AbsoluteFill style={{ overflow: 'hidden' }}>
        {sortClipsForComposition(clips).map((clip) => (
          <Sequence
            key={clip.id}
            from={clip.startFrame}
            durationInFrames={clip.durationInFrames}
            premountFor={fps}
          >
            {clip.visible === false ? null : <ClipRenderer clip={clip} />}
          </Sequence>
        ))}
      </AbsoluteFill>
    </AbsoluteFill>
  )
}
