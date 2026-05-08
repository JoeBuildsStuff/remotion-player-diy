import {
  addBundleToSandbox,
  createSandbox,
  renderMediaOnVercel,
  uploadToVercelBlob,
} from '@remotion/vercel'
import { waitUntil } from '@vercel/functions'
import { z } from 'zod'

import { COMP_NAME } from '../remotion/constants.js'
import { ClipSchema } from '../remotion/schema.js'
import { bundleRemotionProject, formatSSE, type RenderProgress } from './_render-helpers.js'
import { restoreSnapshot } from './_restore-snapshot.js'
import { SANDBOX_CREATING_TIMEOUT } from './sandbox-config.js'

const SHARED_SECRET = process.env.RENDER_SHARED_SECRET

const ExportSettingsSchema = z.object({
  quality: z.number().min(1).max(100),
  audioBitrateKbps: z.number().int().min(64).max(320),
  resolutionScale: z.number().int().min(25).max(100),
})

// Strict request validator. The client must replace `src` with the Blob
// remoteSrc before posting — render-side has no way to read browser blob: URLs.
const RenderRequestSchema = z.object({
  inputProps: z.object({
    clips: z.array(ClipSchema),
    fps: z.number().int().positive(),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    durationInFrames: z.number().int().positive(),
  }),
  exportSettings: ExportSettingsSchema,
})

function qualityToCrf(quality: number) {
  // Remotion forwards CRF to x264: lower is higher quality/larger file.
  // 70 maps near CRF 23, a good default for web MP4 exports.
  return Math.round(36 - quality * 0.18)
}

function unauthorized() {
  return new Response('Unauthorized', { status: 401 })
}

export async function POST(request: Request): Promise<Response> {
  if (!SHARED_SECRET) {
    return new Response('Server misconfigured: RENDER_SHARED_SECRET not set', {
      status: 500,
    })
  }
  if (request.headers.get('x-render-secret') !== SHARED_SECRET) {
    return unauthorized()
  }

  const blobToken = process.env.BLOB_READ_WRITE_TOKEN
  if (!blobToken) {
    return new Response('BLOB_READ_WRITE_TOKEN not set on the server', {
      status: 500,
    })
  }

  let body: z.infer<typeof RenderRequestSchema>
  try {
    body = RenderRequestSchema.parse(await request.json())
  } catch (err) {
    return new Response(
      err instanceof Error ? err.message : 'Invalid request body',
      { status: 400 },
    )
  }

  const encoder = new TextEncoder()
  const stream = new TransformStream<Uint8Array, Uint8Array>()
  const writer = stream.writable.getWriter()

  const send = async (message: RenderProgress) => {
    await writer.write(encoder.encode(formatSSE(message)))
  }

  const runRender = async () => {
    try {
      await send({ type: 'phase', phase: 'Creating sandbox...', progress: 0 })

      let usesPrebuiltSnapshot = false
      let sandbox

      if (process.env.VERCEL) {
        try {
          sandbox = await restoreSnapshot()
          usesPrebuiltSnapshot = true
        } catch (err) {
          console.warn('[render] sandbox snapshot unavailable, creating sandbox:', err)
          await send({
            type: 'phase',
            phase: 'Creating sandbox...',
            progress: 0,
            subtitle: 'No prebuilt snapshot was found, so this render may start slower.',
          })
          sandbox = await createSandbox({
            timeoutInMilliseconds: SANDBOX_CREATING_TIMEOUT,
            onProgress: async ({ progress, message }) => {
              await send({
                type: 'phase',
                phase: message,
                progress,
                subtitle: 'Preparing a fresh render sandbox.',
              })
            },
          })
        }
      } else {
        sandbox = await createSandbox({
          timeoutInMilliseconds: SANDBOX_CREATING_TIMEOUT,
          onProgress: async ({ progress, message }) => {
            await send({
              type: 'phase',
              phase: message,
              progress,
              subtitle: 'This is only needed during local development.',
            })
          },
        })
      }

      try {
        // Prebuilt snapshots already contain the bundle. Fresh sandboxes need
        // the bundle copied in before rendering.
        if (!usesPrebuiltSnapshot) {
          bundleRemotionProject('.remotion')
          await addBundleToSandbox({ sandbox, bundleDir: '.remotion' })
        }

        const { sandboxFilePath, contentType } = await renderMediaOnVercel({
          sandbox,
          compositionId: COMP_NAME,
          inputProps: body.inputProps,
          codec: 'h264',
          crf: qualityToCrf(body.exportSettings.quality),
          audioBitrate: `${body.exportSettings.audioBitrateKbps}K`,
          scale: body.exportSettings.resolutionScale / 100,
          onProgress: async (update) => {
            switch (update.stage) {
              case 'opening-browser':
                await send({
                  type: 'phase',
                  phase: 'Opening browser...',
                  progress: update.overallProgress,
                })
                break
              case 'selecting-composition':
                await send({
                  type: 'phase',
                  phase: 'Selecting composition...',
                  progress: update.overallProgress,
                })
                break
              case 'render-progress':
                await send({
                  type: 'phase',
                  phase: 'Rendering video...',
                  progress: update.overallProgress,
                })
                break
              default:
                break
            }
          },
        })

        await send({ type: 'phase', phase: 'Uploading video...', progress: 1 })

        const { url, size } = await uploadToVercelBlob({
          sandbox,
          sandboxFilePath,
          contentType,
          blobToken,
          access: 'public',
        })

        await send({ type: 'done', url, size })
      } finally {
        await sandbox?.stop().catch(() => {})
      }
    } catch (err) {
      console.error('[render] failed:', err)
      await send({
        type: 'error',
        message: err instanceof Error ? err.message : String(err),
      })
    } finally {
      await writer.close()
    }
  }

  // waitUntil keeps the function alive after the response stream completes —
  // needed because we return the stream early but the render runs longer.
  waitUntil(runRender())

  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
