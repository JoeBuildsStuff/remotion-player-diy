export type SnapshotPointer = {
  snapshotId: string
  createdAt: string
}

export function getSnapshotBlobKey(): string {
  const env = process.env.VERCEL_ENV ?? 'local'
  return `snapshot-cache/${env}.json`
}
