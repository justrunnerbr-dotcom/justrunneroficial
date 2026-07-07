import { createClient } from '@supabase/supabase-js'
import { ShoppingBag, ExternalLink, Package, Clock, CheckCircle, XCircle } from 'lucide-react'
import { getDateRangeFromSearchParams, type DateRange } from '@/lib/admin/date-range'

const JHF_STORE_ID = 'a0000000-0000-0000-0000-000000000001'

function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  )
}

function fmt(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' })
}

function statusLabel(status: string) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    paid:                 { label: 'Pago',           color: '#16a34a', bg: '#f0fdf4' },
    pending:              { label: 'Aguardando',      color: '#d97706', bg: '#fffbeb' },
    payment_confirmed:    { label: 'Confirmado',      color: '#16a34a', bg: '#f0fdf4' },
    invoiced:             { label: 'Faturado',        color: '#2563eb', bg: '#eff6ff' },
    on_carriage:          { label: 'Em transporte',   color: '#2563eb', bg: '#eff6ff' },
    preparing_shipping:   { label: 'Preparando',      color: '#7c3aed', bg: '#f5f3ff' },
    in_transit:           { label: 'Em trânsito',     color: '#2563eb', bg: '#eff6ff' },
    delivered:            { label: 'Entregue',        color: '#16a34a', bg: '#f0fdf4' },
    cancelled:            { label: 'Cancelado',       color: '#dc2626', bg: '#fef2f2' },
    refunded:             { label: 'Reembolsado',     color: '#dc2626', bg: '#fef2f2' },
  }
  return map[status] ?? { label: status, color: 'var(--admin-text-muted)', bg: '#f8fafc' }
}

async function getOrders(range: DateRange) {
  const db = getDb()
  const { data: orders } = await db
    .from('orders')
    .select('id, external_id, status, total, subtotal, discount_amount, shipping_amount, created_at, utm_source, customer_id, customer_snapshot')
    .eq('store_id', JHF_STORE_ID)
    .gte('created_at', range.startISO)
    .lt('created_at', range.endISO)
    .order('created_at', { ascending: false })
    .limit(50)

  if (!orders?.length) return []

  const orderIds = orders.map(o => o.id)
  const { data: items } = await db
    .from('order_items')
    .select('order_id, product_title, sku, price, quantity, total')
    .in('order_id', orderIds)

  return orders.map(o => ({
    ...o,
    items: items?.filter(i => i.order_id === o.id) ?? [],
    customerName: ((o.customer_snapshot as Record<string, string> | null)?.name
      ?? [(o.customer_snapshot as Record<string, string> | null)?.first_name, (o.customer_snapshot as Record<string, string> | null)?.last_name].filter(Boolean).join(' '))
      || '—',
    customerEmail: (o.customer_snapshot as Record<string, string> | null)?.email ?? '—',
  }))
}

