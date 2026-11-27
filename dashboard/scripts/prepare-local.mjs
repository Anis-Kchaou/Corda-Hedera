import { createRequire } from 'node:module'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

// Exported import maps may still reference managed-only admin components.
// Make already maintains its own import map through its lifecycle scripts.
if (process.env.FIGMA !== '1') {
  const require = createRequire(import.meta.url)
  const payloadBin = path.resolve(path.dirname(require.resolve('payload')), '../bin.js')
  const result = spawnSync(process.execPath, [payloadBin, 'generate:importmap'], {
    stdio: 'inherit',
    env: process.env,
  })
  if (result.error) throw result.error
  process.exit(result.status ?? 1)
}
