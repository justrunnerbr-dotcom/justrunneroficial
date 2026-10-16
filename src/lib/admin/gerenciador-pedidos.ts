import { getAdminSupabase } from '@/lib/admin-client'
import type { DateRange } from '@/lib/admin/date-range'
import { loadOrderEconomics, yampiMonthlyFor } from '@/lib/admin/financial-breakdown'
import { computeSalesTax, computeLogisticsCost, computeMediaTax } from '@/lib/admin/cost-settings'
import { chunkIds } from '@/lib/admin/supabase-pagination'
import { utmKey, type MetaUtmCross } from '@/lib/admin/meta-ads'

// Lucro por pedido: a mesma conta do Dashboard (loadOrderEconomics é a fonte
// única de receita/custo/frete/taxas) menos a mídia, rateada de dois jeitos —
// a tela escolhe:
//  • CPA do dia (padrão): gasto total de mídia do dia (Meta +13,8% de tributo,
//    + Google — zero na Just Runner, que não tem conta Google Ads) ÷ TODOS os
//    pedidos pagos do dia.
//    Todo pedido carrega a sua parte do marketing e a soma fecha exata.
//  • CPA da campanha: gasto da campanha de origem no período (+13,8%) ÷ vendas
//    reais dela. Orgânico/WhatsApp ficam sem mídia; gasto de campanha que não
//    vendeu sobra à parte. Serve pra comparar campanhas.

export type PedidoCanal = 'Meta Ads' | 'Google Ads' | 'WhatsApp' | 'E-mail/SMS' | 'Instagram orgânico' | 'Direto/outros'

export interface PedidoLucroRow {
  id:          string
  externalId:  string
  createdAt:   string
  customer:    string
  items:       string
  revenue:     number
  productCost: number
  freightCost: number
  logistics:   number
  gatewayFee:  number
  yampiFee:    number
  salesTax:    number
  /** Receita menos todos os custos, ANTES da mídia. */
  baseProfit:  number
  /** Dia do pedido (America/Sao_Paulo), chave do CPA do dia. */
  day:         string
  mediaDia:       number
  mediaCampanha:  number
  /** Como a mídia por campanha foi calculada — vai no tooltip. */
  basisCampanha:  string
  missingCost: boolean
  canal:       PedidoCanal
  account:     string | null
  campaign:    string | null
  adset:       string | null
  ad:          string | null
  source:      string | null
  medium:      string | null
  payment:     string | null
}

export interface PedidosLucroData {
  rows: PedidoLucroRow[]
  /** Mídia do período que não ficou em pedido nenhum, por forma de rateio:
   *  dia = gasto de dia sem pedido; campanha = campanha sem venda real + UTM que não casa. */
  unallocated: { dia: number; campanha: number }
  /** CPA do dia por data (mídia total do dia ÷ pedidos do dia). */
  cpaDia: Record<string, { cpa: number; spend: number; orders: number }>
  /** false = gasto diário da Meta indisponível; o CPA do dia virou CPA do período. */
  metaDailyKnown: boolean
  /** Mensalidade fixa da Yampi proporcional ao período — não é por pedido. */
  yampiMonthly: number
  salesTaxConfigured: boolean
  googleSpendKnown: boolean
}

export interface CampaignSpend { name: string; account: string; spend: number }

const META_SOURCES = /^(ig|fb|meta|facebook|instagram)/i

function classify(o: { utm_source: string | null; utm_medium: string | null; utm_campaign: string | null; gclid: string | null }): PedidoCanal {
  const src = (o.utm_source ?? '').toLowerCase()
  const med = (o.utm_medium ?? '').toLowerCase()
  const camp = (o.utm_campaign ?? '').toLowerCase()
  // A campanha manda, não a origem: a recuperação da Yampi reescreve só o
  // utm_campaign e deixa o utm_source antigo ("ig") — ver atribuição UTM.
  if (/whatsapp|carrinho_abandonado/.test(camp) || src.startsWith('whatsapp')) return 'WhatsApp'
  if (src === 'email' || src === 'sms') return 'E-mail/SMS'
  if (o.gclid || (src === 'google' && med === 'cpc')) return 'Google Ads'
  // Orgânico do Instagram (link da bio, indicação) não traz utm_campaign.
  if (META_SOURCES.test(src)) return med.includes('paid') || camp ? 'Meta Ads' : 'Instagram orgânico'
  return 'Direto/outros'
}

