import { execSync } from 'node:child_process'

// Underscore-prefixed file → Vercel does not expose this as a public route,
// but bundles it as a regular module for /api/render.ts to import.

export type RenderProgress =
  | { type: 'phase'; phase: string; progress: number; subtitle?: string }
  | { type: 'done'; url: string; size: number }
  | { type: 'error'; message: string }

export function formatSSE(message: RenderProgress): string {
  return `data: ${JSON.stringify(message)}\n\n`
}

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
