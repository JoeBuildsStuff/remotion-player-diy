// Load .env.local (and .env) before any other server module reads process.env.
import { config } from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
config({ path: path.join(root, '.env.local') })
config({ path: path.join(root, '.env') })
