import type { CollectionConfig } from 'payload'
import { createHash } from 'node:crypto'

const staff = ({ req }: { req: { user?: unknown } }) => Boolean(req.user)
export const ProofDocuments: CollectionConfig = {
  slug: 'proof-documents',
  admin: { useAsTitle: 'caseId', group: 'MedProof' },
  access: {
    read: ({ req }) => (req.user ? true : { demo: { equals: true } }),
    create: () => true,
    update: staff,
    delete: staff,
  },
  upload: {
    mimeTypes: ['application/pdf'],
    filesRequiredOnCreate: false,
    modifyResponseHeaders: ({ headers }) => {
      headers.set('Cache-Control', 'private, no-store')
      return headers
    },
  },
  hooks: {
    beforeChange: [
      ({ data, req, operation }) => {
        if (operation === 'create' && req.file) {
          if (req.file.size > 10 * 1024 * 1024) throw new Error('PDF must be under 10 MB.')
          if (!req.file.data.subarray(0, 5).equals(Buffer.from('%PDF-')))
            throw new Error('A valid PDF is required.')
          data.hash = createHash('sha256').update(req.file.data).digest('hex')
          data.status = 'PENDING'
          data.demo = false
          data.cordaTx = null
          data.hederaSequence = null
          data.hederaHash = null
        } else if (operation === 'create' && !data.demo) {
          throw new Error('A PDF file is required.')
        }
        return data
      },
    ],
  },
  fields: [
    {
      name: 'caseId',
      type: 'text',
      required: true,
      maxLength: 32,
      validate: (value: unknown) =>
        (typeof value === 'string' && /^CASE-[A-Z0-9-]{3,24}$/.test(value)) ||
        'Use a pseudonymized ID such as CASE-2024-0842.',
    },
    {
      name: 'category',
      type: 'select',
      options: ['Lab report', 'Clinical report', 'Imaging report', 'Discharge summary'],
      required: true,
    },
    { name: 'hash', type: 'text', access: { create: () => false, update: () => false } },
    {
      name: 'status',
      type: 'select',
      options: ['VALID', 'MODIFIED', 'INCONSISTENT', 'PENDING', 'MISSING'],
      defaultValue: 'PENDING',
      access: { create: () => false, update: staff },
    },
    {
      name: 'demo',
      type: 'checkbox',
      defaultValue: false,
      access: { create: () => false, update: () => false },
    },
    { name: 'cordaTx', type: 'text', access: { create: () => false, update: staff } },
    { name: 'hederaSequence', type: 'text', access: { create: () => false, update: staff } },
    { name: 'hederaHash', type: 'text', access: { create: () => false, update: staff } },
  ],
}
