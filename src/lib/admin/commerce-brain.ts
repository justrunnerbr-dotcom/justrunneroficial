import { SupabaseClient } from '@supabase/supabase-js'
import type { DateRange } from './date-range'
import { fetchAllRows } from './supabase-pagination'

const STORE_ID = 'b0000000-0000-0000-0000-000000000001'

const PAID_STATUSES = [
  'paid', 'invoiced', 'on_carriage', 'payment_confirmed',
  'preparing_shipping', 'in_separation', 'in_transit', 'delivered',
]

// ── Types ─────────────────────────────────────────────────────────────────────

export interface FunnelStep {
  label: string
  count: number
  rateFromPrev: number   // 0–1
  rateFromStart: number  // 0–1
  dropCount: number
  status: 'healthy' | 'attention' | 'critical'
}

export interface ProductDiagnostic {
  slug: string
  views: number
  atc: number
  atcRate: number
  classification: string
  alert: string | null
}

export interface TrafficDiagnostic {
  source: string
  sessions: number
  orders: number
  revenue: number
  conversionRate: number
  revenuePerSession: number
  classification: string
}

export interface DeviceDiagnostic {
  device: string
  sessions: number
  views: number
  atc: number
  atcRate: number
}

export interface SessionEvent {
  event_type: string
  page: string | null
  product_slug: string | null
  created_at: string
}

export interface SessionJourney {
  sessionId: string
  device: string
  utmSource: string | null
  startedAt: string
  events: SessionEvent[]
  status: string
}

export type InsightType = 'critical' | 'high' | 'medium' | 'opportunity'

export interface BrainInsight {
  type: InsightType
  title: string
  evidence: string
  action: string
}

export interface BrainSummary {
  sessions: number
  productViews: number
  atc: number
  /** Sessões únicas com add_to_cart — mais confiável que `atc` pra ler taxa de
   * conversão, já que o "Compre 1 Leve 2" faz uma sessão gerar ~2 eventos. */
  atcSessions: number
  checkout: number
  paidOrders: number
  revenue: number
  totalConversion: number
  biggestGap: string
  hasEnoughData: boolean
}