export async function getPedidosLucro(
  range: DateRange,
  campaigns: CampaignSpend[],
  cross: MetaUtmCross,
  googleSpend: number | null,
  daily: { meta: Map<string, number> | null; google: Map<string, number> | null },
): Promise<PedidosLucroData> {
  const db = getAdminSupabase()
  const { orders, settings } = await loadOrderEconomics(range)

  type UtmRow = {
    id: string; external_id: string | null; utm_source: string | null; utm_medium: string | null
    utm_campaign: string | null; utm_term: string | null; utm_content: string | null; gclid: string | null
    customer_snapshot: { first_name?: string; last_name?: string } | null
    payment_method: string | null
  }
  const ids = orders.filter(o => !o.manual).map(o => o.id)
  const utmById = new Map<string, UtmRow>()
  for (const chunk of chunkIds(ids)) {
    const { data, error } = await db.from('orders')
      .select('id, external_id, utm_source, utm_medium, utm_campaign, utm_term, utm_content, gclid, customer_snapshot, payment_method')
      .in('id', chunk)
    if (error) { console.error('[gerenciador-pedidos] lote de UTM falhou:', error); continue }
    for (const r of (data ?? []) as UtmRow[]) utmById.set(r.id, r)
  }

  // Gasto por campanha (a mesma campanha pode existir em 2 contas com o mesmo nome).
  const spendByKey = new Map<string, { spend: number; accounts: Set<string>; name: string }>()
  for (const c of campaigns) {
    const k = utmKey(c.name)
    const e = spendByKey.get(k) ?? { spend: 0, accounts: new Set<string>(), name: c.name }
    e.spend += c.spend
    if (c.spend > 0) e.accounts.add(c.account)
    spendByKey.set(k, e)
  }
  const cpaByKey = new Map<string, number>()
  for (const [k, e] of spendByKey) {
    const orderCount = cross.campaign[k]?.orders ?? 0
    if (orderCount > 0 && e.spend > 0) cpaByKey.set(k, (e.spend + computeMediaTax(e.spend)) / orderCount)
  }

  const prelim = orders.map(o => ({ o, u: utmById.get(o.id) ?? null }))
  const googleOrders = prelim.filter(p => p.u && classify(p.u) === 'Google Ads').length
  const googleCpa = googleSpend !== null && googleOrders > 0 ? googleSpend / googleOrders : 0
  const logisticsPerOrder = computeLogisticsCost(1, settings)

  const dayOf = (iso: string) => new Date(iso).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })

  // ── CPA do dia ──
  const ordersByDay = new Map<string, number>()
  for (const { o } of prelim) ordersByDay.set(dayOf(o.createdAt), (ordersByDay.get(dayOf(o.createdAt)) ?? 0) + 1)
  const totalMetaRaw = campaigns.reduce((s, c) => s + c.spend, 0)
  const metaDailyKnown = daily.meta !== null
  const spendByDay = new Map<string, number>()
  if (daily.meta) for (const [d, v] of daily.meta) spendByDay.set(d, (spendByDay.get(d) ?? 0) + v + computeMediaTax(v))
  if (daily.google) for (const [d, v] of daily.google) spendByDay.set(d, (spendByDay.get(d) ?? 0) + v)
  else if (googleSpend && prelim.length > 0) {
    // Diário do Google indisponível, total conhecido: reparte pelos dias na proporção dos pedidos.
    for (const [d, n] of ordersByDay) spendByDay.set(d, (spendByDay.get(d) ?? 0) + googleSpend * n / prelim.length)
  }
  const cpaDia: PedidosLucroData['cpaDia'] = {}
  let unallocatedDia = 0
  if (metaDailyKnown) {
    const days = new Set([...ordersByDay.keys(), ...spendByDay.keys()])
    for (const d of days) {
      const spend = spendByDay.get(d) ?? 0
      const n = ordersByDay.get(d) ?? 0
      if (n === 0) { unallocatedDia += spend; continue }
      cpaDia[d] = { cpa: spend / n, spend, orders: n }
    }
  } else {
    // Sem o gasto dia a dia: o período inteiro vira um "dia" só.
    const spend = totalMetaRaw + computeMediaTax(totalMetaRaw) + (googleSpend ?? 0)
    const n = prelim.length
    for (const d of ordersByDay.keys()) cpaDia[d] = { cpa: n > 0 ? spend / n : 0, spend, orders: n }
    if (n === 0) unallocatedDia = spend
  }

  let allocatedCampanha = 0
  const rows: PedidoLucroRow[] = prelim.map(({ o, u }) => {
    const canal: PedidoCanal = u ? classify(u) : 'Direto/outros'
    let mediaCampanha = 0
    let basisCampanha = 'sem mídia paga'
    let account: string | null = null
    if (canal === 'Meta Ads' && u) {
      const k = utmKey(u.utm_campaign)
      const cpa = cpaByKey.get(k)
      const accs = spendByKey.get(k)?.accounts
      account = accs && accs.size > 0 ? [...accs].join(' / ') : null
      if (cpa !== undefined) {
        mediaCampanha = cpa
        allocatedCampanha += cpa
        basisCampanha = 'CPA real da campanha no período (gasto + 13,8% ÷ vendas reais)'
      } else {
        basisCampanha = 'campanha sem gasto no período ou UTM que não casa — mídia não rateada'
      }
    } else if (canal === 'Google Ads') {
      mediaCampanha = googleCpa
      allocatedCampanha += googleCpa
      basisCampanha = googleSpend === null ? 'gasto do Google indisponível' : 'gasto do Google no período ÷ pedidos do Google'
    }

    const day = dayOf(o.createdAt)
    const salesTax = computeSalesTax(o.revenue, settings) ?? 0
    const logistics = logisticsPerOrder
    const baseProfit = o.revenue - o.productCost - o.freightCost - logistics - o.gatewayFee - o.yampiFee - salesTax
    const name = [u?.customer_snapshot?.first_name, u?.customer_snapshot?.last_name].filter(Boolean).join(' ')

    return {
      id: o.id,
      externalId: u?.external_id ?? (o.manual ? 'manual' : ''),
      createdAt: o.createdAt,
      customer: name || (o.manual ? 'Pedido manual' : '—'),
      // Prefixos de título da Just Runner ([JR], [JR OP], [JR COMBO]) saem da lista de itens.
      items: o.items.map(i => `${i.quantity}× ${i.productTitle.replace(/^\[(JR(?: OP| COMBO)?|SO|OP|BUMP)\]\s*/i, '').replace(/\s+/g, ' ')}`).join(', '),
      revenue: o.revenue,
      productCost: o.productCost,
      freightCost: o.freightCost,
      logistics,
      gatewayFee: o.gatewayFee,
      yampiFee: o.yampiFee,
      salesTax,
      baseProfit,
      day,
      mediaDia: cpaDia[day]?.cpa ?? 0,
      mediaCampanha,
      basisCampanha,
      missingCost: o.missingCost,
      canal,
      account,
      campaign: u?.utm_campaign ?? null,
      adset: u?.utm_term ?? null,
      ad: u?.utm_content ?? null,
      source: u?.utm_source ?? null,
      medium: u?.utm_medium ?? null,
      payment: u?.payment_method ?? null,
    }
  }).sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  const totalMetaWithTax = totalMetaRaw + computeMediaTax(totalMetaRaw)
  const totalMedia = totalMetaWithTax + (googleSpend ?? 0)

  return {
    rows,
    unallocated: { dia: unallocatedDia, campanha: Math.max(0, totalMedia - allocatedCampanha) },
    cpaDia,
    metaDailyKnown,
    yampiMonthly: yampiMonthlyFor(range.startISO, range.endISO),
    salesTaxConfigured: computeSalesTax(1, settings) !== null,
    googleSpendKnown: googleSpend !== null,
  }
}
