import { Composition, type CalculateMetadataFunction } from 'remotion'

import { VideoCompositionRender } from '../src/components/editor/composition/video-composition-render'
import {
  COMP_NAME,
  DEFAULT_DURATION_IN_FRAMES,
  DEFAULT_FPS,
  DEFAULT_HEIGHT,
  DEFAULT_WIDTH,
} from './constants'
import { CompositionPropsSchema, type CompositionPropsInput } from './schema'

/**
 * Computes composition dimensions/duration/fps from the inputProps the
 * server passes in. The render request includes `dimensions` + `fps` +
 * `durationInFrames` alongside `clips`, but Remotion's `calculateMetadata`
 * only sees `props` — so we pass everything through props and read it here.
 */
const calculateMetadata: CalculateMetadataFunction<
  CompositionPropsInput & {
    fps?: number
    width?: number
    height?: number
    durationInFrames?: number
  }
> = ({ props }) => {
  const { clips } = props
  const fps = props.fps ?? DEFAULT_FPS
  const width = props.width ?? DEFAULT_WIDTH
  const height = props.height ?? DEFAULT_HEIGHT

  // Prefer the explicit duration from the editor; fall back to scanning
  // clips so the composition is at least as long as needed.
  const computedDuration = clips.reduce(
    (max, clip) => Math.max(max, clip.startFrame + clip.durationInFrames),
    1,
  )
  const durationInFrames = Math.max(
    1,
    props.durationInFrames ?? computedDuration,
  )

  return {
    durationInFrames,
    fps,
    width,
    height,
    props: { clips },
  }
}

export function RemotionRoot() {
  return (
    <Composition
      id={COMP_NAME}
      component={VideoCompositionRender}
      schema={CompositionPropsSchema}
      durationInFrames={DEFAULT_DURATION_IN_FRAMES}
      fps={DEFAULT_FPS}
      width={DEFAULT_WIDTH}
      height={DEFAULT_HEIGHT}
      defaultProps={{ clips: [] }}
      calculateMetadata={calculateMetadata}
    />
  )
}