export interface CommerceBrainData {
  funnel: FunnelStep[]
  products: ProductDiagnostic[]
  traffic: TrafficDiagnostic[]
  devices: DeviceDiagnostic[]
  journeys: SessionJourney[]
  insights: BrainInsight[]
  summary: BrainSummary
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function ratio(num: number, den: number): number {
  if (den === 0) return 0
  return num / den
}

function funnelStatus(r: number, type: string): 'healthy' | 'attention' | 'critical' {
  if (type === 'product_view') {
    if (r >= 0.30) return 'healthy'
    if (r >= 0.12) return 'attention'
    return 'critical'
  }
  if (type === 'atc') {
    if (r >= 0.07) return 'healthy'
    if (r >= 0.03) return 'attention'
    return 'critical'
  }
  if (type === 'checkout') {
    if (r >= 0.50) return 'healthy'
    if (r >= 0.25) return 'attention'
    return 'critical'
  }
  if (type === 'paid') {
    if (r >= 0.35) return 'healthy'
    if (r >= 0.15) return 'attention'
    return 'critical'
  }
  return 'healthy'
}

function classifyProduct(
  views: number, atc: number, atcRate: number, storeAvg: number,
): { classification: string; alert: string | null } {
  if (views < 30) return { classification: 'Poucos dados', alert: null }
  if (atc === 0) return { classification: 'Sem carrinho', alert: `${views} views, zero adições ao carrinho` }
  const r = storeAvg > 0 ? atcRate / storeAvg : 1
  if (r >= 2.0 && views >= 80) return { classification: 'Campeão', alert: null }
  if (r >= 1.5) return { classification: 'Promissor', alert: null }
  if (r <= 0.4) return { classification: 'Alto tráfego, baixo interesse', alert: `ATC ${(atcRate * 100).toFixed(1)}% — abaixo da média` }
  if (r <= 0.7) return { classification: 'Atenção', alert: 'ATC abaixo da média' }
  return { classification: 'OK', alert: null }
}

function classifyTraffic(sessions: number, orders: number, convRate: number, storeAvg: number): string {
  if (sessions < 20) return 'Volume baixo'
  if (orders === 0) return 'Sem compras'
  const r = storeAvg > 0 ? convRate / storeAvg : 1
  if (r >= 1.5) return 'Tráfego comprador'
  if (r <= 0.5) return 'Baixa qualidade'
  return 'Médio'
}

function journeyStatus(types: string[]): string {
  const s = new Set(types)
  if (s.has('purchase')) return 'Comprou'
  if (s.has('initiate_checkout')) return 'Abandonou no checkout'
  if (s.has('cart_open') || s.has('add_to_cart')) return 'Abandonou no carrinho'
  if (s.has('view_content')) return 'Abandonou no produto'
  return 'Explorou sem intenção'
}

// ── Main fetcher ──────────────────────────────────────────────────────────────

export async function getCommerceBrainData(db: SupabaseClient, range: DateRange): Promise<CommerceBrainData> {

  // Batch 1: funnel counts (HEAD requests, imunes ao teto de 1000 linhas)
  const [
    sessionsRes, viewsRes, atcRes, checkoutRes, cartOpenRes, orders,
    sourceSessions, sourceOrders, recentSessionsRes,
  ] = await Promise.all([
    db.from('sessions').select('*', { count: 'exact', head: true })
      .eq('store_id', STORE_ID).gte('started_at', range.startISO).lt('started_at', range.endISO),
    db.from('events').select('*', { count: 'exact', head: true })
      .eq('store_id', STORE_ID).eq('event_type', 'view_content').gte('created_at', range.startISO).lt('created_at', range.endISO),
    db.from('events').select('*', { count: 'exact', head: true })
      .eq('store_id', STORE_ID).eq('event_type', 'add_to_cart').gte('created_at', range.startISO).lt('created_at', range.endISO),
    db.from('events').select('*', { count: 'exact', head: true })
      .eq('store_id', STORE_ID).eq('event_type', 'initiate_checkout').gte('created_at', range.startISO).lt('created_at', range.endISO),
    db.from('events').select('*', { count: 'exact', head: true })
      .eq('store_id', STORE_ID).eq('event_type', 'cart_open').gte('created_at', range.startISO).lt('created_at', range.endISO),
    fetchAllRows<{ total: number | string | null; utm_source: string | null }>((from, to) =>
      db.from('orders').select('total, utm_source')
        .eq('store_id', STORE_ID).in('status', PAID_STATUSES)
        .gte('created_at', range.startISO).lt('created_at', range.endISO).range(from, to)),
    fetchAllRows<{ utm_source: string | null }>((from, to) =>
      db.from('sessions').select('utm_source')
        .eq('store_id', STORE_ID).gte('started_at', range.startISO).lt('started_at', range.endISO).range(from, to)),
    fetchAllRows<{ total: number | string | null; utm_source: string | null }>((from, to) =>
      db.from('orders').select('total, utm_source')
        .eq('store_id', STORE_ID).in('status', PAID_STATUSES)
        .gte('created_at', range.startISO).lt('created_at', range.endISO).range(from, to)),
    db.from('sessions').select('id, started_at, device, utm_source')
      .eq('store_id', STORE_ID).gte('started_at', range.startISO).lt('started_at', range.endISO)
      .order('started_at', { ascending: false }).limit(25),
  ])

  const totalSessions = sessionsRes.count  ?? 0
  const totalViews    = viewsRes.count     ?? 0
  const totalAtc      = atcRes.count       ?? 0
  const totalCheckout = checkoutRes.count  ?? 0
  const totalPaid     = orders.length
  const totalRevenue  = orders.reduce((s, o) => s + parseFloat(String(o.total ?? 0)), 0)

  // Sessões únicas por etapa (não contagem bruta de evento) — uma sessão pode gerar
  // dezenas de view_content (navegador comparando produtos, ou bot/crawler), o que
  // achatava artificialmente a taxa de Add to Cart quando dividida por evento cru.
  const [viewSessionRows, atcSessionRows, checkoutSessionRows] = await Promise.all([
    fetchAllRows<{ session_id: string | null }>((from, to) =>
      db.from('events').select('session_id')
        .eq('store_id', STORE_ID).eq('event_type', 'view_content')
        .gte('created_at', range.startISO).lt('created_at', range.endISO).range(from, to)),
    fetchAllRows<{ session_id: string | null }>((from, to) =>
      db.from('events').select('session_id')
        .eq('store_id', STORE_ID).eq('event_type', 'add_to_cart')
        .gte('created_at', range.startISO).lt('created_at', range.endISO).range(from, to)),
    fetchAllRows<{ session_id: string | null }>((from, to) =>
      db.from('events').select('session_id')
        .eq('store_id', STORE_ID).eq('event_type', 'initiate_checkout')
        .gte('created_at', range.startISO).lt('created_at', range.endISO).range(from, to)),
  ])

  const viewSessions     = new Set(viewSessionRows.map(r => r.session_id)).size
  const atcSessions      = new Set(atcSessionRows.map(r => r.session_id)).size
  const checkoutSessions = new Set(checkoutSessionRows.map(r => r.session_id)).size

  // Batch 2: detail data for products + devices
  const [prodViews, prodAtc, devSessions, devViews, devAtc] = await Promise.all([
    fetchAllRows<{ product_slug: string | null }>((from, to) =>
      db.from('events').select('product_slug')
        .eq('store_id', STORE_ID).eq('event_type', 'view_content')
        .gte('created_at', range.startISO).lt('created_at', range.endISO).range(from, to)),
    fetchAllRows<{ product_slug: string | null }>((from, to) =>
      db.from('events').select('product_slug')
        .eq('store_id', STORE_ID).eq('event_type', 'add_to_cart')
        .gte('created_at', range.startISO).lt('created_at', range.endISO).range(from, to)),
    fetchAllRows<{ device: string | null }>((from, to) =>
      db.from('sessions').select('device')
        .eq('store_id', STORE_ID).gte('started_at', range.startISO).lt('started_at', range.endISO).range(from, to)),
    fetchAllRows<{ device: string | null }>((from, to) =>
      db.from('events').select('device')
        .eq('store_id', STORE_ID).eq('event_type', 'view_content')
        .gte('created_at', range.startISO).lt('created_at', range.endISO).range(from, to)),
    fetchAllRows<{ device: string | null }>((from, to) =>
      db.from('events').select('device')
        .eq('store_id', STORE_ID).eq('event_type', 'add_to_cart')
        .gte('created_at', range.startISO).lt('created_at', range.endISO).range(from, to)),
  ])

  // ── Funnel ─────────────────────────────────────────────────────────────────

  const funnel: FunnelStep[] = [
    { label: 'Sessões',                count: totalSessions,  rateFromPrev: 1,                                       rateFromStart: 1,                                          dropCount: 0,                              status: 'healthy' },
    { label: 'Visualizações de produto', count: viewSessions, rateFromPrev: ratio(viewSessions, totalSessions),      rateFromStart: ratio(viewSessions, totalSessions),         dropCount: Math.max(0, totalSessions - viewSessions), status: funnelStatus(ratio(viewSessions, totalSessions), 'product_view') },
    { label: 'Add to Cart',            count: atcSessions,    rateFromPrev: ratio(atcSessions, viewSessions),        rateFromStart: ratio(atcSessions, totalSessions),          dropCount: Math.max(0, viewSessions - atcSessions),   status: funnelStatus(ratio(atcSessions, viewSessions), 'atc') },
    { label: 'Checkout iniciado',      count: checkoutSessions, rateFromPrev: ratio(checkoutSessions, atcSessions),  rateFromStart: ratio(checkoutSessions, totalSessions),     dropCount: Math.max(0, atcSessions - checkoutSessions), status: funnelStatus(ratio(checkoutSessions, atcSessions), 'checkout') },
    { label: 'Pedido pago',            count: totalPaid,      rateFromPrev: ratio(totalPaid, checkoutSessions),      rateFromStart: ratio(totalPaid, totalSessions),            dropCount: Math.max(0, checkoutSessions - totalPaid), status: funnelStatus(ratio(totalPaid, checkoutSessions), 'paid') },
  ]

  // Biggest gap — em sessões únicas, não eventos crus (senão sessão com muita
  // navegação de produto distorce qual etapa realmente perde mais gente).
  let biggestGap = 'Volume insuficiente'
  if (totalSessions >= 10) {
    const gaps = [
      { label: 'Sessões → Produto',    drop: Math.max(0, totalSessions - viewSessions) },
      { label: 'Produto → Carrinho',   drop: Math.max(0, viewSessions - atcSessions) },
      { label: 'Carrinho → Checkout',  drop: Math.max(0, atcSessions - checkoutSessions) },
      { label: 'Checkout → Pedido',    drop: Math.max(0, checkoutSessions - totalPaid) },
    ]
    biggestGap = gaps.reduce((a, b) => b.drop > a.drop ? b : a).label
  }

  // ── Products ───────────────────────────────────────────────────────────────

  const viewsBySlug: Record<string, number> = {}
  for (const e of prodViews) {
    if (e.product_slug) viewsBySlug[e.product_slug] = (viewsBySlug[e.product_slug] ?? 0) + 1
  }
  const atcBySlug: Record<string, number> = {}
  for (const e of prodAtc) {
    if (e.product_slug) atcBySlug[e.product_slug] = (atcBySlug[e.product_slug] ?? 0) + 1
  }

  const storeAvgAtc = totalViews > 0 ? totalAtc / totalViews : 0

  const products: ProductDiagnostic[] = Object.entries(viewsBySlug)
    .map(([slug, views]) => {
      const atc = atcBySlug[slug] ?? 0
      const atcRate = ratio(atc, views)
      const { classification, alert } = classifyProduct(views, atc, atcRate, storeAvgAtc)
      return { slug, views, atc, atcRate, classification, alert }
    })
    .sort((a, b) => b.views - a.views)
    .slice(0, 20)

  // ── Traffic ────────────────────────────────────────────────────────────────

  const sessionsBySource: Record<string, number> = {}
  for (const s of sourceSessions) {
    const src = s.utm_source || 'Direto/Orgânico'
    sessionsBySource[src] = (sessionsBySource[src] ?? 0) + 1
  }
  const ordersBySource: Record<string, { count: number; revenue: number }> = {}
  for (const o of sourceOrders) {
    const src = o.utm_source || 'Direto/Orgânico'
    if (!ordersBySource[src]) ordersBySource[src] = { count: 0, revenue: 0 }
    ordersBySource[src].count++
    ordersBySource[src].revenue += parseFloat(String(o.total ?? 0))
  }

  const storeAvgConv = totalSessions > 0 ? totalPaid / totalSessions : 0

  const traffic: TrafficDiagnostic[] = Object.entries(sessionsBySource)
    .map(([source, sessions]) => {
      const ord = ordersBySource[source] ?? { count: 0, revenue: 0 }
      const convRate = ratio(ord.count, sessions)
      return {
        source, sessions,
        orders: ord.count,
        revenue: ord.revenue,
        conversionRate: convRate,
        revenuePerSession: sessions > 0 ? ord.revenue / sessions : 0,
        classification: classifyTraffic(sessions, ord.count, convRate, storeAvgConv),
      }
    })
    .sort((a, b) => b.sessions - a.sessions)
    .slice(0, 10)

  // ── Devices ────────────────────────────────────────────────────────────────

  const devSess: Record<string, number> = {}
  for (const s of devSessions) { const d = s.device || 'desconhecido'; devSess[d] = (devSess[d] ?? 0) + 1 }
  const devViewsBy: Record<string, number> = {}
  for (const e of devViews) { const d = e.device || 'desconhecido'; devViewsBy[d] = (devViewsBy[d] ?? 0) + 1 }
  const devAtcBy: Record<string, number> = {}
  for (const e of devAtc) { const d = e.device || 'desconhecido'; devAtcBy[d] = (devAtcBy[d] ?? 0) + 1 }

  const devices: DeviceDiagnostic[] = Object.entries(devSess)
    .map(([device, sessions]) => {
      const views = devViewsBy[device] ?? 0
      const atc   = devAtcBy[device]   ?? 0
      return { device, sessions, views, atc, atcRate: ratio(atc, views) }
    })
    .sort((a, b) => b.sessions - a.sessions)

  // ── Journeys ───────────────────────────────────────────────────────────────

  const recentSessions = recentSessionsRes.data ?? []
  let journeys: SessionJourney[] = []

  if (recentSessions.length > 0) {
    const ids = recentSessions.map((s) => s.id)
    const evRes = await db.from('events')
      .select('session_id, event_type, page, product_slug, created_at')
      .eq('store_id', STORE_ID)
      .in('session_id', ids)
      .order('created_at', { ascending: true })
      .limit(500)

    const evMap: Record<string, SessionEvent[]> = {}
    for (const e of evRes.data ?? []) {
      if (!e.session_id) continue
      if (!evMap[e.session_id]) evMap[e.session_id] = []
      evMap[e.session_id].push({ event_type: e.event_type, page: e.page ?? null, product_slug: e.product_slug ?? null, created_at: e.created_at })
    }

    journeys = recentSessions
      .map((s) => {
        const evs = evMap[s.id] ?? []
        return {
          sessionId: s.id.substring(0, 8) + '…',
          device: s.device ?? 'desconhecido',
          utmSource: s.utm_source ?? null,
          startedAt: s.started_at,
          events: evs.slice(-5),
          status: journeyStatus(evs.map((e) => e.event_type)),
        }
      })
      .filter((j) => j.events.length > 0)
      .slice(0, 20)
  }

  // ── Insights ───────────────────────────────────────────────────────────────

  const insights = generateInsights({ products, traffic, devices, totalSessions, viewSessions, atcSessions, checkoutSessions, totalPaid, storeAvgAtc, storeAvgConv })

  return {
    funnel,
    products,
    traffic,
    devices,
    journeys,
    insights,
    summary: {
      sessions: totalSessions,
      productViews: totalViews,
      atc: totalAtc,
      atcSessions,
      checkout: totalCheckout,
      paidOrders: totalPaid,
      revenue: totalRevenue,
      totalConversion: ratio(totalPaid, totalSessions),
      biggestGap,
      hasEnoughData: totalSessions >= 10,
    },
  }
}

// ── Quick stats (lightweight, for dashboard widget) ───────────────────────────

export interface BrainQuickStats {
  cartOpen: number
  atc: number
  checkout: number
  paid: number
  atcToCheckoutRate: number
  checkoutToPaidRate: number
  biggestGap: string
  topInsight: string | null
  topInsightAction: string | null
}

export async function getBrainQuickStats(db: SupabaseClient, range: DateRange): Promise<BrainQuickStats> {
  const [cartOpenRows, atcRows, checkoutRows, paidRes] = await Promise.all([
    fetchAllRows<{ session_id: string | null }>((from, to) =>
      db.from('events').select('session_id')
        .eq('store_id', STORE_ID).eq('event_type', 'cart_open')
        .gte('created_at', range.startISO).lt('created_at', range.endISO).range(from, to)),
    fetchAllRows<{ session_id: string | null }>((from, to) =>
      db.from('events').select('session_id')
        .eq('store_id', STORE_ID).eq('event_type', 'add_to_cart')
        .gte('created_at', range.startISO).lt('created_at', range.endISO).range(from, to)),
    fetchAllRows<{ session_id: string | null }>((from, to) =>
      db.from('events').select('session_id')
        .eq('store_id', STORE_ID).eq('event_type', 'initiate_checkout')
        .gte('created_at', range.startISO).lt('created_at', range.endISO).range(from, to)),
    db.from('orders').select('*', { count: 'exact', head: true })
      .eq('store_id', STORE_ID).in('status', PAID_STATUSES)
      .gte('created_at', range.startISO).lt('created_at', range.endISO),
  ])

  // Sessões únicas, não evento cru — o "Compre 1 Leve 2" faz um cliente gerar ~2
  // add_to_cart (um por produto escolhido) numa única sessão/carrinho, o que
  // achatava essa taxa artificialmente quando dividida por evento.
  const cartOpen = new Set(cartOpenRows.map(r => r.session_id)).size
  const atc      = new Set(atcRows.map(r => r.session_id)).size
  const checkout = new Set(checkoutRows.map(r => r.session_id)).size
  const paid     = paidRes.count ?? 0

  const atcToCheckoutRate  = ratio(checkout, atc)
  const checkoutToPaidRate = ratio(paid, checkout)

  let biggestGap       = 'Volume insuficiente'
  let topInsight: string | null       = null
  let topInsightAction: string | null = null

  if (atc >= 5) {
    if (atcToCheckoutRate < 0.30) {
      biggestGap       = 'Carrinho → Checkout'
      topInsight       = `Só ${Math.round(atcToCheckoutRate * 100)}% dos carrinhos avançam para checkout (${checkout}/${atc})`
      topInsightAction = 'Revisar CTA, confiança e urgência no carrinho'
    } else if (checkoutToPaidRate < 0.35 && checkout >= 5) {
      biggestGap       = 'Checkout → Pedido pago'
      topInsight       = `Só ${Math.round(checkoutToPaidRate * 100)}% dos checkouts resultam em pedido pago`
      topInsightAction = 'Verificar opções de pagamento e experiência Yampi'
    } else {
      biggestGap = 'Funil saudável'
    }
  }

  return { cartOpen, atc, checkout, paid, atcToCheckoutRate, checkoutToPaidRate, biggestGap, topInsight, topInsightAction }
}

// ── Product brain badges (lightweight, for product list) ──────────────────────

export interface ProductBrainBadge {
  label: string
  color: string
  bg:    string
}

export async function getProductBrainBadges(db: SupabaseClient, range: DateRange): Promise<Record<string, ProductBrainBadge>> {
  const [views_, atcs_] = await Promise.all([
    fetchAllRows<{ product_slug: string | null }>((from, to) =>
      db.from('events').select('product_slug')
        .eq('store_id', STORE_ID).eq('event_type', 'view_content')
        .not('product_slug', 'is', null)
        .gte('created_at', range.startISO).lt('created_at', range.endISO).range(from, to)),
    fetchAllRows<{ product_slug: string | null }>((from, to) =>
      db.from('events').select('product_slug')
        .eq('store_id', STORE_ID).eq('event_type', 'add_to_cart')
        .not('product_slug', 'is', null)
        .gte('created_at', range.startISO).lt('created_at', range.endISO).range(from, to)),
  ])

  const views: Record<string, number> = {}
  for (const e of views_) {
    if (e.product_slug) views[e.product_slug] = (views[e.product_slug] ?? 0) + 1
  }
  const atcs: Record<string, number> = {}
  for (const e of atcs_) {
    if (e.product_slug) atcs[e.product_slug] = (atcs[e.product_slug] ?? 0) + 1
  }

  const totalViews = Object.values(views).reduce((s, v) => s + v, 0)
  const totalAtcs  = Object.values(atcs).reduce((s, v) => s + v, 0)
  const storeAvgAtc = totalViews > 0 ? totalAtcs / totalViews : 0

  const result: Record<string, ProductBrainBadge> = {}
  const allSlugs = new Set([...Object.keys(views), ...Object.keys(atcs)])

  for (const slug of allSlugs) {
    const v       = views[slug] ?? 0
    const a       = atcs[slug]  ?? 0
    const atcRate = ratio(a, v)

    if (v < 10) {
      result[slug] = { label: 'Sem dados',        color: '#94a3b8', bg: 'rgba(148,163,184,0.1)' }
    } else if (a === 0) {
      result[slug] = { label: 'Sem carrinho',      color: '#dc2626', bg: 'rgba(220,38,38,0.08)'  }
    } else if (storeAvgAtc > 0 && atcRate >= storeAvgAtc * 2.0 && v >= 60) {
      result[slug] = { label: 'Campeão',           color: '#16a34a', bg: 'rgba(22,163,74,0.1)'   }
    } else if (storeAvgAtc > 0 && atcRate >= storeAvgAtc * 1.5) {
      result[slug] = { label: 'Alta intenção',     color: '#0284c7', bg: 'rgba(2,132,199,0.1)'   }
    } else if (v >= 30 && storeAvgAtc > 0 && atcRate < storeAvgAtc * 0.4) {
      result[slug] = { label: 'Baixo ATC',         color: '#d97706', bg: 'rgba(217,119,6,0.1)'   }
    } else {
      result[slug] = { label: 'Normal',            color: '#64748b', bg: 'rgba(100,116,139,0.08)' }
    }
  }

  return result
}

// ── Insight engine (pure) ─────────────────────────────────────────────────────

interface InsightInputs {
  products: ProductDiagnostic[]
  traffic: TrafficDiagnostic[]
  devices: DeviceDiagnostic[]
  totalSessions: number
  viewSessions: number
  atcSessions: number
  checkoutSessions: number
  totalPaid: number
  storeAvgAtc: number
  storeAvgConv: number
}

function generateInsights(d: InsightInputs): BrainInsight[] {
  const list: BrainInsight[] = []
  const { products, traffic, devices, totalSessions, viewSessions, atcSessions, checkoutSessions, totalPaid, storeAvgAtc } = d

  if (totalSessions < 10) return list

  // Taxas por sessão única (não evento cru) — uma sessão pode gerar dezenas de
  // view_content (comparando produtos, ou bot/crawler), o que achatava a taxa
  // artificialmente quando dividida por contagem bruta de evento.
  const atcRate      = ratio(atcSessions, viewSessions)
  const checkoutRate = ratio(checkoutSessions, atcSessions)
  const paidRate     = ratio(totalPaid, checkoutSessions)

  // Funnel gargalos
  if (atcRate < 0.04 && viewSessions >= 30) {
    list.push({
      type: 'high',
      title: `Baixa taxa de add to cart — ${(atcRate * 100).toFixed(1)}%`,
      evidence: `${viewSessions} sessões viram produto, apenas ${atcSessions} adicionaram ao carrinho.`,
      action: 'Revisar primeira dobra mobile dos produtos mais vistos: imagem principal, botão de compra, oferta e clareza do preço.',
    })
  }

  if (checkoutRate < 0.30 && atcSessions >= 10) {
    list.push({
      type: 'high',
      title: `Alto abandono no carrinho — só ${(checkoutRate * 100).toFixed(1)}% avança`,
      evidence: `${atcSessions} sessões adicionaram ao carrinho, mas ${checkoutSessions} chegaram ao checkout.`,
      action: 'Revisar o carrinho: oferta Compre 1 Leve 2, frete, urgência no CTA e confiança.',
    })
  }

  if (paidRate < 0.25 && checkoutSessions >= 5) {
    list.push({
      type: 'critical',
      title: `Abandono no checkout Yampi — ${(paidRate * 100).toFixed(1)}% paga`,
      evidence: `${checkoutSessions} sessões iniciaram checkout, apenas ${totalPaid} pedidos pagos.`,
      action: 'Verificar experiência Yampi, métodos de pagamento, frete exibido e clareza da oferta.',
    })
  }

  // Produtos: muito tráfego, pouco carrinho
  const highViewsLowAtc = products.filter((p) => p.views >= 40 && p.atc === 0)
  for (const p of highViewsLowAtc.slice(0, 2)) {
    list.push({
      type: 'high',
      title: `${p.slug}: ${p.views} views, zero carrinho`,
      evidence: 'Produto com tráfego relevante mas sem nenhuma adição ao carrinho no período.',
      action: 'Verificar imagem, preço, variações disponíveis e botão na página do produto.',
    })
  }

  // Produtos: ATC muito abaixo da média
  if (storeAvgAtc > 0) {
    const lowAtc = products.filter((p) => p.views >= 50 && p.atc > 0 && p.atcRate < storeAvgAtc * 0.45)
    for (const p of lowAtc.slice(0, 2)) {
      list.push({
        type: 'medium',
        title: `${p.slug}: tráfego alto, intenção baixa`,
        evidence: `${p.views} views, ATC ${(p.atcRate * 100).toFixed(1)}% (média loja: ${(storeAvgAtc * 100).toFixed(1)}%).`,
        action: 'Revisar oferta, posicionamento e primeira dobra mobile deste produto.',
      })
    }
  }

  // Mobile vs desktop
  const mobile  = devices.find((d) => d.device === 'mobile')
  const desktop = devices.find((d) => d.device === 'desktop')
  if (mobile && desktop && mobile.sessions >= 30 && desktop.sessions >= 10 && desktop.atcRate > 0) {
    if (mobile.atcRate < desktop.atcRate * 0.6) {
      const pct = Math.round(ratio(mobile.sessions, mobile.sessions + desktop.sessions) * 100)
      list.push({
        type: 'high',
        title: `Mobile converte menos que desktop`,
        evidence: `Mobile: ${(mobile.atcRate * 100).toFixed(1)}% ATC vs desktop: ${(desktop.atcRate * 100).toFixed(1)}%. Mobile = ${pct}% do tráfego.`,
        action: 'Priorizar mobile: tamanho do botão, imagem principal, velocidade e clareza da oferta.',
      })
    }
  }

  // Origem sem conversão
  const zeroConvSrc = traffic.filter((t) => t.sessions >= 50 && t.orders === 0)
  for (const s of zeroConvSrc.slice(0, 2)) {
    list.push({
      type: 'medium',
      title: `${s.source}: ${s.sessions} sessões, zero compras`,
      evidence: 'Origem com volume relevante mas nenhuma conversão no período.',
      action: `Revisar landing page, qualidade do público e oferta para visitantes de ${s.source}.`,
    })
  }

  // Oportunidades de escala
  if (storeAvgAtc > 0) {
    const scaling = products.filter((p) => p.views >= 15 && p.views < 80 && p.atcRate > storeAvgAtc * 1.5)
    for (const p of scaling.slice(0, 2)) {
      list.push({
        type: 'opportunity',
        title: `${p.slug}: alta conversão, pouco alcance`,
        evidence: `${p.views} views, ATC ${(p.atcRate * 100).toFixed(1)}% — acima da média. Candidato a escala.`,
        action: 'Destacar na home ou aumentar tráfego via campanhas pagas.',
      })
    }
  }

  return list
}
