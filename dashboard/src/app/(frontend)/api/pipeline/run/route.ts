const API_URL = (process.env.MEDPROOF_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '')

export async function POST() {
  try {
    const response = await fetch(`${API_URL}/pipeline/run`, {
      method: 'POST',
      cache: 'no-store',
    })
    const body = await response.text()
    return new Response(body, {
      status: response.status,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch {
    return Response.json({ error: 'FastAPI pipeline unavailable.' }, { status: 503 })
  }
}
