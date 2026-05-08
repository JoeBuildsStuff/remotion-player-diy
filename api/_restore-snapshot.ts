import { get } from '@vercel/blob'
import { Sandbox } from '@vercel/sandbox'

import { SANDBOX_CREATING_TIMEOUT } from './sandbox-config.js'
import { getSnapshotBlobKey, type SnapshotPointer } from './snapshot-pointer.js'

/**
 * Loads a Sandbox snapshot ID from Vercel Blob and instantiates a Sandbox
 * from it. Snapshots are created out-of-band by `pnpm create-snapshot`,
 * letting cold renders skip `npm install`. The Remotion bundle is added
 * fresh by the caller after restore — the snapshot intentionally does not
 * contain it, to avoid drift.
 */
export async function restoreSnapshot() {
  const key = getSnapshotBlobKey()

  const blob = await get(key, {
    access: 'public',
    token: process.env.BLOB_READ_WRITE_TOKEN,
  })

  if (!blob || blob.statusCode !== 200 || !blob.stream) {
    throw new Error(
      `No sandbox snapshot pointer found at ${key}. Run \`pnpm create-snapshot\` for this environment.`,
    )
  }

  const pointer = (await new Response(blob.stream).json()) as SnapshotPointer
  const { snapshotId, createdAt } = pointer

  if (!snapshotId) {
    throw new Error(
      `Snapshot pointer at ${key} contains no snapshotId — re-run \`pnpm create-snapshot\`.`,
    )
  }

  if (createdAt) {
    const ageMs = Date.now() - Date.parse(createdAt)
    const ageDays = (ageMs / 86_400_000).toFixed(1)
    console.log(
      `[render] Restoring snapshot ${snapshotId} (created ${createdAt}, age ${ageDays}d)`,
    )
  } else {
    console.log(`[render] Restoring snapshot ${snapshotId} (createdAt unknown)`)
  }

  return Sandbox.create({
    source: { type: 'snapshot', snapshotId },
    timeout: SANDBOX_CREATING_TIMEOUT,
  })
}
