// Shared SSE wire format for the render endpoint.
//
// Both the Vercel deploy (api/render.ts) and the self-hosted Node server
// (server/index.ts) emit this exact frame shape so the browser client in
// src/components/editor/model/use-rendering.ts works against either backend
// without changes.

export type RenderProgress =
  | { type: 'phase'; phase: string; progress: number; subtitle?: string }
  | { type: 'done'; url: string; size: number }
  | { type: 'error'; message: string }

export function formatSSE(message: RenderProgress): string {
  return `data: ${JSON.stringify(message)}\n\n`
}
