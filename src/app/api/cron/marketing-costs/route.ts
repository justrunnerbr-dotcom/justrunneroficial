import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getMetaLiveSpend } from '@/lib/admin/meta-ads'
import { getGoogleAdsLiveSpend } from '@/lib/admin/google-ads'

/**
 * Grava o investimento diário de mídia em `daily_marketing_costs`.
 *
 * Motivo: o lucro do admin lê o gasto das APIs ao vivo de Meta e Google. Quando
 * uma delas falha, o gasto cai a ZERO e o lucro aparece inflado — o número fica
 * bonito exatamente quando a informação some. Medido em 17/08: o lucro de 7
 * dias saltava de R$ 15.495 para R$ 27.539 sem o custo da Meta.
 *
 * A Meta já ganhou rede de segurança via `meta_ad_insights`. O Google não tinha
 * nenhuma. Esta rota preenche a tabela que existia vazia e serve aos dois.
 *
 * Regrava os últimos 3 dias a cada execução: plataforma de anúncio ajusta o
 * gasto do dia retroativamente, então o valor de ontem pode mudar hoje.
 */
export async function GET(request: Request) {
  const auth = request.headers.get('authorization')
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  )

  const hoje = new Date()
  const dias: string[] = []
  for (let i = 2; i >= 0; i--) {
    dias.push(new Date(hoje.getTime() - i * 86_400_000).toISOString().slice(0, 10))
  }

  // `updated_at` vai explícito: em UPDATE o default da coluna não reaplica, e é
  // esse carimbo que o painel usa pra saber se o custo de mídia está fresco.
  const agora = new Date().toISOString()
  const registros: Array<{ date: string; platform: string; amount: number; updated_at: string }> = []
  const falhas: string[] = []

  for (const date of dias) {
    const seguinte = new Date(Date.parse(`${date}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10)

    const [meta, google] = await Promise.all([
      getMetaLiveSpend(date, seguinte).catch(() => null),
      getGoogleAdsLiveSpend(date, seguinte).catch(() => null),
    ])

    const metaSpend = meta?.data?.total?.spend
    if (typeof metaSpend === 'number') registros.push({ date, platform: 'meta', amount: metaSpend, updated_at: agora })
    else falhas.push(`meta:${date}`)

    const googleSpend = google?.data?.spend
    if (typeof googleSpend === 'number') registros.push({ date, platform: 'google', amount: googleSpend, updated_at: agora })
    else falhas.push(`google:${date}`)
  }

  if (registros.length > 0) {
    // Upsert, não delete+insert. A migration 20260708000006 já criou
    // `unique (date, platform)` — o delete anterior apagava a data inteira,
    // varrendo junto qualquer plataforma que esta rota não regrava (mídia
    // manual: tiktok, influenciador). Perdia dado que ninguém repõe.
    const { error } = await db
      .from('daily_marketing_costs')
      .upsert(registros, { onConflict: 'date,platform' })
    if (error) {
      return NextResponse.json({ ok: false, error: error.message, registros: registros.length }, { status: 500 })
    }
  }

  // Falha ruidosa: sem nenhum registro gravado, o lucro segue exposto ao mesmo
  // problema que esta rota existe para resolver.
  if (registros.length === 0) {
    return NextResponse.json(
      { ok: false, error: 'Nenhum gasto obtido de Meta nem Google', falhas },
      { status: 500 },
    )
  }

  return NextResponse.json({ ok: true, gravados: registros.length, falhas })
}
