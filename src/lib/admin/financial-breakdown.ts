import { getAdminSupabase } from '@/lib/admin-client'
import type { DateRange } from '@/lib/admin/date-range'
import { getProductCosts, matchProductCost } from '@/lib/admin/product-costs'
import { getCostSettings, type CostSettings, computeGatewayFee, computeYampiFee, computeFreightCost, computeLogisticsCost, computeMediaTax, computeSalesTax, YAMPI_MENSALIDADE, YAMPI_MUDANCA_ISO } from '@/lib/admin/cost-settings'
import { getManualOrders } from '@/lib/admin/manual-orders'
import { getMetaLiveSpend } from '@/lib/admin/meta-ads'
import { getGoogleAdsLiveSpend } from '@/lib/admin/google-ads'
import { spendOrZero } from '@/lib/admin/source-status'

const STORE_ID = 'b0000000-0000-0000-0000-000000000001'
export const APPROVED_STATUSES = ['paid', 'invoiced', 'on_carriage', 'payment_confirmed', 'preparing_shipping', 'in_separation', 'in_transit', 'delivered']

/**
 * O PostgREST corta em 1000 linhas por requisição e ignora `.limit()` maior sem
 * dar erro. `order_items` já passa de 1300 linhas no histórico, então em faixas
 * largas (trimestre, ano, "máximo") a leitura vinha truncada e o custo de produto
 * saía menor que o real — inflando o Lucro Líquido. Paginar com `.range()`.
 */
const PAGE = 1000

