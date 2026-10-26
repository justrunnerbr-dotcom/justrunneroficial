import { createHmac, timingSafeEqual } from 'crypto'
import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/admin-client'

export const runtime = 'nodejs' // precisa do módulo crypto do Node, não roda em edge

// Por enquanto só guarda os eventos em ig_events. O assistente do direct
// (porte da JHF) entra depois e passa a processar daqui.

// ── Handshake de verificação (Meta chama isso 1x ao salvar o webhook) ─────
export async function GET(request: Request) {
  const url = new URL(request.url)
  const mode = url.searchParams.get('hub.mode')
  const token = url.searchParams.get('hub.verify_token')
  const challenge = url.searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token && token === process.env.IG_WEBHOOK_VERIFY_TOKEN && challenge) {
    return new NextResponse(challenge, { status: 200 })
  }
  return new NextResponse('Forbidden', { status: 403 })
}

// ── Eventos de verdade (comentário, mensagem, resposta de story) ──────────
export async function POST(request: Request) {
  const rawBody = await request.text()

  if (!isValidSignature(rawBody, request.headers.get('x-hub-signature-256'))) {
    return new NextResponse('Invalid signature', { status: 401 })
  }

  const payload = JSON.parse(rawBody)
  await getAdminSupabase().from('ig_events').insert({
    event_type: guessEventType(payload),
    raw_payload: payload,
  })

  return NextResponse.json({ ok: true })
}

function isValidSignature(rawBody: string, header: string | null): boolean {
  if (!header || !process.env.IG_APP_SECRET) return false
  const expected = 'sha256=' + createHmac('sha256', process.env.IG_APP_SECRET).update(rawBody).digest('hex')
  const a = Buffer.from(header)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

function guessEventType(payload: unknown): string {
  const p = payload as { entry?: { changes?: { field?: string }[]; messaging?: unknown[] }[] }
  const entry = p.entry?.[0]
  if (entry?.changes?.[0]?.field === 'comments') return 'comment'
  if (entry?.messaging) return 'message'
  return 'unknown'
}
