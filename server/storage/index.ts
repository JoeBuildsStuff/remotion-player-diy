// Factory: reads env, builds the right adapter, ensures its directories exist.

import path from 'node:path'

import { LocalStorageAdapter } from './local.js'
import { S3StorageAdapter, defaultTmpDir } from './s3.js'
import type { StorageAdapter } from './types.js'

export type { StorageAdapter, StoredObject, PurgeResult } from './types.js'

export interface StorageEnv {
  STORAGE_BACKEND?: string
  DATA_DIR?: string
  SOURCES_DIR?: string
  RENDERS_DIR?: string
  PUBLIC_BASE_URL: string
  MEDIA_URL_SIGNING_SECRET?: string
  SOURCES_TTL_DAYS: number
  RENDERS_TTL_DAYS: number
  // S3-specific
  S3_BUCKET?: string
  S3_REGION?: string
  S3_ENDPOINT?: string
  S3_FORCE_PATH_STYLE?: string
  S3_ACCESS_KEY_ID?: string
  S3_SECRET_ACCESS_KEY?: string
  S3_SOURCES_PREFIX?: string
  S3_RENDERS_PREFIX?: string
  S3_PUBLIC_BASE_URL?: string
  S3_TMP_DIR?: string
}

export async function createStorageAdapter(
  env: StorageEnv,
): Promise<StorageAdapter> {
  const backend = (env.STORAGE_BACKEND ?? 'local').toLowerCase()

  if (backend === 's3') {
    if (!env.S3_BUCKET) {
      throw new Error('STORAGE_BACKEND=s3 requires S3_BUCKET to be set')
    }
    if (!env.S3_REGION) {
      throw new Error('STORAGE_BACKEND=s3 requires S3_REGION to be set')
    }
    const adapter = new S3StorageAdapter({
      bucket: env.S3_BUCKET,
      region: env.S3_REGION,
      endpoint: env.S3_ENDPOINT,
      forcePathStyle: env.S3_FORCE_PATH_STYLE === 'true',
      accessKeyId: env.S3_ACCESS_KEY_ID,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY,
      sourcesPrefix: env.S3_SOURCES_PREFIX ?? 'sources',
      rendersPrefix: env.S3_RENDERS_PREFIX ?? 'renders',
      publicBaseUrl: env.S3_PUBLIC_BASE_URL,
      sourcesTtlDays: env.SOURCES_TTL_DAYS,
      rendersTtlDays: env.RENDERS_TTL_DAYS,
      tmpDir: env.S3_TMP_DIR ?? defaultTmpDir(),
    })
    await adapter.init()
    return adapter
  }

  if (backend !== 'local') {
    throw new Error(
      `Unknown STORAGE_BACKEND="${backend}" (expected "local" or "s3")`,
    )
  }

  const dataDir = env.DATA_DIR ?? path.resolve('data')
  const sourcesDir = env.SOURCES_DIR ?? path.join(dataDir, 'sources')
  const rendersDir = env.RENDERS_DIR ?? path.join(dataDir, 'renders')
  const adapter = new LocalStorageAdapter({
    sourcesDir,
    rendersDir,
    publicBaseUrl: env.PUBLIC_BASE_URL,
    signingSecret: env.MEDIA_URL_SIGNING_SECRET || undefined,
    sourcesTtlDays: env.SOURCES_TTL_DAYS,
    rendersTtlDays: env.RENDERS_TTL_DAYS,
  })
  await adapter.init()
  return adapter
}
