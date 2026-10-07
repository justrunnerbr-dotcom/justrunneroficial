import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { syncCustomerPurchaseStats } from '@/lib/yampi/customer-stats'

/**
 * Recalcula `customer_purchase_stats` todo dia.
 *
 * Por que existe: a rotina já existia, mas só rodava quando alguém clicava no
 * botão em `/api/admin/recovery/sync-customers`. O último clique foi em
 * 03/07/2026 — 47 dias antes de isto ser escrito. Nesse intervalo, LTV, taxa de
 * recompra e a lista de "clientes sumidos" continuaram sendo exibidos como se
 * fossem atuais, calculados sobre uma base congelada.
 *
 * O sintoma é o mesmo do sync da Meta, que ficou semanas parado: nada quebra,
 * nenhum erro aparece, e os números seguem plausíveis. Por isso o frescor desta
 * tabela também entrou no painel de Saúde.
 *
 * Roda às 04:10, depois de `yampi-sync` (a cada 10min) ter trazido os pedidos
 * do dia e antes do `health-score` das 06:00 avaliar a base.
 */
export const maxDuration = 300

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

  try {
    const r = await syncCustomerPurchaseStats(db)
    // Falha ruidosa: zero cliente sincronizado com pedidos existindo significa
    // que a rotina rodou vazia, e é isso que a deixou 47 dias desatualizada sem
    // ninguém notar.
    if (r.synced === 0 && r.ordersScanned > 0) {
      return NextResponse.json({ ok: false, error: 'nenhum cliente gravado apesar de haver pedidos', ...r }, { status: 500 })
    }
    return NextResponse.json({ ok: true, ...r })
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'erro desconhecido' },
      { status: 500 },
    )
  }
}
