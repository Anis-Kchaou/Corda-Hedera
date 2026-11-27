import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildConfig, type CollectionConfig } from 'payload'
import { sqliteAdapter } from '@payloadcms/db-sqlite'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { Admins } from './collections/Admins'
import { Media } from './collections/Media'
import { Folders } from './collections/Folders'
import { Tags } from './collections/Tags'
import { ProofDocuments } from './collections/ProofDocuments'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const secret = process.env.PAYLOAD_SECRET
if (!secret || secret.length < 32) {
  throw new Error(
    'Set PAYLOAD_SECRET to a random string of at least 32 characters in .env. See .env.example.',
  )
}

// Uploads are runtime data, not assets to trace into the Next.js server bundle.
const uploadsDir = path.resolve(
  /* turbopackIgnore: true */ process.cwd(),
  process.env.UPLOAD_DIR || 'uploads',
)
function localUploads(collection: CollectionConfig): CollectionConfig {
  return {
    ...collection,
    upload: {
      ...(typeof collection.upload === 'object' ? collection.upload : {}),
      staticDir: path.join(/* turbopackIgnore: true */ uploadsDir, collection.slug),
      disableLocalStorage: false,
    },
  }
}

export default buildConfig({
  secret,
  serverURL: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
  admin: {
    user: Admins.slug,
    importMap: { baseDir: dirname },
  },
  db: sqliteAdapter({
    client: { url: process.env.DATABASE_URL || 'file:./medproof.db' },
    idType: 'uuid',
  }),
  editor: lexicalEditor(),
  collections: [Admins, localUploads(Media), Folders, Tags, localUploads(ProofDocuments)],
  typescript: { outputFile: path.resolve(dirname, 'payload-types.ts') },
  localization: {
    locales: [{ code: 'en', label: 'English' }],
    defaultLocale: 'en',
    fallback: true,
  },
})
