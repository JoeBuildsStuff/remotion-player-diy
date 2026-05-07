import { get } from '@vercel/blob'
import { Sandbox } from '@vercel/sandbox'

const SANDBOX_CREATING_TIMEOUT = 5 * 60 * 1000

const getSnapshotBlobKey = () =>
  `snapshot-cache/${process.env.VERCEL_DEPLOYMENT_ID ?? 'local'}.json`

/**
 * Loads a Sandbox snapshot ID from Vercel Blob and instantiates a Sandbox
 * from it. Snapshots are created at deploy time by `create-snapshot.ts`,
 * letting cold renders skip `npm install` + `addBundleToSandbox`.
 */
export async function restoreSnapshot() {
  const blob = await get(getSnapshotBlobKey(), {
    access: 'public',
    token: process.env.BLOB_READ_WRITE_TOKEN,
  })

  if (!blob || blob.statusCode !== 200 || !blob.stream) {
    throw new Error(
      'No sandbox snapshot found. Run `pnpm create-snapshot` as part of the build process.',
    )
  }

  const cache = (await new Response(blob.stream).json()) as {
    snapshotId: string
  }
  const { snapshotId } = cache

  if (!snapshotId) {
    throw new Error(
      'Snapshot blob exists but contains no snapshotId — re-run `pnpm create-snapshot`.',
    )
  }

  return Sandbox.create({
    source: { type: 'snapshot', snapshotId },
    timeout: SANDBOX_CREATING_TIMEOUT,
  })
}
