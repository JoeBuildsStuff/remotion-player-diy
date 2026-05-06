import { AbsoluteFill, Audio, Img, OffthreadVideo, Sequence } from 'remotion'

import type { Clip } from './types'

export function VideoComposition({ clips }: { clips: Clip[] }) {
  return (
    <AbsoluteFill style={{ backgroundColor: 'black' }}>
      {clips.map((clip) => (
        <Sequence
          key={clip.id}
          from={clip.startFrame}
          durationInFrames={clip.durationInFrames}
          layout={clip.type === 'audio' ? 'none' : undefined}
        >
          {clip.type === 'video' && (
            <OffthreadVideo
              src={clip.src}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
              }}
            />
          )}
          {clip.type === 'image' && (
            <Img
              src={clip.src}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
              }}
            />
          )}
          {clip.type === 'audio' && <Audio src={clip.src} />}
        </Sequence>
      ))}
    </AbsoluteFill>
  )
}
