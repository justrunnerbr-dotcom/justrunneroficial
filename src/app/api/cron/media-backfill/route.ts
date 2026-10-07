import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { syncMetaInsights } from '@/lib/admin/meta-ads'
import { getGoogleAdsDailySpend } from '@/lib/admin/google-ads'
import { fetchAllRows } from '@/lib/admin/supabase-pagination'
import { STORE_ID } from '@/lib/yampi/sync'

/**
 * Reconstrói o histórico de custo de mídia. Roda semanal (domingo), como rede
 * de segurança, e pode ser disparada à mão pela aba Crons da Vercel.
 *
 * Por que existe: as rotinas diárias têm janela curta de propósito —
 * `meta-ads-sync` cobre 7 dias, `marketing-costs` cobre 3. Elas mantêm o
 * presente em dia, mas nenhuma recupera o passado. Quando o sync da Meta ficou
 * semanas quebrado (lia `META_AD_ACCOUNT_ID` singular, inexistente em
 * produção), o conserto trouxe de volta só os 7 dias da janela — o resto do
 * histórico continuou vazio.
 *
 * Consequência de não rodar: toda janela de 30 ou 60 dias do painel tem custo
 * de mídia parcial. O lucro do período aparece maior do que foi.
 *
 * Por que semanal e não uma vez só: o buraco de 2026-08 não foi causado por
 * falta de backfill, e sim por ninguém ter percebido que a rotina parou. Uma
 * passada retroativa por semana fecha sozinha qualquer janela perdida entre
 * uma quebra e o conserto dela.
 *
 * `CRON_SECRET` é Sensitive na Vercel (write-only, ninguém lê o valor depois
 * de criado) — por isso a rota é declarada em `vercel.json` e acionada pela
 * própria Vercel, que injeta o header. Não há como chamá-la por curl à mão.
 *
 * Idempotente: Meta grava por `meta_ad_insights_upsert_key`, custo diário por
 * `unique (date, platform)`. Rodar duas vezes não duplica nada.
 */

// Varredura de meses não cabe no limite padrão de função.
export const maxDuration = 300

const DIAS_PADRAO = 90
const DIAS_MAX    = 365

// A Meta é chamada com time_increment=1: um pedido de 90 dias volta com 90
// linhas por campanha por conta. Fatiar mantém cada resposta em tamanho que a
// Graph API entrega sem truncar e sem estourar o tempo da função.
const BLOCO_DIAS = 15

function diaISO(offsetDias: number): string {
  return new Date(Date.now() - offsetDias * 86_400_000).toISOString().slice(0, 10)
}

function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  )
}

export async function GET(request: Request) {
  const auth = request.headers.get('authorization')
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const pedido = Number(new URL(request.url).searchParams.get('days') ?? DIAS_PADRAO)
  const dias = Number.isFinite(pedido) ? Math.min(Math.max(Math.trunc(pedido), 1), DIAS_MAX) : DIAS_PADRAO

  const db = getDb()
  const inicio = diaISO(dias)
  // `until` exclusivo: as duas APIs seguem a convenção DateRange do projeto.
  const fimExclusivo = diaISO(-1)

  const relatorio = {
    ok: true,
    periodo: { de: inicio, ate: fimExclusivo },
    meta:   { blocos: 0, registros: 0, falhas: [] as string[] },
    custoDiario: { meta: 0, google: 0, falhas: [] as string[] },
  }

  // ── 1. meta_ad_insights, em blocos ──────────────────────────────────────────
  for (let offset = dias; offset > 0; offset -= BLOCO_DIAS) {
    const blocoInicio = diaISO(offset)
    const blocoFim    = diaISO(Math.max(offset - BLOCO_DIAS, -1))

    const r = await syncMetaInsights(db, blocoInicio, blocoFim)
    relatorio.meta.blocos += 1
    relatorio.meta.registros += r.count
    // Bloco vazio é esperado em período sem veiculação — só reporta o motivo.
    if (!r.ok && r.error) relatorio.meta.falhas.push(`${blocoInicio}→${blocoFim}: ${r.error}`)
  }

  // ── 2. daily_marketing_costs (meta), derivado do que acabou de sincronizar ──
  // Deriva em vez de chamar a API de novo: `meta_ad_insights` já tem o gasto
  // diário por campanha, então somar por dia custa uma consulta em vez de 90.
  try {
    const linhas = await fetchAllRows<{ date_start: string; spend: number | string | null }>((from, to) =>
      db.from('meta_ad_insights')
        .select('date_start, spend')
        .eq('store_id', STORE_ID)
        .eq('level', 'campaign')
        .gte('date_start', inicio)
        .lt('date_start', fimExclusivo)
        .range(from, to))

    const porDia = new Map<string, number>()
    for (const l of linhas) {
      const d = String(l.date_start ?? '').slice(0, 10)
      if (!d) continue
      porDia.set(d, (porDia.get(d) ?? 0) + (parseFloat(String(l.spend ?? 0)) || 0))
    }

    if (porDia.size > 0) {
      const agora = new Date().toISOString()
      const registros = [...porDia.entries()].map(([date, amount]) => ({
        date, platform: 'meta', amount, updated_at: agora,
      }))
      const { error } = await db
        .from('daily_marketing_costs')
        .upsert(registros, { onConflict: 'date,platform' })
      if (error) relatorio.custoDiario.falhas.push(`meta: ${error.message}`)
      else relatorio.custoDiario.meta = registros.length
    }
  } catch (err) {
    relatorio.custoDiario.falhas.push(`meta: ${err instanceof Error ? err.message : 'erro desconhecido'}`)
  }

  // ── 3. daily_marketing_costs (google), numa única chamada GAQL ──────────────
  // O Google não tem tabela de insights própria; a API é a única fonte, então o
  // backfill dele é a única forma de o painel ter custo do Google no passado.
  const google = await getGoogleAdsDailySpend(inicio, fimExclusivo)
  if (google.status === 'ok' && google.data) {
    // Dia sem veiculação não volta da API. Não inventa zero: linha ausente
    // permanece ausente, e o painel mostra "sem dado" em vez de lucro inflado.
    const registros = google.data
      .filter(d => d.date >= inicio && d.date < fimExclusivo)
      .map(d => ({ date: d.date, platform: 'google', amount: d.spend, updated_at: new Date().toISOString() }))

    if (registros.length > 0) {
      const { error } = await db
        .from('daily_marketing_costs')
        .upsert(registros, { onConflict: 'date,platform' })
      if (error) relatorio.custoDiario.falhas.push(`google: ${error.message}`)
      else relatorio.custoDiario.google = registros.length
    }
  } else {
    relatorio.custoDiario.falhas.push(`google: ${google.error ?? 'fonte indisponível'}`)
  }

  // Falha ruidosa: um backfill que não gravou nada não pode responder 200, ou
  // vira exatamente o silêncio que esta rota existe pra corrigir.
  const gravou = relatorio.meta.registros + relatorio.custoDiario.meta + relatorio.custoDiario.google
  if (gravou === 0) {
    relatorio.ok = false
    return NextResponse.json(relatorio, { status: 500 })
  }

  return NextResponse.json(relatorio)
}
