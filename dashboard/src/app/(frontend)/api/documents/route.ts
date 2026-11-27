const API_URL = (process.env.MEDPROOF_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '')
import { getPayload } from 'payload'
import config from '@payload-config'

export async function GET() {
  try {
    const response = await fetch(`${API_URL}/documents`, {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(1500),
    })
    const body = await response.text()
    return new Response(body, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'application/json',
        'Cache-Control': 'no-store',
      },
    })
  } catch {
    const payload = await getPayload({ config })
    const { docs } = await payload.find({
      collection: 'proof-documents',
      overrideAccess: false,
      limit: 100,
      sort: '-createdAt',
    })
    return Response.json(docs, { headers: { 'Cache-Control': 'no-store' } })
  }
}

export async function POST(request: Request) {
  try {
    const form = await request.formData()
    const file = form.get('file')
    const category = form.get('category')
    if (!(file instanceof File) || file.size === 0 || file.size > 10 * 1024 * 1024)
      return Response.json({ error: 'Choose a PDF between 1 byte and 10 MB.' }, { status: 400 })
    if (
      typeof category !== 'string' ||
      !['Lab report', 'Clinical report', 'Imaging report', 'Discharge summary'].includes(category)
    )
      return Response.json({ error: 'Select a document category.' }, { status: 400 })
    const data = Buffer.from(await file.arrayBuffer())
    if (!data.subarray(0, 5).equals(Buffer.from('%PDF-')))
      return Response.json({ error: 'This file is not a valid PDF.' }, { status: 400 })

    const upstream = new FormData()
    upstream.set('file', new Blob([data], { type: 'application/pdf' }), (file as File).name)
    upstream.set('category', category)
    const response = await fetch(`${API_URL}/documents`, {
      method: 'POST',
      body: upstream,
    })
    const body = await response.text()
    return new Response(body, {
      status: response.status,
      headers: { 'Content-Type': response.headers.get('Content-Type') || 'application/json' },
    })
  } catch {
    return Response.json(
      { error: 'Registration could not be saved. Please try again.' },
      { status: 500 },
    )
  }
}
