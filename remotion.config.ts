// Remotion CLI / bundler config. Only consulted by `remotion bundle` and
// `remotion studio` — the Vercel Sandbox runtime does its own bundling
// driven by @remotion/vercel.
//
// See: https://remotion.dev/docs/config

import { Config } from '@remotion/cli/config'

Config.setEntryPoint('./remotion/index.ts')
Config.setVideoImageFormat('jpeg')
