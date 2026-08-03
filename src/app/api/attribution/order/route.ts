import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { STORE_ID } from '@/lib/yampi/sync'

// Chamado pela página /obrigado (único momento pós-compra em que o navegador do
// cliente ainda é nosso). Fecha três buracos que o webhook da Yampi não consegue
// fechar sozinho, porque ele é server-to-server e o pedido dela só carrega
// utm_source/utm_medium/utm_campaign:
//
//   1. grava utm_content/utm_term (nome do anúncio e do conjunto) no pedido —
//      é o que dá granularidade de "qual criativo vendeu" nos nossos próprios dados;
//   2. marca a sessão como convertida (sessions.converted era false em 3.367 de 3.367);
//   3. registra o evento `purchase` em `events`, que nunca existiu — o funil interno
//      terminava em initiate_checkout.
//
// O Purchase do Meta NÃO passa por aqui: quem dispara é metaPurchase() no cliente
// (com _fbp/_fbc) e o webhook (com em/ph/ip), os dois com o mesmo event_id.
function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  )
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

interface Body {
  sale_id?:     string
  value?:       number
  session_id?:  string
  visitor_id?:  string
  attribution?: Record<string, string>
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Body
    const saleId = body.sale_id
    if (!saleId) return NextResponse.json({ ok: true, skipped: 'sem sale_id' })

    const db   = getDb()
    const attr = body.attribution ?? {}
    const done: string[] = []

    // 1. Pedido — o webhook pode ainda não ter chegado (corrida entre o redirect do
    // navegador e o POST server-to-server da Yampi), então tenta de novo uma vez.
    let orderId: string | null = null
    for (let tentativa = 0; tentativa < 2 && !orderId; tentativa++) {
      if (tentativa > 0) await sleep(4000)
      const { data } = await db
        .from('orders')
        .select('id, utm_source, utm_medium, utm_campaign')
        .eq('store_id', STORE_ID)
        .eq('external_id', saleId)
        .maybeSingle()
      if (data) {
        orderId = data.id
        const patch: Record<string, unknown> = {
          // utm_content/utm_term a Yampi nunca preenche — nossos dados são a única fonte.
          ...(attr.utm_content ? { utm_content: attr.utm_content } : {}),
          ...(attr.utm_term    ? { utm_term:    attr.utm_term    } : {}),
          // Os três clássicos só entram se o pedido veio sem eles, pra não sobrescrever
          // o que a própria Yampi capturou no checkout.
          ...(!data.utm_source   && attr.utm_source   ? { utm_source:   attr.utm_source   } : {}),
          ...(!data.utm_medium   && attr.utm_medium   ? { utm_medium:   attr.utm_medium   } : {}),
          ...(!data.utm_campaign && attr.utm_campaign ? { utm_campaign: attr.utm_campaign } : {}),
          metadata: { attribution: attr, session_id: body.session_id ?? null },
          updated_at: new Date().toISOString(),
        }
        await db.from('orders').update(patch).eq('id', orderId)
        done.push('pedido')
      }
    }

    // 2. Sessão convertida
    if (body.session_id) {
      const { error } = await db
        .from('sessions')
        .update({ converted: true, conversion_value: body.value ?? null })
        .eq('store_id', STORE_ID)
        .eq('id', body.session_id)
      if (!error) done.push('sessao')
    }

    // 3. Evento de compra no funil interno
    await db.from('events').insert({
      store_id:     STORE_ID,
      session_id:   body.session_id ?? null,
      visitor_id:   body.visitor_id ?? null,
      event_type:   'purchase',
      page:         '/obrigado',
      value:        body.value ?? null,
      currency:     'BRL',
      properties:   { order_external_id: saleId, attribution: attr },
      utm_source:   attr.utm_source   ?? null,
      utm_medium:   attr.utm_medium   ?? null,
      utm_campaign: attr.utm_campaign ?? null,
    })
    done.push('evento')

    return NextResponse.json({ ok: true, gravado: done, order_encontrado: !!orderId })
  } catch (err) {
    console.error('[attribution/order]', err)
    // Nunca falha pro cliente: a página /obrigado não pode quebrar por causa disso.
    return NextResponse.json({ ok: false }, { status: 200 })
  }
}
