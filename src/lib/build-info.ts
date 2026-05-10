export type AppBuildInfo = {
  releaseVersion: string
  commitSha: string
  commitShortSha: string
  commitRef: string
  commitMessage: string
  buildTime: string
  deployMode: string
  vercelEnvironment: string
  deploymentUrl: string
}

declare const __APP_BUILD_INFO__: AppBuildInfo

export const buildInfo = __APP_BUILD_INFO__
