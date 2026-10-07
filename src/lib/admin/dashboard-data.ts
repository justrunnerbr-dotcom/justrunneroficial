import { unstable_cache } from 'next/cache'
import { getAdminSupabase } from '@/lib/admin-client'
import type { DateRange } from '@/lib/admin/date-range'
import {
  APPROVED_STATUSES, getFinancialBreakdown, loadOrderEconomics, yampiMonthlyFor,
  type FinancialBreakdown, type OrderEconomics,
} from '@/lib/admin/financial-breakdown'
import { computeLogisticsCost, computeMediaTax, computeSalesTax, type CostSettings } from '@/lib/admin/cost-settings'
import { fetchAllRows, chunkIds } from '@/lib/admin/supabase-pagination'
import { detectarAlertas, type Alerta } from '@/lib/admin/alertas'

const STORE_ID = 'b0000000-0000-0000-0000-000000000001'
const DAY_MS = 86_400_000
const BRT_OFFSET_MS = 3 * 60 * 60 * 1000
/** Acima disto o funil por sessão não é calculado: são 1–2 s de banco por dia
 *  na primeira abertura, e o Supabase já caiu por saturação uma vez. */
const FUNNEL_MAX_DAYS = 62

export type CompareMode = 'anterior' | 'm7' | 'm14'

// ── datas (Brasil é UTC−3 fixo desde 2019) ───────────────────────────────────

