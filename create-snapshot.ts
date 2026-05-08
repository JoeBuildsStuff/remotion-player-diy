// Creates a Vercel Sandbox snapshot containing the installed Node modules
// (no Remotion bundle), then writes the snapshot ID + creation time to Vercel
// Blob. The /api/render endpoint loads the snapshot at request time so cold
// renders skip `npm install`. The bundle itself is pushed fresh on every
// render to avoid drift between snapshot and deployed code.
//
// Run via `pnpm create-snapshot` when the render sandbox image needs to be
// refreshed (e.g. dependency upgrades). Normal app deploys do not depend on
// this snapshot step.

import { createSandbox } from '@remotion/vercel'
import { Snapshot } from '@vercel/sandbox'
import { del, list, put } from '@vercel/blob'

import { SANDBOX_CREATING_TIMEOUT, SNAPSHOT_EXPIRATION_MS } from './api/sandbox-config'
import { getSnapshotBlobKey, type SnapshotPointer } from './api/snapshot-pointer'

async function main() {
  const sandbox = await createSandbox({
    timeoutInMilliseconds: SANDBOX_CREATING_TIMEOUT,
    onProgress: ({ progress, message }) => {
      const pct = Math.round(progress * 100)
      console.log(`[create-snapshot] ${message} (${pct}%)`)
    },
  })

  const key = getSnapshotBlobKey()

  const previousPointer = await readPreviousPointer(key)

  console.log('[create-snapshot] Taking snapshot...')
  const snapshot = await sandbox.snapshot({ expiration: SNAPSHOT_EXPIRATION_MS })
  const { snapshotId } = snapshot

  const pointer: SnapshotPointer = {
    snapshotId,
    createdAt: new Date().toISOString(),
  }

  await put(key, JSON.stringify(pointer), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
  })

  console.log(
    `[create-snapshot] Snapshot saved: ${snapshotId} (key=${key}, expires in ${SNAPSHOT_EXPIRATION_MS / 86_400_000}d)`,
  )

  await deletePreviousSnapshot(previousPointer, snapshotId)
  await deleteStalePointers(key)
}

async function readPreviousPointer(key: string): Promise<SnapshotPointer | null> {
  const { blobs } = await list({ prefix: key })
  const existing = blobs.find((b) => b.pathname === key)
  if (!existing) return null
  try {
    const res = await fetch(existing.url)
    if (!res.ok) return null
    return (await res.json()) as SnapshotPointer
  } catch (err) {
    console.warn('[create-snapshot] Failed to read previous pointer:', err)
    return null
  }
}

async function deletePreviousSnapshot(
  previous: SnapshotPointer | null,
  newSnapshotId: string,
) {
  if (!previous?.snapshotId) return
  if (previous.snapshotId === newSnapshotId) return
  try {
    const snapshot = await Snapshot.get({ snapshotId: previous.snapshotId })
    await snapshot.delete()
    console.log(`[create-snapshot] Deleted previous snapshot ${previous.snapshotId}`)
  } catch (err) {
    console.warn(
      `[create-snapshot] Failed to delete previous snapshot ${previous.snapshotId}:`,
      err,
    )
  }
}

async function deleteStalePointers(currentKey: string) {
  const { blobs } = await list({ prefix: 'snapshot-cache/' })
  const stale = blobs.filter((b) => b.pathname !== currentKey)
  if (!stale.length) return
  await del(stale.map((b) => b.url))
  console.log(`[create-snapshot] Deleted ${stale.length} stale snapshot-cache pointer(s)`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
