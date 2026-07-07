import { NextResponse } from 'next/server'
import { sendCapiPurchase, hashEmail, hashPhone, hashExternalId } from '@/lib/meta/capi'
import { normalizePhone } from '@/lib/yampi/sync'

// Espelha o Purchase que o webhook da Yampi ja dispara (server-to-server, sem fbp/fbc
// reais) com uma segunda versao vinda do navegador na pagina de obrigado — MESMO
// event_id das duas (yampi_purchase_{saleId}), entao a Meta funde as duas em um so
// evento pro efeito de match: o webhook contribui em/ph/ip garantidos, essa aqui
// contribui fbp/fbc reais do cookie do navegador (o webhook nao tem acesso a isso,
// e' server-to-server puro). Sem essa pagina, Purchase nunca teria fbp/fbc.
function readCookie(cookieHeader: string | null, name: string): string | undefined {
  if (!cookieHeader) return undefined
  const match = cookieHeader.match(new RegExp(`(?:^|; )${name}=([^;]+)`))
  return match ? decodeURIComponent(match[1]) : undefined
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { sale_id, value, email, phone, content_ids, num_items, event_source_url } = body
    if (!sale_id || value == null) {
      return NextResponse.json({ ok: false }, { status: 400 })
    }

    const cookieHeader = request.headers.get('cookie')
    const forwardedFor = request.headers.get('x-forwarded-for')
    const normalizedPhone = phone ? normalizePhone(String(phone)) : null

    await sendCapiPurchase({
      eventId: `yampi_purchase_${sale_id}`,
      eventTime: Math.floor(Date.now() / 1000),
      eventSourceUrl: typeof event_source_url === 'string' ? event_source_url : undefined,
      userData: {
        ...(email ? { em: hashEmail(String(email)) } : {}),
        ...(normalizedPhone ? { ph: hashPhone(normalizedPhone) } : {}),
        ...(email ? { external_id: hashExternalId(String(email)) } : {}),
        client_ip_address: forwardedFor?.split(',')[0]?.trim(),
        client_user_agent: request.headers.get('user-agent') ?? undefined,
        fbp: readCookie(cookieHeader, '_fbp'),
        fbc: readCookie(cookieHeader, '_fbc'),
      },
      customData: {
        value: Number(value),
        currency: 'BRL',
        content_ids: Array.isArray(content_ids) ? content_ids : undefined,
        content_type: 'product',
        num_items: typeof num_items === 'number' ? num_items : undefined,
        order_id: String(sale_id),
      },
    })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
