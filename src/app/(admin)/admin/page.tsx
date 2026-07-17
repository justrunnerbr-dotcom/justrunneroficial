import type { ComponentType, ReactNode } from 'react'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import { CeoRefreshButton } from './_components/ceo-refresh-button'
import { CeoSyncButton } from './_components/ceo-sync-button'
import { BrainPanel } from './_components/brain-panel'
import { DashboardEditableLayout, type DashboardWidget } from './_components/dashboard-editable-layout'
import { ReorderableRow } from './_components/reorderable-row'
import { MetaTaxProvider, MetaTaxToggle, MarketingSpendAmount } from './_components/meta-tax-toggle'
import type { RecommendationCardData } from './_components/brain-card'
import { DollarSign, ShoppingBag, Users, Percent, Target, CheckCircle2, AlertCircle, Tag, BrainCircuit, TrendingUp, Megaphone, CreditCard, MousePointerClick } from 'lucide-react'
import Link from 'next/link'
import { getDateRangeFromSearchParams, getPreviousPeriodRange, type DateRange } from '@/lib/admin/date-range'
import { getBrainQuickStats } from '@/lib/admin/commerce-brain'
import { getMetaDashboardStats, getMetaLiveSpend } from '@/lib/admin/meta-ads'
import { getSalesBreakdown } from '@/lib/admin/sales-breakdown'
import { ConversionFunnelVisual } from './_components/conversion-funnel-visual'
import { HourlySalesChart } from './_components/hourly-sales-chart'
import { PaymentMethodDonut } from './_components/payment-method-donut'
import { ApprovalRateRings } from './_components/approval-rate-rings'
import { RegionalAnalysis } from './_components/regional-analysis'
import { InvestmentBarChart } from './_components/investment-bar-chart'

const STORE_ID = 'b0000000-0000-0000-0000-000000000001'
const TZ = 'America/Sao_Paulo'

const COLORS = {
  bg: 'var(--admin-bg)',
  card: 'var(--admin-card)',
  cardHover: 'var(--admin-card-hover)',
  border: 'var(--admin-border)',
  textMain: 'var(--admin-text-main)',
  textSec: 'var(--admin-text-sec)',
  textMuted: 'var(--admin-text-muted)',
  green: 'var(--admin-accent)',
  red: 'var(--admin-red)',
  alert: 'var(--admin-alert)',
  info: 'var(--admin-info)',
}

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

function delta(cur: number, prev: number): { pct: number; up: boolean } {
  if (prev === 0) return { pct: cur > 0 ? 100 : 0, up: cur >= 0 }
  const pct = ((cur - prev) / prev) * 100
  return { pct: Math.round(Math.abs(pct)), up: pct >= 0 }
}

function sumRows(rows: Record<string, number>[], key: string): number {
  return rows.reduce((s, r) => s + (Number(r[key]) || 0), 0)
}

