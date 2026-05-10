import { useCallback, useState } from 'react'

import type { ExportSettings } from '@/components/editor/model/editor-context-value'
import type { Clip } from '@/components/editor/model/editor-types'
import {
  RENDERING_AVAILABLE,
  RENDERING_DISABLED_MESSAGE,
} from '@/components/editor/model/render-mode'

const SHARED_SECRET = import.meta.env.VITE_RENDER_SHARED_SECRET as
  | string
  | undefined

export type RenderState =
  | { status: 'idle' }
  | {
      status: 'rendering'
      phase: string
      progress: number
      subtitle: string | null
    }
  | { status: 'done'; url: string; size: number }
  | { status: 'error'; error: string }

type SSEMessage =
  | { type: 'phase'; phase: string; progress: number; subtitle?: string }
  | { type: 'done'; url: string; size: number }
  | { type: 'error'; message: string }

export type RenderInputs = {
  clips: Clip[]
  fps: number
  width: number
  height: number
  durationInFrames: number
  exportSettings: ExportSettings
}

/**
 * Strips editor-only fields and substitutes `remoteSrc` for `src` on every
 * media clip. The render Sandbox can't fetch browser blob: URLs.
 */
function buildRenderPayload(inputs: RenderInputs) {
  const clips = inputs.clips.map((clip) => {
    if (clip.type === 'text') {
      return {
        ...clip,
        // Drop transient editor fields.
        uploadStatus: undefined,
        uploadError: undefined,
        remoteSrc: undefined,
      }
    }

    if (!clip.remoteSrc) {
      throw new Error(
        `Clip "${clip.name}" has no remote source — wait for upload to finish before rendering.`,
      )
    }

    return {
      ...clip,
      src: clip.remoteSrc,
      remoteSrc: undefined,
      uploadStatus: undefined,
      uploadError: undefined,
    }
  })

  return {
    inputProps: {
      clips,
      fps: inputs.fps,
      width: inputs.width,
      height: inputs.height,
      durationInFrames: inputs.durationInFrames,
    },
    exportSettings: inputs.exportSettings,
  }
}

export function useRendering() {
  const [state, setState] = useState<RenderState>({ status: 'idle' })

  const reset = useCallback(() => setState({ status: 'idle' }), [])

  const renderMedia = useCallback(async (inputs: RenderInputs) => {
    if (!RENDERING_AVAILABLE) {
      setState({ status: 'error', error: RENDERING_DISABLED_MESSAGE })
      return
    }
    if (!SHARED_SECRET) {
      setState({
        status: 'error',
        error: 'VITE_RENDER_SHARED_SECRET is not set',
      })
      return
    }

    let payload: ReturnType<typeof buildRenderPayload>
    try {
      payload = buildRenderPayload(inputs)
    } catch (err) {
      setState({
        status: 'error',
        error: err instanceof Error ? err.message : String(err),
      })
      return
    }

    setState({
      status: 'rendering',
      phase: 'Starting...',
      progress: 0,
      subtitle: null,
    })

    try {
      const response = await fetch('/api/render', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-render-secret': SHARED_SECRET,
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok || !response.body) {
        const errText = await response.text().catch(() => '')
        throw new Error(
          `Failed to start render (${response.status}) ${errText}`.trim(),
        )
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      // SSE frames are separated by blank lines. Buffer across chunks.
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const frames = buffer.split('\n\n')
        buffer = frames.pop() ?? ''

        for (const frame of frames) {
          if (!frame.startsWith('data: ')) continue
          const json = frame.slice(6)
          const message = JSON.parse(json) as SSEMessage

          if (message.type === 'phase') {
            setState({
              status: 'rendering',
              phase: message.phase,
              progress: message.progress,
              subtitle: message.subtitle ?? null,
            })
          } else if (message.type === 'done') {
            setState({
              status: 'done',
              url: message.url,
              size: message.size,
            })
          } else if (message.type === 'error') {
            setState({ status: 'error', error: message.message })
          }
        }
      }
    } catch (err) {
      setState({
        status: 'error',
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }, [])

  return { state, renderMedia, reset }
}
