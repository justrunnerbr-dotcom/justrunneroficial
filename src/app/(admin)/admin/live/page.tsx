import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import { LiveRefresh } from './_components/live-refresh'
import { LiveTileMapLoader } from './_components/live-tile-map-loader'
import type { LiveMapPoint } from './_components/live-tile-map'

const STORE_ID = 'b0000000-0000-0000-0000-000000000001'
const TZ   = 'America/Sao_Paulo'

function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  )
}

function fmtBRL(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

function relTime(iso: string): string {
  const diff = Math.round((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60)   return `${diff}s atrás`
  if (diff < 3600) return `${Math.floor(diff / 60)}min atrás`
  return `${Math.floor(diff / 3600)}h atrás`
}

function statusColor(s: string): string {
  if (s === 'paid')      return '#10B981'
  if (s === 'pending')   return '#F59E0B'
  if (s === 'cancelled') return '#EF4444'
  return '#6B7280'
}

function statusLabel(s: string): string {
  const map: Record<string, string> = {
    paid: 'Pago', pending: 'Pendente', cancelled: 'Cancelado',
    processing: 'Em processo', shipped: 'Enviado',
  }
  return map[s] ?? s
}

async function getLiveData() {
  const db  = getDb()
  const now = new Date()

  const tenMinAgo    = new Date(now.getTime() - 10 * 60 * 1000).toISOString()
  const thirtyMinAgo = new Date(now.getTime() - 30 * 60 * 1000).toISOString()

  const todayBRL    = now.toLocaleDateString('en-CA', { timeZone: TZ })
  const [y, m, d]   = todayBRL.split('-').map(Number)
  const tomorrowBRL = new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10)
  const startISO    = `${todayBRL}T00:00:00-03:00`
  const endISO      = `${tomorrowBRL}T00:00:00-03:00`

  const [liveR, ordersR, sessR, cartR, checkR, cartOpenR, newCustR, recentR] = await Promise.all([
    db.from('live_visitors')
      .select('page, product_slug, device, geo_state, geo_city, geo_lat, geo_lon')
      .eq('store_id', STORE_ID)
      .gte('last_seen', tenMinAgo)
      .order('last_seen', { ascending: false }),

    db.from('orders')
      .select('external_id, total, status, payment_method, created_at, customer_snapshot')
      .eq('store_id', STORE_ID)
      .gte('created_at', startISO)
      .lt('created_at', endISO)
      .order('created_at', { ascending: false }),

    db.from('sessions')
      .select('id', { count: 'exact', head: true })
      .eq('store_id', STORE_ID)
      .gte('started_at', startISO)
      .lt('started_at', endISO),

    db.from('events')
      .select('id', { count: 'exact', head: true })
      .eq('store_id', STORE_ID)
      .eq('event_type', 'add_to_cart')
      .gte('created_at', thirtyMinAgo),

    db.from('events')
      .select('id', { count: 'exact', head: true })
      .eq('store_id', STORE_ID)
      .eq('event_type', 'initiate_checkout')
      .gte('created_at', thirtyMinAgo),

    db.from('events')
      .select('id', { count: 'exact', head: true })
      .eq('store_id', STORE_ID)
      .eq('event_type', 'cart_open')
      .gte('created_at', thirtyMinAgo),

    db.from('customers')
      .select('id', { count: 'exact', head: true })
      .eq('store_id', STORE_ID)
      .gte('created_at', startISO)
      .lt('created_at', endISO),

    db.from('orders')
      .select('external_id, total, status, payment_method, created_at, customer_snapshot')
      .eq('store_id', STORE_ID)
      .order('created_at', { ascending: false })
      .limit(8),
  ])

  const live   = liveR.data ?? []
  const orders = ordersR.data ?? []
  const paid   = orders.filter(o => o.status === 'paid')
  const paid30 = paid.filter(o => new Date(o.created_at).getTime() > now.getTime() - 30 * 60 * 1000)

  const devMap: Record<string, number> = {}
  for (const v of live) {
    const k = v.device ?? 'outro'
    devMap[k] = (devMap[k] ?? 0) + 1
  }

  const pageMap: Record<string, number> = {}
  for (const v of live) {
    const k = v.page ?? '/'
    pageMap[k] = (pageMap[k] ?? 0) + 1
  }
  const topPages = Object.entries(pageMap).sort((a, b) => b[1] - a[1]).slice(0, 8)

  // Agrupa por coordenada exata (não por estado) — visitantes na mesma
  // cidade tendem a cair no mesmo lat/lon de geolocalização por IP, então
  // agrupar aqui já produz "1 marcador por cidade com contagem" na prática.
  const pointGroups: Record<string, LiveMapPoint> = {}
  for (const v of live) {
    const lat = v.geo_lat != null ? Number(v.geo_lat) : null
    const lon = v.geo_lon != null ? Number(v.geo_lon) : null
    if (lat == null || lon == null || Number.isNaN(lat) || Number.isNaN(lon)) continue
    const key = `${lat},${lon}`
    if (!pointGroups[key]) pointGroups[key] = { lat, lon, city: v.geo_city, state: v.geo_state, count: 0 }
    pointGroups[key].count++
  }
  const liveMapPoints: LiveMapPoint[] = Object.values(pointGroups)

  return {
    updatedAt:    now.toLocaleTimeString('pt-BR', { timeZone: TZ }),
    liveCount:    live.length,
    liveMapPoints,
    topPages,
    devMap,
    ordersToday:  orders.length,
    paidToday:    paid.length,
    pendingToday: orders.filter(o => o.status === 'pending').length,
    revenueToday: paid.reduce((s, o) => s + parseFloat(String(o.total ?? 0)), 0),
    sessionsToday: sessR.count ?? 0,
    cartLast30:     cartR.count ?? 0,
    checkLast30:    checkR.count ?? 0,
    cartOpenLast30: cartOpenR.count ?? 0,
    paidLast30:     paid30.length,
    newCustToday: newCustR.count ?? 0,
    recentOrders: recentR.data ?? [],
  }
}

export default async function LivePage() {
  const cookieStore = await cookies()
  const token  = cookieStore.get('jhf_admin')?.value
  const secret = process.env.ADMIN_SECRET
  if (!secret || token !== secret) return null

  const d = await getLiveData()

  const devColors: Record<string, string> = {
    mobile: '#3B82F6', desktop: '#8B5CF6', tablet: '#F59E0B',
  }
  const devTotal = Object.values(d.devMap).reduce((s, n) => s + n, 0) || 1

  const kpis = [
    {
      label: 'Visitantes agora',
      value: String(d.liveCount),
      sub:   'últimos 10 min',
      accent: true,
    },
    {
      label: 'Pedidos hoje',
      value: String(d.ordersToday),
      sub:   `${d.paidToday} pago${d.paidToday !== 1 ? 's' : ''} · ${d.pendingToday} pendente${d.pendingToday !== 1 ? 's' : ''}`,
      accent: false,
    },
    {
      label: 'Receita paga hoje',
      value: fmtBRL(d.revenueToday),
      sub:   `${d.paidToday} confirmado${d.paidToday !== 1 ? 's' : ''}`,
      accent: false,
    },
    {
      label: 'Sessões hoje',
      value: d.sessionsToday.toLocaleString('pt-BR'),
      sub:   `${d.newCustToday} novo${d.newCustToday !== 1 ? 's' : ''} cliente${d.newCustToday !== 1 ? 's' : ''}`,
      accent: false,
    },
  ]

  return (
    <div style={{ padding: '32px 40px', maxWidth: '1400px', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
      <LiveRefresh intervalMs={15000} />

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '28px' }}>
        <div style={{
          width: '10px', height: '10px', borderRadius: '50%',
          background: '#16F08B',
          boxShadow: '0 0 12px rgba(22,240,139,0.55)',
          flexShrink: 0,
        }} />
        <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: 'var(--admin-text-main)' }}>
          Live View
        </h1>
        <span style={{ fontSize: '13px', color: 'var(--admin-text-muted)', marginLeft: '4px' }}>
          · atualizado às {d.updatedAt}
        </span>
      </div>

      {/* ── KPI cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '20px' }}>
        {kpis.map((kpi) => (
          <div key={kpi.label} style={{
            background:   'var(--admin-card)',
            border:       `1px solid ${kpi.accent ? 'rgba(22,240,139,0.28)' : 'var(--admin-border)'}`,
            borderRadius: '14px',
            padding:      '20px 24px',
          }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
              {kpi.label}
            </div>
            <div style={{ fontSize: '28px', fontWeight: 700, lineHeight: 1.1, marginBottom: '4px', color: kpi.accent ? '#16F08B' : 'var(--admin-text-main)' }}>
              {kpi.value}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--admin-text-muted)' }}>{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Main: Map (left) + Panel (right) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 310px', gap: '16px', marginBottom: '16px', alignItems: 'start' }}>

        {/* Map card */}
        <div style={{
          background:   'var(--admin-card)',
          border:       '1px solid var(--admin-border)',
          borderRadius: '16px',
          overflow:     'hidden',
        }}>
          {/* Card header */}
          <div style={{
            padding:      '16px 22px',
            borderBottom: '1px solid var(--admin-border)',
            display:      'flex',
            alignItems:   'center',
            justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#16F08B', boxShadow: '0 0 6px rgba(22,240,139,0.5)' }} />
              <h2 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: 'var(--admin-text-main)' }}>
                Mapa ao vivo
              </h2>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                fontSize: '10px', fontWeight: 600,
                color: 'var(--admin-text-muted)',
                background: 'var(--admin-bg)',
                padding: '3px 9px', borderRadius: '20px',
                border: '1px solid var(--admin-border)',
                textTransform: 'uppercase', letterSpacing: '0.4px',
              }}>
                Geo · ao vivo
              </span>
            </div>
          </div>

          {/* Map fills the rest */}
          <div style={{ height: '440px' }}>
            {d.liveMapPoints.length === 0 ? (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                <div style={{ textAlign: 'center', color: 'var(--admin-text-muted)', fontSize: '13px', maxWidth: '260px', lineHeight: 1.6 }}>
                  Nenhum visitante com localização identificada nos últimos 10 min
                </div>
              </div>
            ) : (
              <LiveTileMapLoader points={d.liveMapPoints} />
            )}
          </div>
        </div>

        {/* Right panel: Comportamento + Páginas + Dispositivos */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

          {/* Comportamento (30 min) */}
          <div style={{
            background:   'var(--admin-card)',
            border:       '1px solid var(--admin-border)',
            borderRadius: '16px',
            padding:      '18px 20px',
          }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '14px' }}>
              Comportamento · 30 min
            </div>
            {([
              { label: 'Abriu carrinho',         value: d.cartOpenLast30, color: '#A855F7' },
              { label: 'Adicionou ao carrinho',  value: d.cartLast30,     color: '#F59E0B' },
              { label: 'Iniciou checkout',        value: d.checkLast30,    color: '#3B82F6' },
              { label: 'Comprou',                 value: d.paidLast30,     color: '#16F08B' },
            ] as { label: string; value: number; color: string }[]).map((row, i, arr) => (
              <div key={row.label} style={{
                display:       'flex',
                alignItems:    'center',
                justifyContent: 'space-between',
                padding:       '9px 0',
                borderBottom:  i < arr.length - 1 ? '1px solid var(--admin-border)' : 'none',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: row.color, flexShrink: 0 }} />
                  <span style={{ fontSize: '12px', color: 'var(--admin-text-sec)' }}>{row.label}</span>
                </div>
                <span style={{ fontSize: '17px', fontWeight: 700, color: row.value > 0 ? row.color : 'var(--admin-text-muted)' }}>
                  {row.value}
                </span>
              </div>
            ))}
          </div>

          {/* Páginas ativas agora */}
          <div style={{
            background:   'var(--admin-card)',
            border:       '1px solid var(--admin-border)',
            borderRadius: '16px',
            padding:      '18px 20px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#16F08B', flexShrink: 0 }} />
              <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                Páginas ativas agora
              </div>
              <div style={{ marginLeft: 'auto', fontSize: '13px', fontWeight: 700, color: d.liveCount > 0 ? '#16F08B' : 'var(--admin-text-muted)' }}>
                {d.liveCount}
              </div>
            </div>
            {d.topPages.length === 0 ? (
              <div style={{ fontSize: '12px', color: 'var(--admin-text-muted)', textAlign: 'center', padding: '16px 0' }}>
                Nenhum visitante ativo
              </div>
            ) : d.topPages.map(([page, count], i) => (
              <div key={page} style={{
                display:       'flex',
                alignItems:    'center',
                justifyContent: 'space-between',
                padding:       '7px 0',
                borderBottom:  i < d.topPages.length - 1 ? '1px solid var(--admin-border)' : 'none',
              }}>
                <span style={{
                  fontSize: '11px', color: 'var(--admin-text-sec)', fontFamily: 'monospace',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
                }}>
                  {page || '/'}
                </span>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#16F08B', marginLeft: '8px', flexShrink: 0 }}>
                  {count}
                </span>
              </div>
            ))}
          </div>

          {/* Dispositivos agora */}
          <div style={{
            background:   'var(--admin-card)',
            border:       '1px solid var(--admin-border)',
            borderRadius: '16px',
            padding:      '18px 20px',
          }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '14px' }}>
              Dispositivos · agora
            </div>
            {d.liveCount === 0 ? (
              <div style={{ fontSize: '12px', color: 'var(--admin-text-muted)', textAlign: 'center', padding: '16px 0' }}>
                Nenhum visitante ativo
              </div>
            ) : Object.entries(d.devMap).sort((a, b) => b[1] - a[1]).map(([device, count]) => {
              const pct = Math.round((count / devTotal) * 100)
              return (
                <div key={device} style={{ marginBottom: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--admin-text-sec)', textTransform: 'capitalize' }}>{device}</span>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--admin-text-main)' }}>{pct}%</span>
                  </div>
                  <div style={{ height: '4px', background: 'var(--admin-bg)', borderRadius: '99px' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: devColors[device] ?? '#64748b', borderRadius: '99px' }} />
                  </div>
                </div>
              )
            })}
          </div>

        </div>
      </div>

      {/* ── Bottom row: Novos x Recorrentes | Sessões por local ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>

        {/* Novos x Recorrentes */}
        <div style={{ background: 'var(--admin-card)', border: '1px solid var(--admin-border)', borderRadius: '16px', padding: '20px 24px' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '16px' }}>
            Novos x Recorrentes · hoje
          </div>
          {([
            { label: 'Novos clientes',   value: d.newCustToday, color: '#3B82F6' },
            { label: 'Total de pedidos', value: d.ordersToday,  color: 'var(--admin-text-main)' },
            { label: 'Pedidos pagos',    value: d.paidToday,    color: '#16F08B' },
          ] as { label: string; value: number; color: string }[]).map((row, i, arr) => (
            <div key={row.label} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 0',
              borderBottom: i < arr.length - 1 ? '1px solid var(--admin-border)' : 'none',
            }}>
              <span style={{ fontSize: '13px', color: 'var(--admin-text-sec)' }}>{row.label}</span>
              <span style={{ fontSize: '16px', fontWeight: 700, color: row.color }}>{row.value}</span>
            </div>
          ))}
        </div>

        {/* Sessões por local */}
        <div style={{ background: 'var(--admin-card)', border: '1px solid var(--admin-border)', borderRadius: '16px', padding: '20px 24px' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '16px' }}>
            Sessões por localização
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '88px', gap: '6px' }}>
            <div style={{ fontSize: '13px', color: 'var(--admin-text-muted)' }}>Sem dados de geolocalização</div>
            <div style={{ fontSize: '11px', color: 'var(--admin-text-muted)', opacity: 0.55, textAlign: 'center', maxWidth: '280px', lineHeight: 1.55 }}>
              Ative captura de IP/geo no middleware para ver dados por cidade e estado
            </div>
          </div>
        </div>

      </div>

      {/* ── Pedidos recentes ── */}
      <div style={{ background: 'var(--admin-card)', border: '1px solid var(--admin-border)', borderRadius: '16px', overflow: 'hidden' }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--admin-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--admin-text-main)' }}>
            Pedidos recentes
          </h2>
          <a href="/admin/pedidos" style={{ fontSize: '12px', color: 'var(--admin-accent)', textDecoration: 'none', fontWeight: 500 }}>
            Ver todos
          </a>
        </div>

        {d.recentOrders.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', fontSize: '14px', color: 'var(--admin-text-muted)' }}>
            Nenhum pedido ainda
          </div>
        ) : (
          <>
            <div style={{
              display: 'grid', gridTemplateColumns: '120px 1fr 110px 100px 100px',
              gap: '16px', padding: '10px 24px',
              background: 'var(--admin-bg)', borderBottom: '1px solid var(--admin-border)',
            }}>
              {['Pedido', 'Cliente', 'Valor', 'Status', 'Quando'].map(h => (
                <div key={h} style={{ fontSize: '11px', fontWeight: 600, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                  {h}
                </div>
              ))}
            </div>
            {d.recentOrders.map((order: {
              external_id?:       string | null
              total?:             number | string | null
              status?:            string | null
              payment_method?:    string | null
              created_at?:        string | null
              customer_snapshot?: { name?: string; email?: string } | null
            }, i: number) => {
              const snap = order.customer_snapshot
              const name = snap?.name ?? snap?.email ?? '—'
              const sc   = statusColor(order.status ?? '')
              return (
                <div key={order.external_id ?? i} style={{
                  display: 'grid', gridTemplateColumns: '120px 1fr 110px 100px 100px',
                  gap: '16px', padding: '14px 24px',
                  borderBottom: i < d.recentOrders.length - 1 ? '1px solid var(--admin-border)' : 'none',
                  alignItems: 'center',
                }}>
                  <div style={{ fontSize: '12px', color: 'var(--admin-text-muted)', fontFamily: 'monospace' }}>
                    #{order.external_id ?? '—'}
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--admin-text-sec)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {name}
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--admin-text-main)' }}>
                    {fmtBRL(parseFloat(String(order.total ?? 0)))}
                  </div>
                  <div>
                    <span style={{
                      fontSize: '11px', fontWeight: 600, padding: '3px 8px', borderRadius: '20px',
                      background: `${sc}20`, color: sc,
                    }}>
                      {statusLabel(order.status ?? '')}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--admin-text-muted)' }}>
                    {order.created_at ? relTime(order.created_at) : '—'}
                  </div>
                </div>
              )
            })}
          </>
        )}
      </div>

    </div>
  )
}