export default async function PedidosPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>
}) {
  const sp    = await searchParams
  const range = getDateRangeFromSearchParams(sp)

  const yampiOk = !!(
    process.env.YAMPI_ALIAS &&
    process.env.YAMPI_API_TOKEN &&
    process.env.YAMPI_SECRET_KEY
  )

  const orders = await getOrders(range)

  const PAID_STATUSES_LOCAL = ['paid', 'invoiced', 'on_carriage', 'payment_confirmed', 'preparing_shipping', 'in_separation', 'in_transit', 'delivered']
  const paidOrders    = orders.filter(o => PAID_STATUSES_LOCAL.includes(o.status))
  const pendingOrders = orders.filter(o => o.status === 'pending')
  const revenue       = paidOrders.reduce((s, o) => s + parseFloat(String(o.total ?? 0)), 0)
  const ticketMedio   = paidOrders.length > 0 ? revenue / paidOrders.length : 0

  return (
    <div style={{ padding: '32px', maxWidth: '960px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--admin-text-main)', marginBottom: '4px' }}>Pedidos</h1>
        <p style={{ fontSize: '14px', color: 'var(--admin-text-muted)' }}>
          {orders.length > 0
            ? `${orders.length} pedido${orders.length > 1 ? 's' : ''} — ${range.label}`
            : `Pedidos do novo site oficial — ${range.label}`}
        </p>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
        {[
          { label: 'Pedidos pagos',  value: paidOrders.length.toString(),  color: '#16a34a', bg: 'rgba(22,163,74,0.08)' },
          { label: 'Pendentes',      value: pendingOrders.length.toString(), color: '#d97706', bg: 'rgba(217,119,6,0.08)' },
          { label: 'Receita',        value: fmt(revenue),                   color: 'var(--admin-text-main)', bg: 'var(--admin-card)' },
          { label: 'Ticket médio',   value: paidOrders.length > 0 ? fmt(ticketMedio) : '—', color: 'var(--admin-text-main)', bg: 'var(--admin-card)' },
        ].map(({ label, value, color, bg }) => (
          <div key={label} style={{ background: bg, border: '1px solid var(--admin-border)', borderRadius: '12px', padding: '14px 16px' }}>
            <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '6px' }}>{label}</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color, lineHeight: 1.1 }}>{value}</div>
          </div>
        ))}
      </div>

      {pendingOrders.length > 3 && (
        <div style={{ display: 'flex', gap: '10px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px', padding: '12px 16px', marginBottom: '20px', fontSize: '13px', color: '#92400e' }}>
          <span>⚠️</span>
          <span><strong>{pendingOrders.length} pedidos pendentes</strong> — possíveis Pix aguardando confirmação. Verifique o painel Yampi.</span>
        </div>
      )}

      {/* Yampi not configured warning — only when truly missing */}
      {!yampiOk && (
        <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '10px', padding: '16px 20px', marginBottom: '24px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
          <span style={{ fontSize: '18px' }}>⚠️</span>
          <div>
            <p style={{ fontSize: '13px', fontWeight: 600, color: '#92400e', marginBottom: '4px' }}>Integração Yampi incompleta</p>
            <p style={{ fontSize: '12px', color: '#b45309' }}>
              Faltam env vars: {[
                !process.env.YAMPI_ALIAS && 'YAMPI_ALIAS',
                !process.env.YAMPI_API_TOKEN && 'YAMPI_API_TOKEN',
                !process.env.YAMPI_SECRET_KEY && 'YAMPI_SECRET_KEY',
              ].filter(Boolean).join(', ')}
            </p>
          </div>
        </div>
      )}

      {/* Orders list */}
      {orders.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {orders.map(order => {
            const s = statusLabel(order.status)
            return (
              <div key={order.id} style={{ background: 'var(--admin-card)', borderRadius: '12px', border: '1px solid var(--admin-border)', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Header row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--admin-text-main)' }}>#{order.external_id}</span>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: s.color, background: s.bg, padding: '2px 8px', borderRadius: '20px' }}>{s.label}</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--admin-text-main)' }}>{fmt(order.total)}</div>
                    <div style={{ fontSize: '11px', color: 'var(--admin-text-muted)' }}>{fmtDate(order.created_at)}</div>
                  </div>
                </div>

                {/* Customer */}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'var(--admin-card-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', color: 'var(--admin-text-muted)', fontWeight: 600, flexShrink: 0 }}>
                    {order.customerName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--admin-text-main)' }}>{order.customerName}</div>
                    <div style={{ fontSize: '11px', color: 'var(--admin-text-muted)' }}>{order.customerEmail}</div>
                  </div>
                </div>

                {/* Items */}
                {order.items.length > 0 && (
                  <div style={{ background: 'var(--admin-bg)', borderRadius: '8px', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {order.items.map((item, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--admin-text-sec)' }}>{item.product_title}</span>
                          {item.sku && <span style={{ fontSize: '11px', color: 'var(--admin-text-muted)', marginLeft: '8px' }}>{item.sku}</span>}
                        </div>
                        <span style={{ fontSize: '12px', color: 'var(--admin-text-muted)', whiteSpace: 'nowrap' }}>
                          {item.quantity}× {fmt(item.price)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Totals breakdown */}
                {(order.discount_amount > 0 || order.shipping_amount > 0) && (
                  <div style={{ display: 'flex', gap: '16px', fontSize: '11px', color: 'var(--admin-text-muted)' }}>
                    <span>Subtotal: {fmt(order.subtotal)}</span>
                    {order.discount_amount > 0 && <span style={{ color: '#16a34a' }}>Desconto: -{fmt(order.discount_amount)}</span>}
                    {order.shipping_amount > 0 && <span>Frete: {fmt(order.shipping_amount)}</span>}
                    {order.utm_source && <span>Fonte: {order.utm_source}</span>}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        /* Empty state */
        <div style={{ background: 'var(--admin-card)', borderRadius: '12px', border: '1px solid var(--admin-border)', padding: '48px', textAlign: 'center' }}>
          <div style={{ width: '56px', height: '56px', background: 'var(--admin-card-hover)', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <ShoppingBag size={24} color="#94a3b8" />
          </div>
          <h2 style={{ fontSize: '17px', fontWeight: 600, color: 'var(--admin-text-main)', marginBottom: '8px' }}>
            Nenhum pedido neste período
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--admin-text-muted)', maxWidth: '360px', margin: '0 auto', lineHeight: 1.6 }}>
            Nenhum pedido do novo site oficial em <strong>{range.label}</strong>. Tente outro período ou aguarde o primeiro pedido.
          </p>
        </div>
      )}
    </div>
  )
}
