import { createClient } from '@supabase/supabase-js'
import type { DateRange } from '@/lib/admin/date-range'
import { fetchAllRows } from './supabase-pagination'

const STORE_ID = 'b0000000-0000-0000-0000-000000000001'
const TZ = 'America/Sao_Paulo'
const PAID_STATUSES = ['paid', 'invoiced', 'on_carriage', 'payment_confirmed', 'preparing_shipping', 'in_separation', 'in_transit', 'delivered']

function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  )
}

export interface HourlySalesPoint {
  hour: number
  count: number
  pct: number
}

export interface PaymentMethodSlice {
  method: string
  label: string
  count: number
  pct: number
}

export interface PaymentApprovalRate {
  method: string
  label: string
  approved: number
  total: number
  pct: number
}

export interface StateSales {
  state:   string
  count:   number
  revenue: number
  pct:     number
}

export interface SalesBreakdown {
  hourly:      HourlySalesPoint[]
  byPayment:   PaymentMethodSlice[]
  approvalByPayment: PaymentApprovalRate[]
  byState:     StateSales[]
}

const METHOD_LABEL: Record<string, string> = {
  pix:          'Pix',
  credit_card:  'Cartão',
  boleto:       'Boleto',
}

function labelFor(method: string | null): string {
  return method ? (METHOD_LABEL[method] ?? 'Outros') : 'Outros'
}

interface OrderRow {
  status: string
  payment_method: string | null
  created_at: string
  shipping_state: string | null
  total: number | string | null
}

export async function getSalesBreakdown(range: DateRange): Promise<SalesBreakdown> {
  const db = getDb()

  // fetchAllRows — o teto de 1000 linhas do PostgREST truncaria/enviesaria
  // essa quebra num período de mais movimento (mesmo bug do commerce-brain.ts).
  const orders = await fetchAllRows<OrderRow>((from, to) =>
    db.from('orders').select('status, payment_method, created_at, shipping_state, total')
      .eq('store_id', STORE_ID)
      .gte('created_at', range.startISO).lt('created_at', range.endISO)
      .range(from, to))

  // Vendas por horário — só pedidos aprovados, hora local (BRT)
  const hourCounts = new Array(24).fill(0)
  let paidTotal = 0
  for (const o of orders) {
    if (!PAID_STATUSES.includes(o.status)) continue
    paidTotal++
    const hour = parseInt(
      new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', hour12: false }).format(new Date(o.created_at)),
      10,
    )
    hourCounts[hour % 24]++
  }
  const hourly: HourlySalesPoint[] = hourCounts.map((count, hour) => ({
    hour, count, pct: paidTotal > 0 ? (count / paidTotal) * 100 : 0,
  }))

  // Vendas por forma de pagamento — só pedidos aprovados
  const paymentCounts = new Map<string, number>()
  for (const o of orders) {
    if (!PAID_STATUSES.includes(o.status)) continue
    const label = labelFor(o.payment_method)
    paymentCounts.set(label, (paymentCounts.get(label) ?? 0) + 1)
  }
  const byPayment: PaymentMethodSlice[] = Array.from(paymentCounts.entries())
    .map(([label, count]) => ({ method: label, label, count, pct: paidTotal > 0 ? (count / paidTotal) * 100 : 0 }))
    .sort((a, b) => b.count - a.count)

  // Taxa de aprovação por método — considera todos os pedidos (aprovados + pendentes + cancelados) com esse método
  const attemptedByMethod = new Map<string, { approved: number; total: number }>()
  for (const o of orders) {
    const label = labelFor(o.payment_method)
    const entry = attemptedByMethod.get(label) ?? { approved: 0, total: 0 }
    entry.total++
    if (PAID_STATUSES.includes(o.status)) entry.approved++
    attemptedByMethod.set(label, entry)
  }
  const approvalByPayment: PaymentApprovalRate[] = Array.from(attemptedByMethod.entries())
    .map(([label, { approved, total }]) => ({
      method: label, label, approved, total, pct: total > 0 ? (approved / total) * 100 : 0,
    }))
    .sort((a, b) => b.total - a.total)

  // Vendas por estado — só pedidos aprovados, agrupado por shipping_state
  const stateAgg = new Map<string, { count: number; revenue: number }>()
  let paidRevenueTotal = 0
  for (const o of orders) {
    if (!PAID_STATUSES.includes(o.status)) continue
    const state = o.shipping_state ?? 'Não informado'
    const total = parseFloat(String(o.total ?? 0))
    const entry = stateAgg.get(state) ?? { count: 0, revenue: 0 }
    entry.count++
    entry.revenue += total
    stateAgg.set(state, entry)
    paidRevenueTotal += total
  }
  const byState: StateSales[] = Array.from(stateAgg.entries())
    .map(([state, { count, revenue }]) => ({
      state, count, revenue, pct: paidRevenueTotal > 0 ? (revenue / paidRevenueTotal) * 100 : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue)

  return { hourly, byPayment, approvalByPayment, byState }
}
