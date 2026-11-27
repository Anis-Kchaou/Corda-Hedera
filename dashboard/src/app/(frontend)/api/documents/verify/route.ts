const API_URL = (process.env.MEDPROOF_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '')

export async function POST(request: Request) {
  try {
    const form = await request.formData()
    const file = form.get('file')
    const caseId = form.get('caseId')
    if (!(file instanceof File) || file.size === 0 || file.size > 10 * 1024 * 1024)
      return Response.json({ error: 'Choose a PDF between 1 byte and 10 MB.' }, { status: 400 })
    if (typeof caseId !== 'string' || !/^CASE-[A-Z0-9-]{3,24}$/.test(caseId))
      return Response.json({ error: 'Enter the pseudonymized case ID.' }, { status: 400 })

    const data = Buffer.from(await file.arrayBuffer())
    if (!data.subarray(0, 5).equals(Buffer.from('%PDF-')))
      return Response.json({ error: 'This file is not a valid PDF.' }, { status: 400 })

    const upstream = new FormData()
    upstream.set('file', new Blob([data], { type: 'application/pdf' }), (file as File).name)
    const response = await fetch(
      `${API_URL}/documents/${encodeURIComponent(caseId)}/verify`,
      { method: 'POST', body: upstream },
    )
    const body = await response.text()
    return new Response(body, {
      status: response.status,
      headers: { 'Content-Type': response.headers.get('Content-Type') || 'application/json' },
    })
  } catch {
    return Response.json(
      { error: 'The MedProof API is unavailable. Start the FastAPI server on port 8000.' },
      { status: 503 },
    )
  }
}
