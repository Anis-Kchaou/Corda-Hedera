const API_URL = (process.env.MEDPROOF_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '')

export async function GET() {
  try {
    const response = await fetch(`${API_URL}/health`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(1500),
    })
    const body = await response.text()
    return new Response(body, {
      status: response.status,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    })
  } catch {
    return Response.json({ status: 'offline' }, { status: 503 })
  }
}
