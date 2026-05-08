export const SANDBOX_CREATING_TIMEOUT = 15 * 60 * 1000

// 30 days. Snapshots auto-delete after this — refreshing them serves as a
// canary that the snapshot pipeline still works.
export const SNAPSHOT_EXPIRATION_MS = 30 * 24 * 60 * 60 * 1000
