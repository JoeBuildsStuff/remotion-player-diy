import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const packageJson = JSON.parse(readFileSync('./package.json', 'utf8')) as {
  version?: string
}

function gitValue(command: string) {
  try {
    return execSync(command, { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim()
  } catch {
    return ''
  }
}

const releaseVersion =
  process.env.VITE_APP_VERSION ||
  gitValue('git describe --tags --abbrev=0') ||
  packageJson.version ||
  '0.0.0'

const commitSha =
  process.env.VERCEL_GIT_COMMIT_SHA ||
  process.env.VITE_GIT_COMMIT_SHA ||
  process.env.GITHUB_SHA ||
  gitValue('git rev-parse HEAD')

const commitRef =
  process.env.VERCEL_GIT_COMMIT_REF ||
  process.env.VITE_GIT_COMMIT_REF ||
  process.env.GITHUB_REF_NAME ||
  gitValue('git rev-parse --abbrev-ref HEAD')

const deploymentUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : process.env.VITE_DEPLOYMENT_URL || ''

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    __APP_BUILD_INFO__: JSON.stringify({
      releaseVersion,
      commitSha,
      commitShortSha: commitSha.slice(0, 7),
      commitRef,
      commitMessage:
        process.env.VERCEL_GIT_COMMIT_MESSAGE ||
        process.env.VITE_GIT_COMMIT_MESSAGE ||
        gitValue('git log -1 --pretty=%s'),
      buildTime: process.env.VITE_BUILD_TIME || new Date().toISOString(),
      deployMode:
        process.env.VITE_DEPLOY_MODE || (process.env.VERCEL ? 'vercel' : 'local'),
      vercelEnvironment: process.env.VERCEL_ENV || '',
      deploymentUrl,
    }),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    dedupe: ['mediabunny'],
  },
  optimizeDeps: {
    include: ['mediabunny'],
  },
})
