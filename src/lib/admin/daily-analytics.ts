import { SupabaseClient } from '@supabase/supabase-js'
import { fetchAllRows } from './supabase-pagination'

const STORE_ID = 'b0000000-0000-0000-0000-000000000001'
const PAID_STATUSES = [
  'paid', 'invoiced', 'on_carriage', 'payment_confirmed',
  'preparing_shipping', 'in_separation', 'in_transit', 'delivered',
]

export interface DailyAnalyticsResult {
  date:    string
  sessions: number
  orders:   number
  revenue:  number
}

/** Recalcula e faz upsert de `daily_analytics` pra cada data em `dates` (formato
 * YYYY-MM-DD, timezone America/Sao_Paulo). Usado tanto pelo cron
 * (`api/cron/analytics-refresh`) quanto pelo botão manual "Sincronizar"
 * (`api/admin/analytics/refresh`) — mantidos como uma função só pra não
 * divergir os dois quando um bug for corrigido aqui.
 *
 * Contagens de evento usam count:'exact'/head:true (não sofrem o teto de 1000
 * linhas do PostgREST). `visitor_id` (pra unique_visitors) e `orders`/
 * `manual_orders` (precisam do valor de `total`, não só contagem) usam
 * fetchAllRows pra paginar corretamente em dias com mais de 1000 linhas —
 * antes dessa correção, um dia com >1000 sessões ou >1000 eventos no total
 * (contando todos os tipos juntos) ficava com contagens truncadas/enviesadas,
 * inclusive derrubando add_to_carts/checkout_starts pra quase zero mesmo com
 * atividade real, porque a query antiga buscava TODOS os tipos de evento
 * juntos sem .order() e cortava em 1000 linhas arbitrárias. */
export async function refreshDailyAnalytics(
  db: SupabaseClient,
  dates: string[],
): Promise<DailyAnalyticsResult[]> {
  const results: DailyAnalyticsResult[] = []

  for (const date of dates) {
    const dayStart = `${date}T00:00:00-03:00`
    const dayEnd   = new Date(new Date(dayStart).getTime() + 86400000).toISOString()

    const [
      sessionCountRes, pageViewsRes, productViewsRes, addToCartsRes, checkoutsRes,
      visitorRows, orders, manualOrders,
    ] = await Promise.all([
      db.from('sessions').select('*', { count: 'exact', head: true })
        .eq('store_id', STORE_ID).gte('started_at', dayStart).lt('started_at', dayEnd),
      db.from('events').select('*', { count: 'exact', head: true })
        .eq('store_id', STORE_ID).eq('event_type', 'page_view')
        .gte('created_at', dayStart).lt('created_at', dayEnd),
      db.from('events').select('*', { count: 'exact', head: true })
        .eq('store_id', STORE_ID).eq('event_type', 'view_content')
        .gte('created_at', dayStart).lt('created_at', dayEnd),
      db.from('events').select('*', { count: 'exact', head: true })
        .eq('store_id', STORE_ID).eq('event_type', 'add_to_cart')
        .gte('created_at', dayStart).lt('created_at', dayEnd),
      db.from('events').select('*', { count: 'exact', head: true })
        .eq('store_id', STORE_ID).eq('event_type', 'initiate_checkout')
        .gte('created_at', dayStart).lt('created_at', dayEnd),
      fetchAllRows<{ visitor_id: string | null }>((from, to) =>
        db.from('sessions').select('visitor_id')
          .eq('store_id', STORE_ID).gte('started_at', dayStart).lt('started_at', dayEnd)
          .range(from, to)),
      fetchAllRows<{ total: number | string | null }>((from, to) =>
        db.from('orders').select('total')
          .eq('store_id', STORE_ID).in('status', PAID_STATUSES)
          .gte('created_at', dayStart).lt('created_at', dayEnd)
          .range(from, to)),
      // Pedidos manuais (venda por link direto, fora do catálogo/Yampi) — sempre pagos,
      // não têm store_id nem status próprio, então entram direto na conta do dia.
      fetchAllRows<{ total: number | string | null }>((from, to) =>
        db.from('manual_orders').select('total')
          .gte('created_at', dayStart).lt('created_at', dayEnd)
          .range(from, to)),
    ])

    const sessionCount   = sessionCountRes.count ?? 0
    const pageViews      = pageViewsRes.count     ?? 0
    const productViews   = productViewsRes.count  ?? 0
    const addToCarts     = addToCartsRes.count    ?? 0
    const checkouts      = checkoutsRes.count     ?? 0
    const uniqueVisitors = new Set(visitorRows.map((s) => s.visitor_id).filter(Boolean)).size
    const orderCount     = orders.length + manualOrders.length
    const revenue        = orders.reduce((sum, o) => sum + parseFloat(String(o.total ?? 0)), 0)
                          + manualOrders.reduce((sum, o) => sum + parseFloat(String(o.total ?? 0)), 0)
    const aov            = orderCount > 0 ? revenue / orderCount : 0
    const convRate        = sessionCount > 0 ? orderCount / sessionCount : 0

    await db.from('daily_analytics').upsert(
      {
        store_id:        STORE_ID,
        date,
        sessions:        sessionCount,
        unique_visitors: uniqueVisitors,
        page_views:      pageViews,
        product_views:   productViews,
        add_to_carts:    addToCarts,
        checkout_starts: checkouts,
        orders:          orderCount,
        revenue,
        avg_order_value: aov,
        conversion_rate: convRate,
      },
      { onConflict: 'store_id,date' },
    )

    results.push({ date, sessions: sessionCount, orders: orderCount, revenue })
  }

  return results
}