async function getDashboardData(range: DateRange) {
  const db   = getDb()
  const prev = getPreviousPeriodRange(range)

  const [curRows, prevRows, recentOrders, liveCount, topProducts, healthRow, brainRecs, pendingCount, paidCount, manualPaidCount] = await Promise.all([
    db.from('daily_analytics').select('*').eq('store_id', STORE_ID).gte('date', range.start).lt('date', range.endExclusive),
    db.from('daily_analytics').select('*').eq('store_id', STORE_ID).gte('date', prev.start).lt('date', prev.endExclusive),
    db.from('orders').select('external_id, total, status, payment_method, created_at, customer_snapshot').eq('store_id', STORE_ID).gte('created_at', range.startISO).lt('created_at', range.endISO).order('created_at', { ascending: false }).limit(6),
    db.from('live_visitors').select('session_id', { count: 'exact', head: true }).eq('store_id', STORE_ID).gte('last_seen', new Date(Date.now() - 10 * 60 * 1000).toISOString()),
    db.from('events').select('product_slug').eq('store_id', STORE_ID).eq('event_type', 'view_content').gte('created_at', range.startISO).lt('created_at', range.endISO),
    db.from('health_scores').select('*').eq('store_id', STORE_ID).order('calculated_at', { ascending: false }).limit(1).maybeSingle(),
    db.from('brain_recommendations').select(`*, signal:brain_signals(signal_type, severity, metric_name, current_value, baseline_value, delta_pct, detected_at)`).eq('store_id', STORE_ID).in('status', ['open', 'acknowledged']).order('created_at', { ascending: false }).limit(5),
    db.from('orders').select('id', { count: 'exact', head: true }).eq('store_id', STORE_ID).eq('status', 'pending').gte('created_at', range.startISO).lt('created_at', range.endISO),
    db.from('orders').select('id', { count: 'exact', head: true }).eq('store_id', STORE_ID).eq('status', 'paid').gte('created_at', range.startISO).lt('created_at', range.endISO),
    db.from('manual_orders').select('id', { count: 'exact', head: true }).gte('created_at', range.startISO).lt('created_at', range.endISO),
  ])

  const curData  = (curRows.data  ?? []) as Record<string, number>[]
  const prevData = (prevRows.data ?? []) as Record<string, number>[]

  const productCounts: Record<string, number> = {}
  for (const e of topProducts.data ?? []) {
    if (e.product_slug) productCounts[e.product_slug] = (productCounts[e.product_slug] ?? 0) + 1
  }
  const topProductList = Object.entries(productCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  return {
    cur: {
      revenue:         sumRows(curData, 'revenue'),
      orders:          sumRows(curData, 'orders'),
      sessions:        sumRows(curData, 'sessions'),
      page_views:      sumRows(curData, 'page_views'),
      product_views:   sumRows(curData, 'product_views'),
      add_to_carts:    sumRows(curData, 'add_to_carts'),
      checkout_starts: sumRows(curData, 'checkout_starts'),
      conversion_rate: curData.length ? sumRows(curData, 'conversion_rate') / curData.length : 0,
    },
    prev: {
      revenue:  sumRows(prevData, 'revenue'),
      orders:   sumRows(prevData, 'orders'),
      sessions: sumRows(prevData, 'sessions'),
    },
    recentOrders: recentOrders.data ?? [],
    liveNow:      liveCount.count ?? 0,
    topProducts:  topProductList,
    healthScore:  healthRow.data as Record<string, unknown> | null,
    brainRecs:    (brainRecs.data ?? []) as RecommendationCardData[],
    pendingCount: pendingCount.count ?? 0,
    // Pedidos manuais (venda por link direto, fora do catálogo/Yampi) contam
    // como pagos também — mesma lógica do refreshDailyAnalytics.
    paidCount:    (paidCount.count ?? 0) + (manualPaidCount.count ?? 0),
    hasData:      curData.length > 0,
    hasOrders:    (recentOrders.data?.length ?? 0) > 0,
  }
}

const STATUS_LABEL: Record<string, string> = {
  paid:      'Pago',
  pending:   'Aguardando',
  cancelled: 'Cancelado',
  refunded:  'Reembolsado',
  shipped:   'Enviado',
  delivered: 'Entregue',
}
const STATUS_COLOR: Record<string, string> = {
  paid:      '#10B981',
  pending:   '#F59E0B',
  cancelled: '#EF4444',
  refunded:  '#A855F7',
  shipped:   '#38BDF8',
  delivered: '#10B981',
}

function TrendBadge({ up, pct }: { up: boolean; pct: number }) {
  const color = up ? COLORS.green : COLORS.red
  const bg = up ? 'rgba(var(--admin-accent-rgb), 0.1)' : 'rgba(var(--admin-red-rgb), 0.1)'
  return (
    <span style={{
      fontSize: '11px', fontWeight: 600, color, background: bg,
      padding: '2px 6px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '4px'
    }}>
      {up ? '↑' : '↓'} {pct}%
    </span>
  )
}

interface MetricCardProps {
  title: string
  value: ReactNode
  sub:   string
  up:    boolean
  pct:   number
  icon:  ComponentType<{ size?: number; color?: string }>
}

function MetricCard({ title, value, sub, up, pct, icon: Icon }: MetricCardProps) {
  return (
    <div style={{
      background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: '14px',
      padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '12px', fontWeight: 600, color: COLORS.textSec, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{title}</span>
        {Icon && <Icon size={16} color={COLORS.textMuted} />}
      </div>
      <div style={{ fontSize: '24px', fontWeight: 700, color: COLORS.textMain, fontFamily: 'monospace' }}>{value}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <TrendBadge up={up} pct={pct} />
        <span style={{ fontSize: '12px', color: COLORS.textMuted }}>{sub}</span>
      </div>
    </div>
  )
}

function SectionHeader({ title }: { title: string }) {
  return (
    <h2 style={{ fontSize: '14px', fontWeight: 600, color: COLORS.textMain, margin: '0 0 16px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
      {title}
    </h2>
  )
}

export default async function AdminPage({
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
  const db    = getDb()
  const [d, brainQ, metaStats, liveSpend, salesBreakdown] = await Promise.all([
    getDashboardData(range),
    getBrainQuickStats(db, range),
    getMetaDashboardStats(db, range),
    getMetaLiveSpend(range.start, range.endExclusive),
    getSalesBreakdown(range),
  ])

  const totalAdClicks = liveSpend?.total.clicks ?? 0

  const revCur  = d.cur.revenue
  const revPrev = d.prev.revenue
  const { pct: revPct, up: revUp } = delta(revCur, revPrev)

  const ticketMedioCur  = d.cur.orders  ? revCur  / d.cur.orders  : 0
  const ticketMedioPrev = d.prev.orders ? revPrev / d.prev.orders : 0

  const widgets: DashboardWidget[] = [
    {
      id: 'overview',
      label: 'Visão Geral (Receita, Investimento, Métricas)',
      node: (
      <MetaTaxProvider>
      <ReorderableRow
        storageKey="overview"
        gridTemplateColumns="1fr 1fr 2fr"
        items={[
          {
            id: 'receita',
            node: (
              <div style={{
                background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: '16px',
                padding: '28px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                boxShadow: '0 8px 30px rgba(0,0,0,0.3)', height: '100%',
              }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: COLORS.textSec, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>Receita do Período</div>
                  <div style={{ fontSize: '36px', fontWeight: 800, color: COLORS.textMain, fontFamily: 'monospace', marginBottom: '8px' }}>
                    {fmt(revCur)}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <TrendBadge up={revUp} pct={revPct} />
                    <span style={{ fontSize: '13px', color: COLORS.textMuted }}>vs. {fmt(revPrev)} período ant.</span>
                  </div>
                </div>
                <div style={{ height: '60px', marginTop: '24px', display: 'flex', alignItems: 'flex-end', gap: '4px' }}>
                  {[30, 45, 20, 60, 40, 80, 50, 90, 70, 100].map((h, i) => (
                    <div key={i} style={{ flex: 1, background: `linear-gradient(to top, rgba(var(--admin-accent-rgb), 0.05), rgba(var(--admin-accent-rgb), 0.4))`, height: `${h}%`, borderRadius: '2px 2px 0 0', borderTop: `1px solid ${COLORS.green}` }} />
                  ))}
                </div>
              </div>
            ),
          },
          {
            id: 'investimento',
            node: (
              <div style={{
                background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: '16px',
                padding: '28px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                boxShadow: '0 8px 30px rgba(0,0,0,0.3)', height: '100%',
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: COLORS.textSec, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Investimento Meta</span>
                    <span style={{ background: 'rgba(34,197,94,0.1)', color: '#16a34a', fontSize: '9px', fontWeight: 700, padding: '2px 6px', borderRadius: '99px' }}>LIVE</span>
                    <MetaTaxToggle />
                  </div>
                  <div style={{ fontSize: '36px', fontWeight: 800, color: COLORS.textMain, fontFamily: 'monospace', marginBottom: '8px' }}>
                    {liveSpend ? <MarketingSpendAmount metaRaw={liveSpend.total.spend} googleRaw={0} /> : '—'}
                  </div>
                  {liveSpend && (
                    <div style={{ fontSize: '13px', color: COLORS.textMuted }}>
                      {liveSpend.total.impressions.toLocaleString('pt-BR')} imp · {liveSpend.total.clicks.toLocaleString('pt-BR')} cliques
                    </div>
                  )}
                </div>

                {liveSpend && (
                  <InvestmentBarChart
                    sources={liveSpend.accounts.map(acc => ({ name: acc.name, spend: acc.period.spend, isMeta: true }))}
                  />
                )}
              </div>
            ),
          },
          {
            id: 'metrics-grid',
            node: (
              <ReorderableRow
                storageKey="overview-metrics"
                gridTemplateColumns="repeat(3, 1fr)"
                mobileColumns={2}
                items={[
                  { id: 'pedidos', node: <MetricCard title="Pedidos" value={d.cur.orders} sub={`Ant: ${d.prev.orders}`} icon={ShoppingBag} {...delta(d.cur.orders, d.prev.orders)} /> },
                  { id: 'ticket-medio', node: <MetricCard title="Ticket Médio" value={fmt(ticketMedioCur)} sub={`Ant: ${fmt(ticketMedioPrev)}`} icon={DollarSign} {...delta(ticketMedioCur, ticketMedioPrev)} /> },
                  { id: 'conversao', node: <MetricCard title="Conversão" value={`${(d.cur.conversion_rate * 100).toFixed(2)}%`} sub={`Sessões: ${d.cur.sessions}`} icon={Percent} {...delta(d.cur.conversion_rate, 0)} /> },
                  { id: 'sessoes', node: <MetricCard title="Sessões" value={d.cur.sessions} sub={`Ant: ${d.prev.sessions}`} icon={Users} {...delta(d.cur.sessions, d.prev.sessions)} /> },
                  { id: 'cpa', node: <MetricCard title="CPA" value={liveSpend && d.paidCount > 0 ? <MarketingSpendAmount metaRaw={liveSpend.total.spend} googleRaw={0} divideBy={d.paidCount} /> : '—'} sub="Custo por Aquisição" icon={Target} up={true} pct={0} /> },
                  { id: 'pagos', node: <MetricCard title="Pagos" value={d.paidCount} sub="Confirmados" icon={CheckCircle2} up={true} pct={0} /> },
                ]}
              />
            ),
          },
        ]}
      />
      </MetaTaxProvider>
      ),
    },
    {
      id: 'funnel',
      label: 'Funil de Conversão',
      node: (
        <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: '16px', padding: '24px' }}>
          <SectionHeader title="Funil de Conversão" />
          <ConversionFunnelVisual
            steps={[
              { label: 'Cliques',    value: totalAdClicks,         icon: MousePointerClick },
              { label: 'Visitantes', value: d.cur.page_views,      icon: Users },
              { label: 'Carrinho',   value: d.cur.add_to_carts,    icon: ShoppingBag },
              { label: 'Checkout',   value: d.cur.checkout_starts, icon: CreditCard },
              { label: 'Pedido',     value: d.cur.orders,          icon: CheckCircle2 },
            ]}
          />
        </div>
      ),
    },
    {
      id: 'vendas-detalhe',
      label: 'Vendas por Horário, Pagamento e Aprovação',
      node: (
      <ReorderableRow
        storageKey="vendas-detalhe"
        gridTemplateColumns="2fr 1fr 1fr"
        items={[
          {
            id: 'vendas-horario',
            node: (
              <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: '16px', padding: '24px', height: '100%' }}>
                <SectionHeader title="Vendas por Horário" />
                <HourlySalesChart data={salesBreakdown.hourly} />
              </div>
            ),
          },
          {
            id: 'vendas-pagamento',
            node: (
              <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: '16px', padding: '24px', height: '100%' }}>
                <SectionHeader title="Vendas por Pagamento" />
                <PaymentMethodDonut data={salesBreakdown.byPayment} />
              </div>
            ),
          },
          {
            id: 'taxa-aprovacao',
            node: (
              <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: '16px', padding: '24px', height: '100%' }}>
                <SectionHeader title="Taxa de Aprovação" />
                <ApprovalRateRings data={salesBreakdown.approvalByPayment} />
              </div>
            ),
          },
        ]}
      />
      ),
    },
    {
      id: 'regional-analysis',
      label: 'Análise Regional',
      node: <RegionalAnalysis data={salesBreakdown.byState} />,
    },
    {
      id: 'top-status',
      label: 'Top Produtos e Status de Pedidos',
      node: (
      <ReorderableRow
        storageKey="top-status"
        gridTemplateColumns="1fr 1fr"
        items={[
          {
            id: 'top-produtos',
            node: (
              <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: '16px', padding: '24px', height: '100%' }}>
                <SectionHeader title="Top Produtos (7D)" />
                {d.topProducts.length === 0 ? (
                  <p style={{ fontSize: '13px', color: COLORS.textMuted, margin: 0 }}>Sem dados de visualização ainda.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {d.topProducts.map(([slug, count], i) => (
                      <div key={slug} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: `1px solid ${COLORS.border}` }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ fontSize: '12px', color: COLORS.textMuted, width: '16px' }}>{i + 1}.</span>
                          <span style={{ fontSize: '13px', color: COLORS.textMain }}>{slug}</span>
                        </div>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: COLORS.info, background: 'rgba(56, 189, 248, 0.1)', padding: '2px 8px', borderRadius: '4px' }}>
                          {count} views
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ),
          },
          {
            id: 'status-diario',
            node: (
              <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', height: '100%' }}>
                <SectionHeader title="Status de Pedidos (Hoje)" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1, justifyContent: 'center' }}>
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                     <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><div style={{ width: '8px', height: '8px', borderRadius: '50%', background: COLORS.green }}></div><span style={{ fontSize: '13px', color: COLORS.textSec }}>Pagos</span></div>
                     <span style={{ fontSize: '14px', fontWeight: 600, color: COLORS.textMain }}>{d.paidCount}</span>
                   </div>
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                     <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><div style={{ width: '8px', height: '8px', borderRadius: '50%', background: COLORS.alert }}></div><span style={{ fontSize: '13px', color: COLORS.textSec }}>Pendentes</span></div>
                     <span style={{ fontSize: '14px', fontWeight: 600, color: COLORS.textMain }}>{d.pendingCount}</span>
                   </div>
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                     <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><div style={{ width: '8px', height: '8px', borderRadius: '50%', background: COLORS.textMuted }}></div><span style={{ fontSize: '13px', color: COLORS.textSec }}>Outros</span></div>
                     <span style={{ fontSize: '14px', fontWeight: 600, color: COLORS.textMain }}>{d.cur.orders - d.paidCount - d.pendingCount}</span>
                   </div>
                </div>
              </div>
            ),
          },
        ]}
      />
      ),
    },
    {
      id: 'orders-alerts',
      label: 'Pedidos Recentes e Alertas Operacionais',
      node: (
      <ReorderableRow
        storageKey="orders-alerts"
        gridTemplateColumns="2fr 1fr"
        items={[
          {
            id: 'pedidos-recentes',
            node: (
              <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: '16px', padding: '24px', height: '100%' }}>
                <SectionHeader title="Pedidos Recentes" />
                {d.recentOrders.length === 0 ? (
                  <p style={{ fontSize: '13px', color: COLORS.textMuted }}>Nenhum pedido recente registrado.</p>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                        {['Pedido', 'Cliente', 'Valor', 'Status', 'Data'].map((h) => (
                          <th key={h} style={{ textAlign: 'left', padding: '12px 0', color: COLORS.textMuted, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '11px' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {d.recentOrders.map((order) => {
                        const snap = order.customer_snapshot as Record<string, string> | null
                        const name = snap ? [snap.first_name, snap.last_name].filter(Boolean).join(' ') || snap.email || '—' : '—'
                        const color = STATUS_COLOR[order.status] ?? COLORS.textMuted
                        const label = STATUS_LABEL[order.status] ?? order.status
                        return (
                          <tr key={order.external_id} style={{ borderBottom: `1px solid var(--admin-border)` }}>
                            <td style={{ padding: '14px 0', color: COLORS.textMain, fontFamily: 'monospace' }}>#{order.external_id}</td>
                            <td style={{ padding: '14px 0', color: COLORS.textSec }}>{name}</td>
                            <td style={{ padding: '14px 0', fontWeight: 600, color: COLORS.textMain }}>{fmt(parseFloat(String(order.total)))}</td>
                            <td style={{ padding: '14px 0' }}>
                              <span style={{ fontSize: '11px', fontWeight: 600, color, background: `${color}15`, padding: '4px 8px', borderRadius: '4px', border: `1px solid ${color}30` }}>
                                {label}
                              </span>
                            </td>
                            <td style={{ padding: '14px 0', color: COLORS.textMuted, fontSize: '12px' }}>
                              {new Date(order.created_at).toLocaleDateString('pt-BR', { timeZone: TZ })}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            ),
          },
          {
            id: 'alertas',
            node: (
              <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: '16px', padding: '24px', height: '100%' }}>
                <SectionHeader title="Alertas Operacionais" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                   {d.pendingCount > 5 && (
                     <div style={{ display: 'flex', gap: '12px', background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.2)', padding: '12px', borderRadius: '8px' }}>
                       <AlertCircle size={16} color={COLORS.alert} style={{ flexShrink: 0, marginTop: '2px' }} />
                       <div>
                         <div style={{ fontSize: '13px', fontWeight: 600, color: COLORS.textMain, marginBottom: '2px' }}>Pico de Boletos/Pix Pendentes</div>
                         <div style={{ fontSize: '12px', color: COLORS.textSec }}>Existem {d.pendingCount} pedidos pendentes. Considere ativar recuperação.</div>
                       </div>
                     </div>
                   )}
                   <div style={{ display: 'flex', gap: '12px', background: 'rgba(56, 189, 248, 0.05)', border: '1px solid rgba(56, 189, 248, 0.2)', padding: '12px', borderRadius: '8px' }}>
                       <Tag size={16} color={COLORS.info} style={{ flexShrink: 0, marginTop: '2px' }} />
                       <div>
                         <div style={{ fontSize: '13px', fontWeight: 600, color: COLORS.textMain, marginBottom: '2px' }}>Produtos Esgotados</div>
                         <div style={{ fontSize: '12px', color: COLORS.textSec }}>Verifique o catálogo, alguns top sellers estão sem estoque na Yampi.</div>
                       </div>
                     </div>
                </div>
              </div>
            ),
          },
        ]}
      />
      ),
    },
    {
      id: 'commerce-brain',
      label: 'Commerce Brain',
      node: (
      <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: '16px', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <BrainCircuit size={18} color="var(--admin-accent)" />
            <h2 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: COLORS.textMain, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Commerce Brain</h2>
            <span style={{ background: 'rgba(var(--admin-accent-rgb),0.12)', color: 'var(--admin-accent)', fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '99px', letterSpacing: '0.4px' }}>
              TEMPO REAL
            </span>
          </div>
          <Link href="/admin/brain" style={{ fontSize: '12px', color: 'var(--admin-accent)', textDecoration: 'none', fontWeight: 500 }}>
            Análise completa →
          </Link>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '14px' }}>
          {[
            { label: 'Add to Cart', value: brainQ.atc },
            { label: 'Checkouts',   value: brainQ.checkout },
            { label: 'Pedidos pagos', value: brainQ.paid },
            { label: 'Gargalo principal', value: brainQ.biggestGap },
          ].map(({ label, value }) => (
            <div key={label} style={{ background: 'var(--admin-bg)', borderRadius: '10px', padding: '12px 14px', border: `1px solid ${COLORS.border}` }}>
              <div style={{ fontSize: '10px', fontWeight: 600, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '6px' }}>{label}</div>
              <div style={{ fontSize: typeof value === 'number' ? '20px' : '13px', fontWeight: 700, color: COLORS.textMain, fontFamily: typeof value === 'number' ? 'monospace' : 'inherit', lineHeight: 1.2 }}>
                {typeof value === 'number' ? value.toLocaleString('pt-BR') : value}
              </div>
            </div>
          ))}
        </div>

        {brainQ.topInsight ? (
          <div style={{ display: 'flex', gap: '12px', background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: '10px', padding: '12px 14px' }}>
            <AlertCircle size={15} color={COLORS.alert} style={{ flexShrink: 0, marginTop: '1px' }} />
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: COLORS.textMain, marginBottom: '2px' }}>{brainQ.biggestGap}</div>
              <div style={{ fontSize: '12px', color: COLORS.textSec, marginBottom: '4px' }}>{brainQ.topInsight}</div>
              <div style={{ fontSize: '11px', color: COLORS.textMuted, fontStyle: 'italic' }}>→ {brainQ.topInsightAction}</div>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '10px', padding: '12px 14px' }}>
            <CheckCircle2 size={15} color={COLORS.green} />
            <span style={{ fontSize: '13px', color: COLORS.textSec }}>
              {brainQ.atc >= 5 ? 'Funil dentro dos parâmetros esperados no período selecionado.' : 'Volume ainda baixo para diagnóstico completo — dados crescendo.'}
            </span>
          </div>
        )}
      </div>
      ),
    },
    {
      id: 'meta-ads',
      label: 'Meta Ads',
      node: (
      <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: '16px', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <TrendingUp size={18} color="var(--admin-accent)" />
            <h2 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: COLORS.textMain, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Meta Ads</h2>
            {metaStats ? (
              <span style={{ background: 'rgba(34,197,94,0.1)', color: '#16a34a', fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '99px', letterSpacing: '0.4px' }}>CONECTADO</span>
            ) : (
              <span style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '99px', letterSpacing: '0.4px' }}>NÃO CONECTADO</span>
            )}
          </div>
          <Link href="/admin/meta-ads" style={{ fontSize: '12px', color: 'var(--admin-accent)', textDecoration: 'none', fontWeight: 500 }}>
            Ver Meta Ads →
          </Link>
        </div>

        {metaStats && metaStats.totalSpend > 0 ? (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '14px' }}>
              {[
                { label: 'Investimento', value: `R$ ${metaStats.totalSpend.toFixed(2)}` },
                { label: 'ROAS Meta',    value: `${metaStats.metaRoas.toFixed(2)}×` },
                { label: 'Melhor campanha', value: metaStats.topCampaign ?? '—' },
                { label: 'Em alerta',    value: metaStats.alertCampaign ?? 'Nenhuma' },
              ].map(({ label, value }) => (
                <div key={label} style={{ background: 'var(--admin-bg)', borderRadius: '10px', padding: '12px 14px', border: `1px solid ${COLORS.border}` }}>
                  <div style={{ fontSize: '10px', fontWeight: 600, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '6px' }}>{label}</div>
                  <div style={{ fontSize: typeof value === 'number' ? '20px' : '13px', fontWeight: 700, color: COLORS.textMain, lineHeight: 1.2 }}>{value}</div>
                </div>
              ))}
            </div>
            {metaStats.alertCampaign && (
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px', padding: '10px 14px', fontSize: '13px', color: COLORS.textSec }}>
                <AlertCircle size={14} color="#ef4444" />
                <span>Campanha <strong>&quot;{metaStats.alertCampaign}&quot;</strong> com gasto sem retorno. Revisar segmentação.</span>
              </div>
            )}
          </>
        ) : metaStats ? (
          <div style={{ fontSize: '13px', color: COLORS.textMuted, padding: '8px 0' }}>
            Meta Ads conectado mas sem dados para este período.{' '}
            <Link href="/admin/meta-ads" style={{ color: 'var(--admin-accent)', fontWeight: 500, textDecoration: 'none' }}>Sincronizar →</Link>
          </div>
        ) : (
          <div style={{ fontSize: '13px', color: COLORS.textMuted, padding: '8px 0' }}>
            Meta Ads não conectado. Configure <code style={{ fontFamily: 'monospace', fontSize: '12px' }}>META_ACCESS_TOKEN</code> e <code style={{ fontFamily: 'monospace', fontSize: '12px' }}>META_AD_ACCOUNT_ID</code> para ver dados de campanhas.{' '}
            <Link href="/admin/meta-ads" style={{ color: 'var(--admin-accent)', fontWeight: 500, textDecoration: 'none' }}>Como conectar →</Link>
          </div>
        )}
      </div>
      ),
    },
    {
      id: 'brain-panel',
      label: 'Recomendações do Commerce Brain',
      node: <BrainPanel recommendations={d.brainRecs} />,
    },
  ]

  return (
    <div className="px-4 py-6 md:px-10 md:py-8" style={{ maxWidth: '1600px', margin: '0 auto', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', background: COLORS.bg, minHeight: '100vh' }}>

      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '32px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 700, color: COLORS.textMain }}>Dashboard</h1>
          <p style={{ margin: '4px 0 0', fontSize: '14px', color: COLORS.textSec }}>
            Visão geral do novo site oficial · <span style={{ color: d.liveNow > 0 ? COLORS.green : COLORS.textMuted }}>{d.liveNow > 0 ? `● ${d.liveNow} online` : '○ offline'}</span>
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <CeoRefreshButton />
          <CeoSyncButton />
        </div>
      </div>

      {!d.hasData && (
        <div style={{
          background: 'rgba(245, 158, 11, 0.1)', border: `1px solid rgba(245, 158, 11, 0.2)`, borderRadius: '12px',
          padding: '16px 20px', marginBottom: '24px', fontSize: '14px', color: COLORS.alert,
        }}>
          <strong>Aguardando dados.</strong> Nenhum pedido ou visitante computado neste período ainda. Os dados aparecerão após as primeiras interações.
        </div>
      )}

      <DashboardEditableLayout widgets={widgets} />

    </div>
  )
}
