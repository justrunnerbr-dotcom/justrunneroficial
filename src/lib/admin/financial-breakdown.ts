import { getAdminSupabase } from '@/lib/admin-client'
import type { DateRange } from '@/lib/admin/date-range'
import { getProductCosts, matchProductCost } from '@/lib/admin/product-costs'
import { getCostSettings, computeGatewayFee, computeYampiFee, computeFreightCost } from '@/lib/admin/cost-settings'
import { getManualOrders } from '@/lib/admin/manual-orders'
import { getMetaLiveSpend } from '@/lib/admin/meta-ads'

const STORE_ID = 'b0000000-0000-0000-0000-000000000001'
const APPROVED_STATUSES = ['paid', 'invoiced', 'on_carriage', 'payment_confirmed', 'preparing_shipping', 'in_separation', 'in_transit', 'delivered']

export interface FinancialBreakdown {
  revenue:         number
  productCost:     number
  freightCost:     number
  gatewayFee:      number  // AppMax
  yampiFee:        number  // checkout Yampi (0 pra pedidos manuais)
  metaSpend:       number
  googleAdsSpend:  number  // sempre 0 aqui — sem integração Google Ads na Just Runner
  netProfit:       number
  margin:          number  // netProfit / revenue
}

export async function getFinancialBreakdown(range: DateRange): Promise<FinancialBreakdown> {
  const db = getAdminSupabase()

  const [ordersRes, costs, settings, manual, liveSpend] = await Promise.all([
    db.from('orders')
      .select('id, total, shipping_amount, payment_method')
      .eq('store_id', STORE_ID)
      .in('status', APPROVED_STATUSES)
      .gte('created_at', range.startISO).lt('created_at', range.endISO),
    getProductCosts(),
    getCostSettings(),
    getManualOrders(range),
    getMetaLiveSpend(range.start, range.endExclusive),
  ])

  const orders = ordersRes.data ?? []
  const orderIds = orders.map(o => o.id)
  const { data: items } = orderIds.length > 0
    ? await db.from('order_items').select('order_id, product_title, quantity').in('order_id', orderIds)
    : { data: [] as { order_id: string; product_title: string; quantity: number }[] }

  let revenue = 0, productCost = 0, freightCost = 0, gatewayFee = 0, yampiFee = 0

  for (const o of orders) {
    const total = parseFloat(String(o.total ?? 0))
    const shippingAmount = parseFloat(String(o.shipping_amount ?? 0))
    revenue     += total
    freightCost += computeFreightCost(shippingAmount, settings)
    gatewayFee  += computeGatewayFee(total, o.payment_method, settings)
    yampiFee    += computeYampiFee(total, settings)

    const orderItems = (items ?? []).filter(i => i.order_id === o.id)
    for (const it of orderItems) {
      const cost = matchProductCost(it.product_title, costs)
      if (cost !== null) productCost += cost * it.quantity
    }
  }

  // Pedidos manuais (venda por link direto) — custo do produto já vem direto
  // (sem fuzzy match), não passam pela taxa de checkout Yampi.
  for (const mo of manual.orders) {
    const total = parseFloat(String(mo.total ?? 0))
    revenue     += total
    freightCost += computeFreightCost(mo.shipping_amount, settings)
    gatewayFee  += computeGatewayFee(total, mo.payment_method, settings, mo.installments)
  }
  for (const mi of manual.items) {
    productCost += mi.unit_cost * mi.quantity
  }

  const metaSpend      = liveSpend?.total.spend ?? 0
  const googleAdsSpend = 0

  const netProfit = revenue - productCost - freightCost - gatewayFee - yampiFee - metaSpend - googleAdsSpend
  const margin    = revenue > 0 ? netProfit / revenue : 0

  return { revenue, productCost, freightCost, gatewayFee, yampiFee, metaSpend, googleAdsSpend, netProfit, margin }
}
