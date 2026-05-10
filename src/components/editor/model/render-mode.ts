// Single source of truth for which deploy mode the editor is running in and
// whether server-side rendering is available from the browser.

export type DeployMode = 'vercel' | 'selfhost'

export const DEPLOY_MODE: DeployMode =
  (import.meta.env.VITE_DEPLOY_MODE as DeployMode | undefined) ?? 'vercel'

// Cloud rendering uses Vercel Blob + Sandbox + Cron and costs money per call,
// so the public OSS demo keeps it disabled. Self-hosters opt in by setting
// VITE_CLOUD_RENDER_ENABLED=true (plus the matching server CLOUD_RENDER_ENABLED
// and the secrets documented in the README).
//
// Selfhost mode does its own local rendering and uploads, so it's always on.
export const RENDERING_AVAILABLE: boolean =
  DEPLOY_MODE === 'selfhost' ||
  import.meta.env.VITE_CLOUD_RENDER_ENABLED === 'true'

export const RENDERING_DISABLED_MESSAGE =
  'Server-side rendering is disabled on this public demo. Self-host with Docker or enable cloud rendering on your own Vercel deploy — see the README.'
