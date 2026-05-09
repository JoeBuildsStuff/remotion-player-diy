import { execSync } from 'node:child_process'

// Underscore-prefixed file → Vercel does not expose this as a public route,
// but bundles it as a regular module for /api/render.ts to import.

// Re-export the SSE wire format from the shared module so the self-hosted
// server (server/index.ts) and this Vercel function emit identical frames.
export { formatSSE, type RenderProgress } from '../shared/sse.js'

/**
 * Bundles the Remotion project to a directory using the Remotion CLI. This
 * runs only in local dev (Sandbox snapshots already include a built bundle
 * in production).
 */
export function bundleRemotionProject(bundleDir: string): void {
  try {
    execSync(`node_modules/.bin/remotion bundle --out-dir ./${bundleDir}`, {
      cwd: process.cwd(),
      stdio: 'inherit',
    })
  } catch (e) {
    const stderr = (e as { stderr?: Buffer }).stderr?.toString() ?? ''
    throw new Error(`Remotion bundle failed: ${stderr}`)
  }
}
