import { NextResponse } from 'next/server'
import { sendCapiEvent } from '@/lib/meta/capi'

// Espelha no servidor (Conversions API) os eventos de topo/meio de funil que hoje
// só disparam pelo pixel do navegador — sem e-mail/telefone (o cliente ainda é
// anônimo nessa etapa), mas com IP/user-agent/fbp/fbc reais, que o navegador
// perde com ad-blocker ou ITP do Safari. Isso é redundância, não substituição:
// o pixel client-side continua disparando normalmente; o event_id em comum faz
// a Meta deduplicar as duas versões do mesmo evento.
const ALLOWED_EVENTS = new Set(['PageView', 'ViewContent', 'AddToCart', 'InitiateCheckout', 'Search'])

function readCookie(cookieHeader: string | null, name: string): string | undefined {
  if (!cookieHeader) return undefined
  const match = cookieHeader.match(new RegExp(`(?:^|; )${name}=([^;]+)`))
  return match ? decodeURIComponent(match[1]) : undefined
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { event_name, event_id, event_source_url, custom_data } = body

    if (!event_name || !ALLOWED_EVENTS.has(event_name) || !event_id) {
      return NextResponse.json({ ok: false }, { status: 400 })
    }

    const cookieHeader = request.headers.get('cookie')
    const forwardedFor = request.headers.get('x-forwarded-for')

    await sendCapiEvent({
      eventName: event_name,
      eventId: event_id,
      eventTime: Math.floor(Date.now() / 1000),
      eventSourceUrl: typeof event_source_url === 'string' ? event_source_url : undefined,
      userData: {
        client_ip_address: forwardedFor?.split(',')[0]?.trim(),
        client_user_agent: request.headers.get('user-agent') ?? undefined,
        fbp: readCookie(cookieHeader, '_fbp'),
        fbc: readCookie(cookieHeader, '_fbc'),
      },
      customData: custom_data ?? undefined,
    })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
