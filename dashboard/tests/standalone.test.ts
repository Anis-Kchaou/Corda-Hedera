import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import test from 'node:test'

test('standalone documents endpoint uses local SQLite without a Figma environment', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'medproof-test-'))
  process.env.FIGMA = '0'
  delete process.env.FIGMA_EID
  process.env.PAYLOAD_SECRET = randomBytes(32).toString('hex')
  process.env.DATABASE_URL = pathToFileURL(path.join(directory, 'medproof.db')).href
  process.env.UPLOAD_DIR = path.join(directory, 'uploads')
  Object.assign(process.env, { NODE_ENV: 'development' })

  const { getPayload } = await import('payload')
  const { default: config } = await import('../src/payload.config')
  const payload = await getPayload({ config })
  try {
    const { GET } = await import('../src/app/(frontend)/api/documents/route')
    const response = await GET()
    assert.equal(response.status, 200)
    assert.deepEqual(await response.json(), [])
    assert.equal(payload.config.db.name, 'sqlite')
  } finally {
    await payload.destroy()
    await rm(directory, { recursive: true, force: true })
  }
})
