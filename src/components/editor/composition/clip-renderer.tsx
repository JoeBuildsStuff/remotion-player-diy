import type { CSSProperties } from 'react'
import {
  Audio,
  Img,
  OffthreadVideo,
  interpolate,
  useCurrentFrame,
} from 'remotion'

import type { Clip } from '../model/editor-types'

function dbToGain(db: number) {
  if (db <= -60) return 0
  return 10 ** (db / 20)
}

function fadeFactor(frame: number, duration: number, fadeIn: number, fadeOut: number) {
  const inFactor =
    fadeIn > 0
      ? interpolate(frame, [0, fadeIn], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        })
      : 1
  const outFactor =
    fadeOut > 0
      ? interpolate(frame, [duration - fadeOut, duration], [1, 0], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        })
      : 1

  return Math.min(inFactor, outFactor)
}

function mediaContainerStyle(clip: Clip, opacity: number): CSSProperties {
  return {
    position: 'absolute',
    left: clip.x,
    top: clip.y,
    width: clip.width,
    height: clip.height,
    overflow: 'hidden',
    borderRadius: clip.borderRadius,
    opacity,
    transform: `rotate(${clip.rotation}deg)`,
    transformOrigin: 'center',
  }
}

function textContainerStyle(clip: Clip, opacity: number): CSSProperties {
  return {
    position: 'absolute',
    left: clip.x,
    top: clip.y,
    width: clip.width,
    height: clip.height,
    opacity,
    transform: `rotate(${clip.rotation}deg)`,
    transformOrigin: 'center',
    display: 'flex',
    alignItems: 'center',
    justifyContent:
      clip.textAlign === 'left'
        ? 'flex-start'
        : clip.textAlign === 'right'
          ? 'flex-end'
          : 'center',
    paddingInline: clip.backgroundPaddingX ?? 0,
    borderRadius: clip.backgroundBorderRadius ?? 0,
    backgroundColor: clip.backgroundColor ?? 'transparent',
    boxSizing: 'border-box',
    overflow: 'hidden',
  }
}

function textStyle(clip: Clip): CSSProperties {
  return {
    width: '100%',
    color: clip.textColor ?? '#ffffff',
    fontFamily: clip.fontFamily ?? 'Inter',
    fontSize: clip.fontSize ?? 80,
    fontWeight: clip.fontWeight ?? 700,
    lineHeight: clip.lineHeight ?? 1.2,
    letterSpacing: clip.letterSpacing ?? 0,
    textAlign: clip.textAlign ?? 'center',
    direction: clip.textDirection ?? 'ltr',
    whiteSpace: 'pre-wrap',
    overflowWrap: 'break-word',
    WebkitTextStroke:
      (clip.strokeWidth ?? 0) > 0
        ? `${clip.strokeWidth}px ${clip.strokeColor ?? '#000000'}`
        : undefined,
  }
}

function croppedMediaStyle(clip: Clip): CSSProperties {
  return {
    position: 'absolute',
    left: -clip.cropLeft,
    top: -clip.cropTop,
    width: clip.width + clip.cropLeft + clip.cropRight,
    height: clip.height + clip.cropTop + clip.cropBottom,
    maxWidth: 'none',
    maxHeight: 'none',
    objectFit: 'contain',
  }
}

export function ClipRenderer({ clip }: { clip: Clip }) {
  const frame = useCurrentFrame()
  const visualFade = fadeFactor(
    frame,
    clip.durationInFrames,
    clip.videoFadeInFrames,
    clip.videoFadeOutFrames,
  )
  const audioFade = fadeFactor(
    frame,
    clip.durationInFrames,
    clip.audioFadeInFrames,
    clip.audioFadeOutFrames,
  )
  const volume = clip.muted ? 0 : dbToGain(clip.volumeDb) * audioFade
  const trimAfter = clip.trimAfterFrames ?? undefined

  if (clip.type === 'video') {
    return (
      <div style={mediaContainerStyle(clip, clip.opacity * visualFade)}>
        <OffthreadVideo
          src={clip.src}
          trimBefore={clip.trimBeforeFrames}
          trimAfter={trimAfter}
          volume={volume}
          muted={clip.muted}
          playbackRate={clip.playbackRate}
          style={croppedMediaStyle(clip)}
        />
      </div>
    )
  }

  if (clip.type === 'image') {
    return (
      <div style={mediaContainerStyle(clip, clip.opacity * visualFade)}>
        <Img src={clip.src} style={croppedMediaStyle(clip)} />
      </div>
    )
  }

  if (clip.type === 'text') {
    return (
      <div style={textContainerStyle(clip, clip.opacity * visualFade)}>
        <div style={textStyle(clip)}>{clip.text ?? 'Text'}</div>
      </div>
    )
  }

  return (
    <Audio
      src={clip.src}
      trimBefore={clip.trimBeforeFrames}
      trimAfter={trimAfter}
      volume={volume}
      muted={clip.muted}
      playbackRate={clip.playbackRate}
    />
  )
}