async function pageAll<T>(
  build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<T[]> {
  const out: T[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await build(from, from + PAGE - 1)
    if (error) throw new Error(error.message)
    const rows = data ?? []
    out.push(...rows)
    if (rows.length < PAGE) return out
  }
}

export interface FinancialBreakdown {
  revenue:         number
  productCost:     number
  /** Frete total: o que a loja pagou nos pedidos com frete grátis + o que repassou à
   *  transportadora nos pedidos em que o cliente pagou. */
  freightCost:     number
  /** Parte do frete que o CLIENTE pagou: entra na receita e sai para a transportadora,
   *  então não muda o lucro. `freightCost - freightPassThrough` é o que sai do bolso. */
  freightPassThrough: number
  logisticsCost:   number  // custo fixo por pedido pago cobrado pela logística
  gatewayFee:      number  // AppMax
  yampiFee:        number  // % por pedido do checkout Yampi (0 pra pedidos manuais)
  yampiMonthly:    number  // mensalidade da Yampi, rateada pelos dias do período
  mediaTax:        number  // 13,8% sobre o investimento em Meta Ads
  salesTax:        number  // imposto sobre faturamento (Simples); 0 se não configurado
  metaSpend:       number
  googleAdsSpend:  number
  netProfit:       number
  margin:          number  // netProfit / revenue

  /**
   * false quando `cost_settings.imposto_pct` está nulo.
   *
   * Nesse caso `salesTax` vale 0 por falta de alíquota, não porque a loja não
   * paga imposto — `netProfit` está otimista em 4 a 11 pontos do faturamento.
   */
  salesTaxConfigured: boolean

  /** true quando o gasto do Meta entrou completo no cálculo. */
  metaTrusted:      boolean
  /** true quando o gasto do Google Ads entrou completo no cálculo. */
  googleAdsTrusted: boolean
  /**
   * Fontes de custo que falharam e portanto NÃO foram descontadas.
   * Enquanto tiver item aqui, `netProfit` e `margin` estão OTIMISTAS —
   * a UI é obrigada a marcar esses números como parciais.
   */
  missingCostSources: string[]
}

/**
 * Gasto da Meta a partir de `meta_ad_insights`, populada pelo cron diário.
 * Usado só quando a API ao vivo falha — ver o comentário no ponto de uso.
 */
/**
 * Gasto de uma plataforma a partir de `daily_marketing_costs`, gravada pelo
 * cron. Usado quando a API ao vivo falha — sem isto o custo caía a zero e o
 * lucro aparecia inflado.
 */
async function getSpendFromDailyCosts(
  db: ReturnType<typeof getAdminSupabase>,
  range: DateRange,
  platform: string,
): Promise<number> {
  try {
    const rows = await pageAll<{ amount: number | string | null }>((from, to) =>
      db.from('daily_marketing_costs')
        .select('amount')
        .eq('platform', platform)
        .gte('date', range.start)
        .lt('date', range.endExclusive)
        .range(from, to))
    return rows.reduce((s, r) => s + (parseFloat(String(r.amount ?? 0)) || 0), 0)
  } catch {
    return 0
  }
}

async function getMetaSpendFromSync(
  db: ReturnType<typeof getAdminSupabase>,
  range: DateRange,
): Promise<number> {
  try {
    const rows = await pageAll<{ spend: number | string | null }>((from, to) =>
      db.from('meta_ad_insights')
        .select('spend')
        .gte('date_start', range.start)
        .lt('date_start', range.endExclusive)
        .range(from, to))
    return rows.reduce((s, r) => s + (parseFloat(String(r.spend ?? 0)) || 0), 0)
  } catch {
    return 0
  }
}

export interface OrderItemEconomics {
  sku:          string | null
  productTitle: string
  quantity:     number
  total:        number
  /** null quando o título não casou com nenhuma linha de `product_costs`. */
  unitCost:     number | null
}

/** Economia de UM pedido pago: receita e custos variáveis dele. É a base única
 *  do lucro — o Lucro Líquido do período e a série diária do Dashboard somam
 *  estas linhas, então as duas telas não podem divergir na fórmula. */
export interface OrderEconomics {
  id:           string
  createdAt:    string
  manual:       boolean
  revenue:      number
  productCost:  number
  freightCost:  number
  /** Frete pago pelo cliente neste pedido (0 quando foi frete grátis). */
  freightPaidByCustomer: number
  gatewayFee:   number
  yampiFee:     number
  /** true quando algum item entrou com custo zero por falta de cadastro. */
  missingCost:  boolean
  sessionId:    string | null
  customerId:   string | null
  hasOrigin:    boolean
  state:        string | null
  items:        OrderItemEconomics[]
}

export async function loadOrderEconomics(range: DateRange): Promise<{ orders: OrderEconomics[]; settings: CostSettings }> {
  const db = getAdminSupabase()

  type OrderRow = {
    id: string; total: string | number | null; shipping_amount: string | number | null
    payment_method: string | null; created_at: string
    session_id: string | null; customer_id: string | null
    utm_source: string | null; gclid: string | null; shipping_state: string | null
  }
  type ItemRow  = { order_id: string; product_title: string; quantity: number; sku: string | null; total: string | number | null }

  const [orders, costs, settings, manual] = await Promise.all([
    pageAll<OrderRow>((from, to) =>
      db.from('orders')
        .select('id, total, shipping_amount, payment_method, created_at, session_id, customer_id, utm_source, gclid, shipping_state')
        .eq('store_id', STORE_ID)
        .in('status', APPROVED_STATUSES)
        .gte('created_at', range.startISO).lt('created_at', range.endISO)
        .order('created_at')
        .range(from, to)),
    getProductCosts(),
    getCostSettings(),
    getManualOrders(range),
  ])

  const itemsByOrder = new Map<string, ItemRow[]>()
  const orderIds = orders.map(o => o.id)
  // `in()` com muitos ids estoura o tamanho da URL — lotes de 200 pedidos.
  for (let i = 0; i < orderIds.length; i += 200) {
    const lote = orderIds.slice(i, i + 200)
    const rows = await pageAll<ItemRow>((from, to) =>
      db.from('order_items')
        .select('order_id, product_title, quantity, sku, total')
        .in('order_id', lote)
        .range(from, to))
    for (const it of rows) {
      const list = itemsByOrder.get(it.order_id)
      if (list) list.push(it)
      else itemsByOrder.set(it.order_id, [it])
    }
  }

  const out: OrderEconomics[] = []

  for (const o of orders) {
    const total = parseFloat(String(o.total ?? 0))
    const shippingAmount = parseFloat(String(o.shipping_amount ?? 0))
    const items: OrderItemEconomics[] = (itemsByOrder.get(o.id) ?? []).map(it => ({
      sku:          it.sku,
      productTitle: it.product_title,
      quantity:     it.quantity,
      total:        parseFloat(String(it.total ?? 0)) || 0,
      unitCost:     matchProductCost(it.product_title, costs),
    }))
    out.push({
      id:          o.id,
      createdAt:   o.created_at,
      manual:      false,
      revenue:     total,
      productCost: items.reduce((s, it) => s + (it.unitCost ?? 0) * it.quantity, 0),
      freightCost: computeFreightCost(shippingAmount, settings),
      freightPaidByCustomer: shippingAmount > 0 ? shippingAmount : 0,
      gatewayFee:  computeGatewayFee(total, o.payment_method, settings),
      // a data manda na taxa: a Yampi mudou de 2,5% pra 1,5% em 01/08/2026
      yampiFee:    computeYampiFee(total, settings, o.created_at ?? undefined),
      missingCost: items.length === 0 || items.some(it => it.unitCost === null),
      sessionId:   o.session_id,
      customerId:  o.customer_id,
      hasOrigin:   Boolean(o.utm_source?.trim() || o.gclid?.trim()),
      state:       o.shipping_state,
      items,
    })
  }

  // Pedidos manuais (venda por link direto) — custo do produto já vem direto
  // (sem fuzzy match), não passam pela taxa de checkout Yampi.
  for (const mo of manual.orders) {
    const total = parseFloat(String(mo.total ?? 0))
    const moItems = manual.items.filter(mi => mi.manual_order_id === mo.id)
    out.push({
      id:          mo.id,
      createdAt:   mo.created_at,
      manual:      true,
      revenue:     total,
      productCost: moItems.reduce((s, mi) => s + mi.unit_cost * mi.quantity, 0),
      freightCost: computeFreightCost(mo.shipping_amount, settings),
      freightPaidByCustomer: mo.shipping_amount > 0 ? mo.shipping_amount : 0,
      gatewayFee:  computeGatewayFee(total, mo.payment_method, settings, mo.installments),
      yampiFee:    0,
      missingCost: false,
      sessionId:   null,
      customerId:  null,
      hasOrigin:   false,
      state:       null,
      items:       [],
    })
  }

  return { orders: out, settings }
}

/** Mensalidade da Yampi rateada pelos dias do intervalo — só a partir de
 *  01/08/2026. Antes disso não havia mensalidade, só o percentual por pedido. */
export function yampiMonthlyFor(startISO: string, endISO: string): number {
  const mudanca = new Date(`${YAMPI_MUDANCA_ISO}T00:00:00-03:00`).getTime()
  const fim = new Date(endISO).getTime()
  if (fim <= mudanca) return 0
  const inicio = Math.max(new Date(startISO).getTime(), mudanca)
  const dias = Math.max(0, Math.round((fim - inicio) / 86_400_000))
  return YAMPI_MENSALIDADE * (dias / 30)
}

export async function getFinancialBreakdown(
  range: DateRange,
  preloaded?: { orders: OrderEconomics[]; settings: CostSettings },
): Promise<FinancialBreakdown> {
  const db = getAdminSupabase()

  const [{ orders, settings }, liveSpend, googleAdsLiveSpend] = await Promise.all([
    preloaded ?? loadOrderEconomics(range),
    getMetaLiveSpend(range.start, range.endExclusive),
    getGoogleAdsLiveSpend(range.start, range.endExclusive),
  ])

  let revenue = 0, productCost = 0, freightCost = 0, freightPassThrough = 0, gatewayFee = 0, yampiFee = 0
  for (const o of orders) {
    revenue     += o.revenue
    productCost += o.productCost
    freightCost += o.freightCost
    freightPassThrough += o.freightPaidByCustomer
    gatewayFee  += o.gatewayFee
    yampiFee    += o.yampiFee
  }

  // Gasto de mídia: cada fonte informa se o número dela é confiável. Um gasto
  // que não pôde ser lido continua sendo somado como 0 (não há alternativa no
  // cálculo), mas a flag correspondente vai junto pra que ninguém leia o Lucro
  // Líquido resultante como se fosse fechado.
  const meta   = spendOrZero(liveSpend,          d => d.total.spend)
  // A Just Runner não tem conta de Google Ads ligada: "não configurado" aqui
  // significa gasto zero de verdade, não fonte faltando. Sem isso o lucro
  // ficaria marcado como parcial pra sempre. Erro de API continua sendo lacuna.
  const google = googleAdsLiveSpend.status === 'not_configured'
    ? { value: 0, trusted: true }
    : spendOrZero(googleAdsLiveSpend, d => d.spend)

  // Mesma rede de segurança da Meta, agora para o Google.
  let googleAdsSpend = google.value
  let googleFromSync = false
  if (!google.trusted) {
    const sincronizado = await getSpendFromDailyCosts(db, range, 'google')
    if (sincronizado > 0) { googleAdsSpend = sincronizado; googleFromSync = true }
  }

  // Meta parcial (só algumas contas falharam) também não é confiável pro total.
  const metaLiveTrusted = meta.trusted && (liveSpend.data?.failedAccounts.length ?? 0) === 0

  // Rede de segurança: quando a API ao vivo falha, o gasto caía a ZERO e o lucro
  // aparecia inflado — o pior erro possível aqui, porque o número fica bonito
  // justamente quando a informação some. Desde 17/08/2026 `meta_ad_insights` é
  // populada por cron, então serve de fallback. Continua marcado como não
  // confiável: o dado sincronizado pode estar algumas horas atrás.
  let metaSpend = meta.value
  let metaFromSync = false
  if (!metaLiveTrusted) {
    const sincronizado = await getMetaSpendFromSync(db, range)
    const doDiario = sincronizado > 0 ? 0 : await getSpendFromDailyCosts(db, range, 'meta')
    const valor = sincronizado > 0 ? sincronizado : doDiario
    if (valor > 0) {
      metaSpend = valor
      metaFromSync = true
    }
  }
  const metaFullyTrusted = metaLiveTrusted

  const missingCostSources: string[] = []
  if (!metaLiveTrusted) {
    missingCostSources.push(metaFromSync ? 'Meta Ads (usando o último sync)' : 'Meta Ads')
  }
  if (!google.trusted) {
    missingCostSources.push(googleFromSync ? 'Google Ads (usando o último sync)' : 'Google Ads')
  }

  // Tributo de 13,8% sobre o investimento em Meta Ads. Não incide sobre faturamento —
  // só sobre a mídia, e acompanha ela. Até 11/08/2026 não era descontado em lugar nenhum.
  const mediaTax = computeMediaTax(metaSpend)

  const yampiMonthly = yampiMonthlyFor(range.startISO, range.endISO)

  // Imposto sobre faturamento (Simples Nacional). Até 19/08/2026 não era
  // descontado em lugar nenhum — num comércio no Simples são 4 a 11,3% do
  // faturamento, e diferente das APIs de mídia esse valor é totalmente
  // previsível. Nulo significa alíquota não configurada: entra como lacuna
  // declarada, nunca como zero, porque zero afirmaria que a loja não paga
  // imposto e inflaria o Lucro Líquido.
  const salesTaxCalc = computeSalesTax(revenue, settings)
  const salesTax = salesTaxCalc ?? 0
  if (salesTaxCalc === null) missingCostSources.push('Imposto sobre faturamento (alíquota não configurada)')

  // Custo fixo por pedido cobrado pela logística. Conta o pedido, não o item:
  // é uma etiqueta por pedido. Pedido manual (venda por link) entra junto —
  // também é despachado pela mesma logística; o que ele não paga é a taxa de
  // checkout da Yampi, que é outra coisa.
  const logisticsCost = computeLogisticsCost(orders.length, settings)

  const netProfit = revenue - productCost - freightCost - logisticsCost - gatewayFee - yampiFee - yampiMonthly
    - mediaTax - salesTax - metaSpend - googleAdsSpend
  const margin    = revenue > 0 ? netProfit / revenue : 0

  return {
    revenue, productCost, freightCost, freightPassThrough, logisticsCost, gatewayFee, yampiFee, yampiMonthly, mediaTax,
    salesTax, salesTaxConfigured: salesTaxCalc !== null,
    metaSpend, googleAdsSpend, netProfit, margin,
    metaTrusted:      metaFullyTrusted,
    googleAdsTrusted: google.trusted,
    missingCostSources,
  }
}
