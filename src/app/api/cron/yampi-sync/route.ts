import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { upsertYampiOrder, type YampiOrderResource } from '@/lib/yampi/sync'
import { refreshDailyAnalytics } from '@/lib/admin/daily-analytics'

// Rede de segurança frequente (porte da JHF), chamada pelo pg_cron do Supabase
// (Vercel Hobby só agenda 1×/dia): o webhook da Yampi sincroniza em
// tempo real, mas já caiu 2 vezes (21/07 e 19/08/2026) e o vigia diário só
// pega no dia seguinte. Aqui: os LOTE pedidos mais recentes (upsert idempotente,
// sem evento da Meta — Purchase/CAPI é só do webhook) e o daily_analytics de
// hoje e ontem, pro dashboard não esperar o cron da madrugada.

export const maxDuration = 60

const TZ = 'America/Sao_Paulo'
// 100 pedidos em sequência passaram de 60 s (504 em 26/10/2026); a cada 10 min,
// 25 é de sobra pro volume da loja
const LOTE = 25

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }

  const alias = process.env.NEXT_PUBLIC_YAMPI_ALIAS
  const token = process.env.YAMPI_API_TOKEN
  const secretKey = process.env.YAMPI_SECRET_KEY
  if (!alias || !token || !secretKey) {
    return NextResponse.json({ ok: false, error: 'credenciais da Yampi ausentes' }, { status: 500 })
  }

  const res = await fetch(
    `https://api.dooki.com.br/v2/${alias}/orders?limit=${LOTE}&include=items,customer,transactions,status,shipping_address&orderBy=id&sortedBy=desc&page=1`,
    { headers: { 'User-Token': token, 'User-Secret-Key': secretKey } },
  )
  if (!res.ok) return NextResponse.json({ ok: false, error: `orders ${res.status}` }, { status: 502 })
  const { data } = (await res.json()) as { data: YampiOrderResource['data'][] }

  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  })
  let gravados = 0
  const falhas: string[] = []
  for (const o of data ?? []) {
    const r = await upsertYampiOrder(db, { data: o }, { fireCapiEvents: false })
    if (r.ok && !r.skipped) gravados++
    if (!r.ok) falhas.push(`${o.id}: ${r.error}`)
  }

  const dias = [0, 1].map((i) => new Date(Date.now() - i * 86400000).toLocaleDateString('en-CA', { timeZone: TZ }))
  await refreshDailyAnalytics(db, dias)

  return NextResponse.json({ ok: falhas.length === 0, conferidos: data?.length ?? 0, gravados, falhas, dias })
}
