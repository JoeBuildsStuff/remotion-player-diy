import { z } from 'zod'

/**
 * Zod schema for the Clip type that mirrors src/components/editor/model/editor-types.ts.
 *
 * Lives in the renderer-only directory so the Remotion bundler doesn't pull
 * in the rest of the editor source (and its DOM-only deps) at render time.
 *
 * Keep this in sync with `Clip` in editor-types.ts.
 */

export const ClipSchema = z.object({
  id: z.string(),
  type: z.enum(['video', 'audio', 'image', 'text']),
  src: z.string(),
  // Editor-only fields are stripped before sending to /api/render. They're
  // optional here so old payloads still parse, but they're ignored at render.
  remoteSrc: z.string().optional(),
  uploadStatus: z.enum(['idle', 'uploading', 'ready', 'error']).optional(),
  uploadError: z.string().optional(),
  name: z.string(),
  sourceDurationInFrames: z.number(),
  startFrame: z.number(),
  durationInFrames: z.number(),
  trimBeforeFrames: z.number(),
  trimAfterFrames: z.number().nullable(),
  trackIndex: z.number(),
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  rotation: z.number(),
  opacity: z.number(),
  borderRadius: z.number(),
  cropLeft: z.number(),
  cropTop: z.number(),
  cropRight: z.number(),
  cropBottom: z.number(),
  playbackRate: z.number(),
  volumeDb: z.number(),
  muted: z.boolean(),
  visible: z.boolean(),
  videoFadeInFrames: z.number(),
  videoFadeOutFrames: z.number(),
  audioFadeInFrames: z.number(),
  audioFadeOutFrames: z.number(),
  text: z.string().optional(),
  fontFamily: z.string().optional(),
  fontWeight: z.string().optional(),
  fontSize: z.number().optional(),
  lineHeight: z.number().optional(),
  letterSpacing: z.number().optional(),
  textAlign: z.enum(['left', 'center', 'right']).optional(),
  textDirection: z.enum(['ltr', 'rtl']).optional(),
  textColor: z.string().optional(),
  strokeColor: z.string().optional(),
  strokeWidth: z.number().optional(),
  backgroundColor: z.string().optional(),
  backgroundPaddingX: z.number().optional(),
  backgroundBorderRadius: z.number().optional(),
})

export const CompositionPropsSchema = z.object({
  clips: z.array(ClipSchema),
})

export type CompositionPropsInput = z.infer<typeof CompositionPropsSchema>
