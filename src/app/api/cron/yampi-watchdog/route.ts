import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { upsertYampiOrder, type YampiOrderResource } from '@/lib/yampi/sync'
import { refreshDailyAnalytics } from '@/lib/admin/daily-analytics'

// Vigia diário do sync de pedidos. A Yampi desativa o webhook sozinha depois de
// falhas de entrega — já aconteceu duas vezes (21/07 e 19/08/2026) e na segunda
// o admin ficou 7 semanas sem pedido novo sem ninguém perceber. Aqui:
//   1. reativa o webhook se estiver desligado;
//   2. reprocessa os pedidos dos últimos DIAS dias (upsert idempotente, sem
//      evento da Meta — o tempo real é com o webhook);
//   3. recalcula daily_analytics desses dias.

export const maxDuration = 60

const TZ = 'America/Sao_Paulo'
const DIAS = 3
const WEBHOOK_ID = 1754608
const WEBHOOK = {
  name:   'Just Runner - Admin Dashboard Sync',
  url:    'https://justrunner.com.br/api/webhooks/yampi',
  events: ['order.created', 'order.status.updated', 'order.updated', 'order.paid'],
  active: true,
}

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }

  const alias = process.env.NEXT_PUBLIC_YAMPI_ALIAS
  const token = process.env.YAMPI_API_TOKEN
  const secretKey = process.env.YAMPI_SECRET_KEY
  if (!alias || !token || !secretKey) {
    return NextResponse.json({ ok: false, error: 'credenciais da Yampi ausentes' }, { status: 500 })
  }
  const base = `https://api.dooki.com.br/v2/${alias}`
  const headers = { 'User-Token': token, 'User-Secret-Key': secretKey, 'Content-Type': 'application/json' }

  // 1. Webhook
  const atual = await (await fetch(`${base}/webhooks/${WEBHOOK_ID}`, { headers })).json()
  let webhook = atual?.data?.active ? 'ativo' : 'inativo'
  if (!atual?.data?.active) {
    // O PUT exige o payload completo; só {active:true} devolve 422.
    const res = await fetch(`${base}/webhooks/${WEBHOOK_ID}`, { method: 'PUT', headers, body: JSON.stringify(WEBHOOK) })
    webhook = res.ok ? 'reativado' : `falhou reativar (${res.status})`
    console.error(`[yampi-watchdog] webhook estava desativado (disabled_at=${JSON.stringify(atual?.data?.disabled_at)}) -> ${webhook}`)
  }

  // 2. Pedidos dos últimos dias
  const desde = new Date(Date.now() - DIAS * 86400000).toLocaleDateString('en-CA', { timeZone: TZ })
  const pedidos: YampiOrderResource['data'][] = []
  for (let page = 1; page <= 5; page++) {
    const res = await fetch(
      `${base}/orders?limit=100&include=items,customer,transactions,status,shipping_address&orderBy=id&sortedBy=desc&page=${page}`,
      { headers },
    )
    if (!res.ok) return NextResponse.json({ ok: false, webhook, error: `orders ${res.status}` }, { status: 502 })
    const { data } = await res.json()
    for (const o of data) if ((o.created_at?.date ?? '') >= desde) pedidos.push(o)
    if (data.length === 0 || (data.at(-1).created_at?.date ?? '') < desde) break
  }

  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  })
  let gravados = 0
  const falhas: string[] = []
  for (const o of pedidos) {
    const r = await upsertYampiOrder(db, { data: o }, { fireCapiEvents: false })
    if (r.ok && !r.skipped) gravados++
    if (!r.ok) falhas.push(`${o.id}: ${r.error}`)
  }

  // 3. Métricas diárias dos mesmos dias
  const dias: string[] = []
  for (let i = 0; i <= DIAS; i++) {
    dias.push(new Date(Date.now() - i * 86400000).toLocaleDateString('en-CA', { timeZone: TZ }))
  }
  await refreshDailyAnalytics(db, dias)

  return NextResponse.json({ ok: falhas.length === 0, webhook, desde, pedidos: pedidos.length, gravados, falhas })
}
