import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import { getDateRangeFromSearchParams, type DateRange } from '@/lib/admin/date-range'

const JHF_STORE_ID = 'b0000000-0000-0000-0000-000000000001'
const TZ = 'America/Sao_Paulo'

function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  )
}

function fmt(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

const PAID_STATUSES = [
  'paid', 'invoiced', 'on_carriage', 'payment_confirmed',
  'preparing_shipping', 'in_separation', 'in_transit', 'delivered',
]

async function getAnalyticsData(range: DateRange) {
  const db = getDb()

  const [
    dailyRows,
    topPagesRows,
    topProductsRows,
    deviceRows,
    sourcesRows,
    atcRes,
    checkoutRes,
    ordersRes,
  ] = await Promise.all([
    // Gráfico de receita diária — mantém daily_analytics
    db.from('daily_analytics')
      .select('*')
      .eq('store_id', JHF_STORE_ID)
      .gte('date', range.start)
      .lt('date', range.endExclusive)
      .order('date', { ascending: true }),

    // Rankings: count:exact retorna o total real independente do limit
    db.from('events')
      .select('page', { count: 'exact' })
      .eq('store_id', JHF_STORE_ID)
      .eq('event_type', 'page_view')
      .gte('created_at', range.startISO)
      .lt('created_at', range.endISO)
      .limit(5000),

    db.from('events')
      .select('product_slug', { count: 'exact' })
      .eq('store_id', JHF_STORE_ID)
      .eq('event_type', 'view_content')
      .gte('created_at', range.startISO)
      .lt('created_at', range.endISO)
      .limit(5000),

    db.from('events')
      .select('device')
      .eq('store_id', JHF_STORE_ID)
      .gte('created_at', range.startISO)
      .lt('created_at', range.endISO)
      .limit(5000),

    // Sessions: count:exact para total de sessões + dados UTM para ranking
    db.from('sessions')
      .select('utm_source', { count: 'exact' })
      .eq('store_id', JHF_STORE_ID)
      .gte('started_at', range.startISO)
      .lt('started_at', range.endISO)
      .limit(5000),

    // Add to cart — apenas contagem
    db.from('events')
      .select('*', { count: 'exact', head: true })
      .eq('store_id', JHF_STORE_ID)
      .eq('event_type', 'add_to_cart')
      .gte('created_at', range.startISO)
      .lt('created_at', range.endISO),

    // Checkout iniciado — apenas contagem
    db.from('events')
      .select('*', { count: 'exact', head: true })
      .eq('store_id', JHF_STORE_ID)
      .eq('event_type', 'initiate_checkout')
      .gte('created_at', range.startISO)
      .lt('created_at', range.endISO),

    // Pedidos pagos — precisa de total para calcular receita
    db.from('orders')
      .select('total')
      .eq('store_id', JHF_STORE_ID)
      .in('status', PAID_STATUSES)
      .gte('created_at', range.startISO)
      .lt('created_at', range.endISO)
      .limit(5000),
  ])

  const daily   = dailyRows.data ?? []
  const orders  = ordersRes.data ?? []

  const totals = {
    sessions:        sourcesRows.count         ?? 0,
    page_views:      topPagesRows.count        ?? 0,
    product_views:   topProductsRows.count     ?? 0,
    add_to_carts:    atcRes.count              ?? 0,
    checkout_starts: checkoutRes.count         ?? 0,
    orders:          orders.length,
    revenue:         orders.reduce((sum, o) => sum + parseFloat(String(o.total ?? 0)), 0),
  }

  function countBy<T extends { [k: string]: unknown }>(arr: T[], key: keyof T): Array<[string, number]> {
    const map: Record<string, number> = {}
    for (const item of arr) {
      const val = String(item[key] ?? 'desconhecido')
      if (val) map[val] = (map[val] ?? 0) + 1
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8)
  }

  return {
    daily,
    totals,
    topPages:    countBy(topPagesRows.data ?? [], 'page'),
    topProducts: countBy((topProductsRows.data ?? []).filter((e) => e.product_slug), 'product_slug'),
    devices:     countBy(deviceRows.data ?? [], 'device'),
    sources:     countBy((sourcesRows.data ?? []).filter((s) => s.utm_source), 'utm_source'),
  }
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>
}) {
  const cookieStore = await cookies()
  const token  = cookieStore.get('jhf_admin')?.value
  const secret = process.env.ADMIN_SECRET
  if (!secret || token !== secret) return null

  const sp    = await searchParams
  const range = getDateRangeFromSearchParams(sp)
  const data  = await getAnalyticsData(range)
  const { totals, daily } = data

  const maxRevenue = Math.max(...daily.map((d) => parseFloat(String(d.revenue ?? 0))), 1)

  return (
    <div style={{ padding: '32px 40px', maxWidth: '1400px', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>

      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: 'var(--admin-text-main)' }}>Analytics</h1>
        <p style={{ margin: '4px 0 0', fontSize: '14px', color: 'var(--admin-text-muted)' }}>{range.label}</p>
      </div>

      {/* 30-day totals */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '12px', marginBottom: '32px' }}>
        {[
          { label: 'Sessões',     value: totals.sessions.toLocaleString('pt-BR') },
          { label: 'Page Views',  value: totals.page_views.toLocaleString('pt-BR') },
          { label: 'Prod. Views', value: totals.product_views.toLocaleString('pt-BR') },
          { label: 'Add to Cart', value: totals.add_to_carts.toLocaleString('pt-BR') },
          { label: 'Checkouts',   value: totals.checkout_starts.toLocaleString('pt-BR') },
          { label: 'Pedidos',     value: totals.orders.toLocaleString('pt-BR') },
          { label: 'Receita',     value: fmt(totals.revenue) },
        ].map((m) => (
          <div key={m.label} style={{ background: 'var(--admin-card)', border: '1px solid var(--admin-border)', borderRadius: '12px', padding: '16px' }}>
            <div style={{ fontSize: '12px', color: 'var(--admin-text-muted)', marginBottom: '6px' }}>{m.label}</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--admin-text-main)' }}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* Revenue chart */}
      <div style={{ background: 'var(--admin-card)', border: '1px solid var(--admin-border)', borderRadius: '16px', padding: '24px', marginBottom: '24px' }}>
        <h2 style={{ margin: '0 0 20px', fontSize: '16px', fontWeight: 600, color: 'var(--admin-text-main)' }}>
          Receita Diária — {range.label}
        </h2>
        {daily.length === 0 ? (
          <p style={{ fontSize: '14px', color: 'var(--admin-text-muted)', margin: 0 }}>
            Nenhum dado ainda. Os dados aparecem após clicar em &quot;Atualizar Dados&quot; no CEO Dashboard.
          </p>
        ) : (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '120px' }}>
            {daily.map((row) => {
              const rev = parseFloat(String(row.revenue ?? 0))
              const pct = Math.max((rev / maxRevenue) * 100, rev > 0 ? 4 : 1)
              return (
                <div
                  key={row.date}
                  title={`${row.date}: ${fmt(rev)}`}
                  style={{
                    flex: 1, height: `${pct}%`,
                    background: rev > 0 ? '#3b82f6' : '#e2e8f0',
                    borderRadius: '3px 3px 0 0',
                    minHeight: '2px',
                    cursor: 'default',
                  }}
                />
              )
            })}
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>

        {/* Top Pages */}
        <div style={{ background: 'var(--admin-card)', border: '1px solid var(--admin-border)', borderRadius: '16px', padding: '24px' }}>
          <h2 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 600, color: 'var(--admin-text-main)' }}>
            Páginas Mais Visitadas — {range.label}
          </h2>
          {data.topPages.length === 0 ? (
            <p style={{ fontSize: '14px', color: 'var(--admin-text-muted)', margin: 0 }}>Nenhum dado ainda.</p>
          ) : data.topPages.map(([page, count], i) => (
            <div key={page} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '8px 0', borderBottom: i < data.topPages.length - 1 ? '1px solid #f1f5f9' : 'none',
            }}>
              <span style={{ fontSize: '13px', color: 'var(--admin-text-sec)', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                {page || '/'}
              </span>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--admin-text-muted)', marginLeft: '12px' }}>{count}</span>
            </div>
          ))}
        </div>

        {/* Top Products */}
        <div style={{ background: 'var(--admin-card)', border: '1px solid var(--admin-border)', borderRadius: '16px', padding: '24px' }}>
          <h2 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 600, color: 'var(--admin-text-main)' }}>
            Produtos Mais Vistos — {range.label}
          </h2>
          {data.topProducts.length === 0 ? (
            <p style={{ fontSize: '14px', color: 'var(--admin-text-muted)', margin: 0 }}>Nenhum dado ainda.</p>
          ) : data.topProducts.map(([slug, count], i) => (
            <div key={slug} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '8px 0', borderBottom: i < data.topProducts.length - 1 ? '1px solid #f1f5f9' : 'none',
            }}>
              <span style={{ fontSize: '13px', color: 'var(--admin-text-sec)', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                {slug}
              </span>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--admin-accent)', marginLeft: '12px' }}>{count}</span>
            </div>
          ))}
        </div>

      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>

        {/* Devices */}
        <div style={{ background: 'var(--admin-card)', border: '1px solid var(--admin-border)', borderRadius: '16px', padding: '24px' }}>
          <h2 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 600, color: 'var(--admin-text-main)' }}>
            Dispositivos — {range.label}
          </h2>
          {data.devices.length === 0 ? (
            <p style={{ fontSize: '14px', color: 'var(--admin-text-muted)', margin: 0 }}>Nenhum dado ainda.</p>
          ) : (() => {
            const total = data.devices.reduce((s, [, c]) => s + c, 0) || 1
            const colors: Record<string, string> = { mobile: '#3b82f6', desktop: '#8b5cf6', tablet: '#f59e0b' }
            return data.devices.map(([device, count]) => (
              <div key={device} style={{ marginBottom: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '13px', color: 'var(--admin-text-sec)', textTransform: 'capitalize' }}>{device}</span>
                  <span style={{ fontSize: '13px', fontWeight: 600 }}>{Math.round((count / total) * 100)}%</span>
                </div>
                <div style={{ height: '6px', background: 'var(--admin-card-hover)', borderRadius: '99px' }}>
                  <div style={{ height: '100%', width: `${Math.round((count / total) * 100)}%`, background: colors[device] ?? '#64748b', borderRadius: '99px' }} />
                </div>
              </div>
            ))
          })()}
        </div>

        {/* Sources */}
        <div style={{ background: 'var(--admin-card)', border: '1px solid var(--admin-border)', borderRadius: '16px', padding: '24px' }}>
          <h2 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 600, color: 'var(--admin-text-main)' }}>
            Origens UTM — {range.label}
          </h2>
          {data.sources.length === 0 ? (
            <p style={{ fontSize: '14px', color: 'var(--admin-text-muted)', margin: 0 }}>
              Nenhuma sessão com UTM ainda. Os dados aparecem quando visitantes chegam via links com utm_source.
            </p>
          ) : data.sources.map(([source, count], i) => (
            <div key={source} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '8px 0', borderBottom: i < data.sources.length - 1 ? '1px solid #f1f5f9' : 'none',
            }}>
              <span style={{ fontSize: '13px', color: 'var(--admin-text-sec)' }}>{source}</span>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--admin-text-muted)' }}>{count} sessões</span>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}