function addDays(date: string, n: number): string {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10)
}
function dayStartISO(date: string): string { return `${date}T00:00:00-03:00` }
function todayBRT(): string { return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }) }
function dateOfISO(iso: string): string { return new Date(new Date(iso).getTime() - BRT_OFFSET_MS).toISOString().slice(0, 10) }
/** Minutos desde a meia-noite de São Paulo. */
function minuteOfISO(iso: string): number {
  const t = new Date(new Date(iso).getTime() - BRT_OFFSET_MS)
  return t.getUTCHours() * 60 + t.getUTCMinutes()
}
function daysBetween(start: string, endExclusive: string): string[] {
  const out: string[] = []
  for (let d = start; d < endExclusive; d = addDays(d, 1)) out.push(d)
  return out
}
function fmtDay(date: string): string { return `${date.slice(8, 10)}/${date.slice(5, 7)}` }
function fmtHM(min: number): string { return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}` }

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length)
  let next = 0
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++
      out[i] = await fn(items[i])
    }
  }))
  return out
}

// ── funil por sessão, dia a dia ──────────────────────────────────────────────

interface DayFunnel { sessions: number; productSessions: number; cartSessions: number; checkoutSessions: number }

async function fetchDayFunnel(date: string, endISO: string): Promise<DayFunnel> {
  try {
    return await fetchDayFunnelOnce(date, endISO)
  } catch {
    // Dia de muito tráfego às vezes passa do limite de tempo do banco na
    // primeira tentativa e responde na segunda, já com o cache do Postgres quente.
    return fetchDayFunnelOnce(date, endISO)
  }
}

async function fetchDayFunnelOnce(date: string, endISO: string): Promise<DayFunnel> {
  const db = getAdminSupabase()
  const startISO = dayStartISO(date)
  const [rpc, sess] = await Promise.all([
    db.rpc('analise_suprema_funnel_sessions', { p_store_id: STORE_ID, p_inicio: startISO, p_fim: endISO }),
    db.from('sessions').select('id', { count: 'exact', head: true })
      .eq('store_id', STORE_ID).gte('started_at', startISO).lt('started_at', endISO),
  ])
  // Lança em vez de devolver zero: erro não pode ir para o cache nem virar
  // "nenhuma sessão" na tela.
  if (rpc.error) throw new Error(`funil ${date}: ${rpc.error.message}`)
  if (sess.error || sess.count === null) throw new Error(`sessões ${date}: ${sess.error?.message ?? 'sem contagem'}`)
  const row = (Array.isArray(rpc.data) ? rpc.data[0] : rpc.data) as Record<string, number> | null
  return {
    sessions:         sess.count,
    productSessions:  Number(row?.product_views) || 0,
    cartSessions:     Number(row?.add_to_carts) || 0,
    checkoutSessions: Number(row?.checkout_starts) || 0,
  }
}

// Dia fechado não muda mais: guarda por 7 dias. A primeira abertura de um
// período longo paga a consulta; as seguintes saem do cache.
const cachedClosedDayFunnel = unstable_cache(
  async (date: string) => fetchDayFunnel(date, dayStartISO(addDays(date, 1))),
  ['dash-funnel-day-v1'],
  { revalidate: 7 * 24 * 60 * 60 },
)

/** `cutoffMin` corta cada dia no mesmo horário (comparação "até esta hora"). */
async function funnelForDays(dates: string[], cutoffMin: number | null): Promise<{ data: DayFunnel | null; reason: string | null }> {
  if (dates.length > FUNNEL_MAX_DAYS) {
    return { data: null, reason: `período acima de ${FUNNEL_MAX_DAYS} dias — o funil por sessão fica indisponível` }
  }
  const today = todayBRT()
  try {
    const days = await mapLimit(dates, 2, date => {
      if (cutoffMin !== null) {
        return fetchDayFunnel(date, new Date(new Date(dayStartISO(date)).getTime() + cutoffMin * 60_000).toISOString())
      }
      if (date >= today) return fetchDayFunnel(date, dayStartISO(addDays(date, 1)))
      return cachedClosedDayFunnel(date)
    })
    return {
      data: days.reduce<DayFunnel>((acc, d) => ({
        sessions:         acc.sessions + d.sessions,
        productSessions:  acc.productSessions + d.productSessions,
        cartSessions:     acc.cartSessions + d.cartSessions,
        checkoutSessions: acc.checkoutSessions + d.checkoutSessions,
      }), { sessions: 0, productSessions: 0, cartSessions: 0, checkoutSessions: 0 }),
      reason: null,
    }
  } catch (err) {
    console.error('[dashboard] funil por sessão falhou:', err)
    return { data: null, reason: `a consulta do tracking falhou (${err instanceof Error ? err.message : 'erro'})` }
  }
}

// ── recorrência ──────────────────────────────────────────────────────────────

/** Para cada cliente, a data do primeiro pedido pago conhecido. */
async function firstPaidByCustomer(customerIds: string[]): Promise<Map<string, string>> {
  const db = getAdminSupabase()
  const first = new Map<string, string>()
  const results = await mapLimit(chunkIds(customerIds), 3, lote =>
    fetchAllRows<{ customer_id: string; created_at: string }>((from, to) =>
      db.from('orders').select('customer_id, created_at')
        .eq('store_id', STORE_ID).in('status', APPROVED_STATUSES).in('customer_id', lote)
        .order('created_at').range(from, to)))
  for (const rows of results) {
    for (const r of rows) {
      const cur = first.get(r.customer_id)
      if (!cur || r.created_at < cur) first.set(r.customer_id, r.created_at)
    }
  }
  return first
}

// ── totais de um recorte ─────────────────────────────────────────────────────

export interface Totals {
  revenue:          number
  paid:             number
  profit:           number | null
  media:            number | null
  meta:             number | null
  google:           number | null
  mediaTax:         number | null
  sessions:         number | null
  productSessions:  number | null
  cartSessions:     number | null
  checkoutSessions: number | null
  purchaseSessions: number
  noSessionPaid:    number
  recurring:        number
  withCustomer:     number
  costOk:           number
  yampiPaid:        number
  attributed:       number
}

export interface Derived {
  ticket:   number | null
  margin:   number | null
  conv:     number | null
  mer:      number | null
  roi:      number | null
  cpa:      number | null
  recShare: number | null
  costCov:  number | null
  attrCov:  number | null
}

const div = (a: number | null, b: number | null): number | null =>
  a === null || b === null || b === 0 ? null : a / b

/** Investimento em mídia com o tributo de 13,8% sobre o Meta (o Google não tem). */
export function mediaEfetiva(t: Pick<Totals, 'media' | 'mediaTax'>): number | null {
  return t.media === null ? null : t.media + (t.mediaTax ?? 0)
}

export function derive(t: Totals): Derived {
  return {
    ticket:   div(t.revenue, t.paid),
    margin:   div(t.profit, t.revenue),
    conv:     div(t.purchaseSessions, t.sessions),
    // MER, ROI e custo por pedido usam o investimento EFETIVO em mídia: Meta + o
    // tributo de 13,8% sobre o Meta + Google. É o que a empresa de fato paga, e o
    // lucro já desconta o mesmo valor — assim os quatro números ficam na mesma régua.
    mer:      div(t.revenue, mediaEfetiva(t)),
    roi:      div(t.profit, mediaEfetiva(t)),
    cpa:      div(mediaEfetiva(t), t.paid),
    recShare: div(t.recurring, t.withCustomer),
    costCov:  div(t.costOk, t.paid),
    attrCov:  div(t.attributed, t.yampiPaid),
  }
}

function orderTotals(orders: OrderEconomics[], firstPaid: Map<string, string>) {
  const sessions = new Set<string>()
  let revenue = 0, noSessionPaid = 0, recurring = 0, withCustomer = 0, costOk = 0, yampiPaid = 0, attributed = 0
  for (const o of orders) {
    revenue += o.revenue
    if (!o.missingCost) costOk++
    if (o.sessionId && !o.manual) sessions.add(o.sessionId)
    else noSessionPaid++
    if (!o.manual) {
      yampiPaid++
      if (o.hasOrigin) attributed++
    }
    if (o.customerId) {
      withCustomer++
      const first = firstPaid.get(o.customerId)
      if (first && first < o.createdAt) recurring++
    }
  }
  return { revenue, paid: orders.length, purchaseSessions: sessions.size, noSessionPaid, recurring, withCustomer, costOk, yampiPaid, attributed }
}

function scale(t: Totals, n: number): Totals {
  if (n === 1) return t
  const s = (v: number | null) => (v === null ? null : v / n)
  return {
    revenue: t.revenue / n, paid: t.paid / n, profit: s(t.profit), media: s(t.media), meta: s(t.meta),
    google: s(t.google), mediaTax: s(t.mediaTax), sessions: s(t.sessions), productSessions: s(t.productSessions),
    cartSessions: s(t.cartSessions), checkoutSessions: s(t.checkoutSessions), purchaseSessions: t.purchaseSessions / n,
    noSessionPaid: t.noSessionPaid / n, recurring: t.recurring / n, withCustomer: t.withCustomer / n,
    costOk: t.costOk / n, yampiPaid: t.yampiPaid / n, attributed: t.attributed / n,
  }
}

// ── séries da evolução ───────────────────────────────────────────────────────

export interface SeriesPoint { label: string; revenue: number | null; paid: number | null; profit: number | null; media: number | null }

async function dailyMediaMap(start: string, endExclusive: string): Promise<Map<string, { meta: number | null; google: number }>> {
  const db = getAdminSupabase()
  const rows = await fetchAllRows<{ date: string; platform: string; amount: number | string | null }>((from, to) =>
    db.from('daily_marketing_costs').select('date, platform, amount')
      .gte('date', start).lt('date', endExclusive).range(from, to))
  const map = new Map<string, { meta: number | null; google: number }>()
  for (const r of rows) {
    const e = map.get(r.date) ?? { meta: null, google: 0 }
    const v = parseFloat(String(r.amount ?? 0)) || 0
    if (r.platform === 'meta') e.meta = (e.meta ?? 0) + v
    if (r.platform === 'google') e.google += v
    map.set(r.date, e)
  }
  return map
}

function dailySeries(dates: string[], orders: OrderEconomics[], media: Map<string, { meta: number | null; google: number }>, settings: CostSettings): SeriesPoint[] {
  const byDay = new Map<string, OrderEconomics[]>()
  for (const o of orders) {
    const d = dateOfISO(o.createdAt)
    const list = byDay.get(d)
    if (list) list.push(o)
    else byDay.set(d, [o])
  }
  return dates.map(date => {
    const list = byDay.get(date) ?? []
    const revenue = list.reduce((s, o) => s + o.revenue, 0)
    const m = media.get(date)
    const meta = m?.meta ?? null
    let profit: number | null = null
    if (meta !== null) {
      const variable = list.reduce((s, o) => s + o.revenue - o.productCost - o.freightCost - o.gatewayFee - o.yampiFee, 0)
      profit = variable
        - computeLogisticsCost(list.length, settings)
        - yampiMonthlyFor(dayStartISO(date), dayStartISO(addDays(date, 1)))
        - (computeSalesTax(revenue, settings) ?? 0)
        - meta - computeMediaTax(meta) - (m?.google ?? 0)
    }
    return { label: fmtDay(date), revenue, paid: list.length, profit, media: meta === null ? null : meta + (m?.google ?? 0) }
  })
}

/** Acumulado por hora — para períodos de um dia só. `days` divide para média. */
function hourlyCumulative(orders: OrderEconomics[], days: number, cutoffMin: number | null): SeriesPoint[] {
  const rev = new Array(24).fill(0), paid = new Array(24).fill(0)
  for (const o of orders) {
    const h = Math.floor(minuteOfISO(o.createdAt) / 60)
    rev[h] += o.revenue
    paid[h] += 1
  }
  const out: SeriesPoint[] = []
  let r = 0, p = 0
  for (let h = 0; h < 24; h++) {
    r += rev[h]; p += paid[h]
    const future = cutoffMin !== null && h * 60 > cutoffMin
    out.push({ label: `${String(h).padStart(2, '0')}h`, revenue: future ? null : r / days, paid: future ? null : p / days, profit: null, media: null })
  }
  return out
}

// ── ranking de produtos ──────────────────────────────────────────────────────

export interface ProductRankRow {
  key:     string
  name:    string
  slug:    string | null
  units:   number
  orders:  number
  revenue: number
  views:   number | null
  carts:   number | null
  conv:    number | null
}

interface CatalogProduct { slug: string; name: string }
interface CatalogIndex { bySku: Record<string, CatalogProduct>; byName: Record<string, CatalogProduct>; bySlug: Record<string, CatalogProduct> }

// A Yampi e o site gravam SKUs diferentes para a mesma variação —
// `JHFSO-FATCAT-BRANCALENTEPRETA` no pedido, `JHF-FATCAT_BRANCA_LENTE_PRETA` no
// catálogo. Normalizando (versão + letras e números, sem o "175" da versão
// R$ 175) os dois viram a mesma chave.
function skuKey(sku: string): string | null {
  const s = sku.toUpperCase()
  // Just Runner: JR- = Compre 1 Leve 2, JROP- = unidade R$ 175. Combo (JRC-) fica de fora.
  const fam = s.startsWith('JHFOP') || s.startsWith('JROP') ? 'OP'
    : s.startsWith('JHFSO') || s.startsWith('JHF-') || s.startsWith('JHF_') || s.startsWith('JR-') || s.startsWith('JR_') ? 'SO' : null
  if (!fam) return null
  return `${fam}|${s.replace(/^(JHF(OP|SO)?|JROP|JR)[-_]?/, '').replace(/175/g, '').replace(/[^A-Z0-9]/g, '')}`
}
function nameKey(fam: 'SO' | 'OP', name: string): string {
  return `${fam}|${name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim()}`
}
// Gêmeo R$ 175: sufixo -175 na JHF, -op na Just Runner.
const isOpSlug = (slug: string) => slug.endsWith('-175') || slug.endsWith('-op')
const famOfSlug = (slug: string): 'SO' | 'OP' => (isOpSlug(slug) ? 'OP' : 'SO')

const catalogIndex = unstable_cache(
  async (): Promise<CatalogIndex> => {
    const db = getAdminSupabase()
    const [products, variants] = await Promise.all([
      fetchAllRows<{ id: string; slug: string; name: string }>((from, to) =>
        db.from('products').select('id, slug, name').order('id').range(from, to)),
      fetchAllRows<{ sku: string | null; product_id: string }>((from, to) =>
        db.from('variants').select('sku, product_id').not('sku', 'is', null).order('id').range(from, to)),
    ])
    const byId = new Map(products.map(p => [p.id, { slug: p.slug, name: p.name }]))
    const idx: CatalogIndex = { bySku: {}, byName: {}, bySlug: {} }
    for (const p of products) {
      idx.bySlug[p.slug] = { slug: p.slug, name: p.name }
      idx.byName[nameKey(famOfSlug(p.slug), p.name)] ??= { slug: p.slug, name: p.name }
    }
    for (const v of variants) {
      const p = byId.get(v.product_id)
      const k = v.sku ? skuKey(v.sku) : null
      if (p && k) idx.bySku[k] = p
    }
    return idx
  },
  ['dash-catalog-index-v2'],
  { revalidate: 60 * 60 },
)

function titleParts(title: string): { fam: 'SO' | 'OP' | null; name: string } {
  const m = title.match(/^\[(SO|OP|JR OP|JR)\]\s*/)
  const name = title.replace(/^\[[^\]]*\]\s*/, '').split(/\s{2,}/)[0].trim() || title
  const fam = m ? (m[1] === 'JR' ? 'SO' : m[1] === 'JR OP' ? 'OP' : m[1] as 'SO' | 'OP') : null
  return { fam, name }
}

function matchProduct(idx: CatalogIndex, sku: string | null, title: string): CatalogProduct | undefined {
  const k = sku ? skuKey(sku) : null
  if (k && idx.bySku[k]) return idx.bySku[k]
  const t = titleParts(title)
  return t.fam ? idx.byName[nameKey(t.fam, t.name)] : undefined
}

async function productRanking(range: DateRange, orders: OrderEconomics[]): Promise<{ rows: ProductRankRow[]; unmatchedUnits: number }> {
  const db = getAdminSupabase()
  const [idx, stats] = await Promise.all([
    catalogIndex(),
    fetchAllRows<{ product_slug: string; views: number; add_to_carts: number }>((from, to) =>
      db.from('product_daily_stats').select('product_slug, views, add_to_carts')
        .eq('store_id', STORE_ID).gte('date', range.start).lt('date', range.endExclusive).range(from, to)),
  ])

  const views = new Map<string, { views: number; carts: number }>()
  for (const s of stats) {
    const e = views.get(s.product_slug) ?? { views: 0, carts: 0 }
    e.views += s.views; e.carts += s.add_to_carts
    views.set(s.product_slug, e)
  }

  const rows = new Map<string, ProductRankRow & { orderIds: Set<string> }>()
  let unmatchedUnits = 0
  for (const o of orders) {
    for (const it of o.items) {
      const p = matchProduct(idx, it.sku, it.productTitle)
      if (!p) unmatchedUnits += it.quantity
      const key = p ? p.slug : `t:${titleParts(it.productTitle).name}`
      const name = p ? `${p.name}${isOpSlug(p.slug) ? ' · R$ 175' : ''}` : titleParts(it.productTitle).name
      const row = rows.get(key) ?? { key, name, slug: p?.slug ?? null, units: 0, orders: 0, revenue: 0, views: null, carts: null, conv: null, orderIds: new Set<string>() }
      row.units += it.quantity
      row.revenue += it.total
      row.orderIds.add(o.id)
      rows.set(key, row)
    }
  }
  // Produto visto e não vendido também entra — é o "muita procura, pouca venda".
  for (const [slug, v] of views) {
    if (!rows.has(slug) && v.views > 0) {
      const name = idx.bySlug[slug]?.name ?? slug
      rows.set(slug, { key: slug, name: `${name}${isOpSlug(slug) ? ' · R$ 175' : ''}`, slug, units: 0, orders: 0, revenue: 0, views: null, carts: null, conv: null, orderIds: new Set() })
    }
  }

  return {
    rows: [...rows.values()].map(({ orderIds, ...r }) => {
      const v = r.slug ? views.get(r.slug) : undefined
      const orders = orderIds.size
      return { ...r, orders, views: v?.views ?? (r.slug ? 0 : null), carts: v?.carts ?? (r.slug ? 0 : null), conv: v && v.views > 0 ? orders / v.views : null }
    }),
    unmatchedUnits,
  }
}

// ── estados ──────────────────────────────────────────────────────────────────

export interface StateRow { uf: string; revenue: number; paid: number; ticket: number }

function statesOf(orders: OrderEconomics[]): StateRow[] {
  const m = new Map<string, { revenue: number; paid: number }>()
  for (const o of orders) {
    if (o.manual) continue
    const uf = o.state?.trim().toUpperCase() || 'Não informado'
    const e = m.get(uf) ?? { revenue: 0, paid: 0 }
    e.revenue += o.revenue; e.paid++
    m.set(uf, e)
  }
  return [...m.entries()].map(([uf, e]) => ({ uf, ...e, ticket: e.revenue / e.paid })).sort((a, b) => b.revenue - a.revenue)
}

// ── atualização das fontes ───────────────────────────────────────────────────

export interface Freshness { lastOrder: string | null; lastSession: string | null; lastMediaSync: string | null }

async function freshness(): Promise<Freshness> {
  const db = getAdminSupabase()
  const [o, s, m] = await Promise.all([
    db.from('orders').select('updated_at').eq('store_id', STORE_ID).order('updated_at', { ascending: false }).limit(1).maybeSingle(),
    db.from('sessions').select('started_at').eq('store_id', STORE_ID).order('started_at', { ascending: false }).limit(1).maybeSingle(),
    db.from('daily_marketing_costs').select('updated_at').order('updated_at', { ascending: false }).limit(1).maybeSingle(),
  ])
  return { lastOrder: o.data?.updated_at ?? null, lastSession: s.data?.started_at ?? null, lastMediaSync: m.data?.updated_at ?? null }
}

// ── montagem ─────────────────────────────────────────────────────────────────

export interface DashboardData {
  cur:            Totals
  base:            Totals
  curD:           Derived
  baseD:    Derived
  curLabel:       string
  refLabel:       string
  /** Explica o que a comparação não cobre (ex.: mídia de hoje por hora). */
  compareNote:    string | null
  compare:        CompareMode
  singleDay:      boolean
  financials:     FinancialBreakdown
  partialMedia:   string[]
  partialProfit:  string[]
  funnelReason:   string | null
  pendingNow:     number | null
  pendingInPeriod: number
  series:         { cur: SeriesPoint[]; base: SeriesPoint[]; hourly: boolean }
  products:       ProductRankRow[]
  unmatchedUnits: number
  states:         StateRow[]
  alerts:         Alerta[] | null
  freshness:      Freshness
}

function withFinancials(base: ReturnType<typeof orderTotals>, f: FinancialBreakdown | null, funnel: DayFunnel | null): Totals {
  return {
    ...base,
    profit:   f ? f.netProfit : null,
    media:    f ? f.metaSpend + f.googleAdsSpend : null,
    meta:     f ? f.metaSpend : null,
    google:   f ? f.googleAdsSpend : null,
    mediaTax: f ? f.mediaTax : null,
    sessions:         funnel?.sessions ?? null,
    productSessions:  funnel?.productSessions ?? null,
    cartSessions:     funnel?.cartSessions ?? null,
    checkoutSessions: funnel?.checkoutSessions ?? null,
  }
}

export async function getDashboardData(range: DateRange, compareParam: string | undefined): Promise<DashboardData> {
  const db = getAdminSupabase()
  const today = todayBRT()
  const curDates = daysBetween(range.start, range.endExclusive)
  const singleDay = curDates.length === 1
  const compare: CompareMode = singleDay && (compareParam === 'm7' || compareParam === 'm14') ? compareParam : 'anterior'
  const includesToday = range.endExclusive > today
  const nowMin = minuteOfISO(new Date().toISOString())

  // Referência: datas, divisor da média e corte de horário.
  const refDays = compare === 'm7' ? 7 : compare === 'm14' ? 14 : curDates.length
  const refStart = addDays(range.start, -refDays)
  const refRange: DateRange = {
    start: refStart, endExclusive: range.start,
    startISO: dayStartISO(refStart), endISO: dayStartISO(range.start),
    label: '', preset: 'custom',
  }
  const refDates = daysBetween(refStart, range.start)
  // Hoje é comparado até o mesmo horário. Mídia e lucro não têm leitura por
  // hora, então nesse caso ficam sem comparação em vez de contra o dia cheio.
  const cutoff = singleDay && includesToday ? nowMin : null

  const curLabel = singleDay
    ? (includesToday ? `Hoje até ${fmtHM(nowMin)}` : fmtDay(range.start))
    : `${fmtDay(range.start)} a ${fmtDay(addDays(range.endExclusive, -1))}${includesToday ? ` (hoje até ${fmtHM(nowMin)})` : ''}`
  const refLabel = compare === 'm7' ? 'média dos 7 dias anteriores' : compare === 'm14' ? 'média dos 14 dias anteriores'
    : singleDay ? (includesToday ? `ontem até ${fmtHM(nowMin)}` : `dia anterior (${fmtDay(refStart)})`)
    : `${fmtDay(refStart)} a ${fmtDay(addDays(range.start, -1))}`
  let compareNote: string | null = null
  if (cutoff !== null) compareNote = 'Mídia, lucro e indicadores derivados não têm leitura por hora — ficam sem comparação hoje.'
  else if (!singleDay && includesToday) compareNote = `O período inclui hoje até ${fmtHM(nowMin)}; o período de comparação tem todos os dias completos.`

  const [curEcon, refEcon] = await Promise.all([loadOrderEconomics(range), loadOrderEconomics(refRange)])
  const refOrders = cutoff === null ? refEcon.orders : refEcon.orders.filter(o => minuteOfISO(o.createdAt) <= cutoff)

  const customers = [...new Set([...curEcon.orders, ...refOrders].map(o => o.customerId).filter((c): c is string => !!c))]

  const [
    financials, refFinancials, curFunnel, refFunnel, firstPaid, pendingNowRes,
    mediaMap, products, alerts, fresh,
  ] = await Promise.all([
    getFinancialBreakdown(range, curEcon),
    cutoff === null ? getFinancialBreakdown(refRange, refEcon) : Promise.resolve(null),
    funnelForDays(curDates, null),
    funnelForDays(refDates, cutoff),
    firstPaidByCustomer(customers),
    db.from('orders').select('id', { count: 'exact', head: true })
      .eq('store_id', STORE_ID).eq('status', 'pending')
      .gte('created_at', new Date(Date.now() - 7 * DAY_MS).toISOString()),
    singleDay ? Promise.resolve(new Map()) : dailyMediaMap(refStart, range.endExclusive),
    productRanking(range, curEcon.orders),
    detectarAlertas().catch(err => { console.error('[dashboard] alertas falharam:', err); return null }),
    freshness(),
  ])

  const cur = withFinancials(orderTotals(curEcon.orders, firstPaid), financials, curFunnel.data)
  const refRaw = withFinancials(orderTotals(refOrders, firstPaid), refFinancials, refFunnel.data)
  const ref = scale(refRaw, compare === 'anterior' ? 1 : refDays)

  const partialMedia = financials.missingCostSources.filter(s => s.startsWith('Meta') || s.startsWith('Google'))
  const partialProfit = [...financials.missingCostSources]
  const missing = cur.paid - cur.costOk
  if (missing > 0) partialProfit.push(`${missing} pedido(s) com item sem custo cadastrado`)

  const series = singleDay
    ? {
        hourly: true,
        cur: hourlyCumulative(curEcon.orders, 1, cutoff),
        base: hourlyCumulative(refOrders, compare === 'anterior' ? 1 : refDays, null),
      }
    : {
        hourly: false,
        cur: dailySeries(curDates, curEcon.orders, mediaMap, curEcon.settings),
        base: dailySeries(refDates, refEcon.orders, mediaMap, refEcon.settings),
      }

  const pendingInPeriod = (await db.from('orders').select('id', { count: 'exact', head: true })
    .eq('store_id', STORE_ID).eq('status', 'pending')
    .gte('created_at', range.startISO).lt('created_at', range.endISO)).count ?? 0

  return {
    cur, base: ref, curD: derive(cur), baseD: derive(ref), curLabel, refLabel, compareNote, compare, singleDay,
    financials, partialMedia, partialProfit,
    funnelReason: curFunnel.reason,
    pendingNow: pendingNowRes.error ? null : pendingNowRes.count ?? null,
    pendingInPeriod,
    series,
    products: products.rows,
    unmatchedUnits: products.unmatchedUnits,
    states: statesOf(curEcon.orders),
    alerts,
    freshness: fresh,
  }
}
