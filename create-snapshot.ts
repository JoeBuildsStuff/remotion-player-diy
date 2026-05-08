// Builds a Remotion bundle and creates a Vercel Sandbox snapshot containing
// it, then writes the snapshot ID to Vercel Blob. The /api/render endpoint
// loads the snapshot at request time so cold renders skip `npm install`.
//
// Run via `pnpm create-snapshot` — wired into the Vercel build command in
// package.json so a snapshot is created on every deploy.

import { addBundleToSandbox, createSandbox } from '@remotion/vercel'
import { del, list, put } from '@vercel/blob'

import { bundleRemotionProject } from './api/_render-helpers'
import { BUILD_DIR } from './build-dir.mjs'

const getSnapshotBlobKey = () =>
  `snapshot-cache/${process.env.VERCEL_DEPLOYMENT_ID ?? 'local'}.json`

async function main() {
  const sandbox = await createSandbox({
    onProgress: ({ progress, message }) => {
      const pct = Math.round(progress * 100)
      console.log(`[create-snapshot] ${message} (${pct}%)`)
    },
  })

  console.log('[create-snapshot] Bundling Remotion project...')
  bundleRemotionProject(BUILD_DIR)
  await addBundleToSandbox({ sandbox, bundleDir: BUILD_DIR })

  console.log('[create-snapshot] Taking snapshot...')
  const snapshot = await sandbox.snapshot({ expiration: 0 })
  const { snapshotId } = snapshot

  await put(getSnapshotBlobKey(), JSON.stringify({ snapshotId }), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
  })

  console.log(
    `[create-snapshot] Snapshot saved: ${snapshotId} (key=${getSnapshotBlobKey()})`,
  )

  // Delete every other snapshot-cache entry — they reference dead deployments.
  // Sandbox snapshots themselves are billed separately; we can't delete them
  // through @vercel/sandbox today, but Vercel garbage-collects unreferenced
  // snapshots over time and removing the JSON pointers is enough to keep the
  // Blob store tidy.
  const currentKey = getSnapshotBlobKey()
  const { blobs } = await list({ prefix: 'snapshot-cache/' })
  const stale = blobs.filter((b) => b.pathname !== currentKey)
  if (stale.length) {
    await del(stale.map((b) => b.url))
    console.log(`[create-snapshot] Deleted ${stale.length} stale snapshot-cache entries`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
