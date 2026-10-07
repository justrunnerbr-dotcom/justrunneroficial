import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { PAID_STATUSES } from './commerce-brain'
import { fetchAllRows, chunkIds } from './supabase-pagination'
import { channelBreakdown, type ChannelBreakdown } from './analise-suprema-canais'
import { buildFunnel, type FunnelWindow, type DailyAnalyticsRow } from './analise-suprema-funil'
import { customerStats, type CustomerStats, type CustomerRow } from './analise-suprema-clientes'
import { classificarOferta, razaoPaga, compararOfertas, type OfertaStat } from './analise-suprema-ofertas'
import { canonicalChannel } from './analise-suprema-canais'
import { midiaRange, type MidiaRange } from './analise-suprema-midia'
import { getFinancialBreakdown, loadOrderEconomics, type FinancialBreakdown } from './financial-breakdown'
import { indiceDeEstimativa, resolverCusto } from './analise-suprema-custo-estimado'
import { TRIBUTO_MIDIA_PCT, computeLogisticsCost } from './cost-settings'
import { getProductCosts, matchProductCost, type ProductCost } from './product-costs'
import type { DateRange } from './date-range'
import { ultimoFechamento } from './fechamento-dados'
import {
  normalizeProductKey, matchModelKey, windowRanges, faixasDe, mesCorrenteBRT, diaBRT, somarDias, inicioDoDiaISO,
  normalizarCampanha, ehRecuperacao,
  type Range, type RegionStat, type ReturnsCost, type Referencias, type DailyRow, type Calendario,
  type VendasPorCampanha, type Janela,
  type AnaliseSupremaSource, type ProductStat, type DayStat,
  type MarginBreakdown, type CampaignPoint, type WindowDays,
} from './analise-suprema-source'

const STORE_ID = 'b0000000-0000-0000-0000-000000000001'

/**
 * Memo de curta duração.
 *
 * A página abre com mais de 30 consultas: seis janelas de produto, seis de dia,
 * mais funil, canais, região, ofertas, devolução, mídia e financeiro. Sem isto
 * cada abertura levava 4–5s, e várias dessas consultas repetem exatamente o
 * mesmo trabalho (a janela de 60 dias contém a de 7).
 *
 * `revalidate` de página não resolve: a rota é dinâmica porque lê o cookie de
 * sessão. O cache precisa estar no dado.
 *
 * Dois minutos é seguro porque as fontes se atualizam por cron — rollup às
 * 03:20, Meta às 03:00, analytics a cada 5 min. Nada muda entre duas aberturas
 * dentro desse intervalo. Para tempo real existe o Live View, que é outra tela.
 */
const TTL_MS = 120_000
const memo = new Map<string, { em: number; valor: Promise<unknown> }>()

function comCache<T>(chave: string, fn: () => Promise<T>): Promise<T> {
  const agora = Date.now()
  const hit = memo.get(chave)
  if (hit && agora - hit.em < TTL_MS) return hit.valor as Promise<T>
  const valor = fn().catch(err => {
    // Falha não fica cacheada: a próxima abertura tenta de novo.
    memo.delete(chave)
    throw err
  })
  memo.set(chave, { em: agora, valor })
  // Limpeza preguiçosa para o mapa não crescer sem limite.
  if (memo.size > 60) {
    for (const [k, v] of memo) if (agora - v.em > TTL_MS) memo.delete(k)
  }
  return valor
}

function db(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  )
}

const num = (v: unknown) => parseFloat(String(v ?? 0)) || 0
const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const diaDaSemana = (data: string) => WEEKDAYS[new Date(`${data}T12:00:00Z`).getUTCDay()]
const fatorTributo = 1 + TRIBUTO_MIDIA_PCT / 100

const rotuloJanela = (j: Janela) => typeof j === 'number' ? `Últimos ${j} dias` : `${j.start} a ${j.endExclusive}`

/** Janela da Análise Suprema no formato que as contas oficiais do admin usam. */
function comoDateRange(r: Range, label: string, preset: DateRange['preset'] = 'custom'): DateRange {
  return { start: r.start, endExclusive: r.endExclusive, startISO: r.startISO, endISO: r.endISO, label, preset }
}

// ── Custos ────────────────────────────────────────────────────────────────────
//
// Mesma regra do Dashboard: `matchProductCost` (nome exato, senão parecido, e o
// MENOR custo entre fornecedores). Antes esta tela ficava com o MAIOR custo
// entre cadastros duplicados, e o CMV saía ~29% acima do Dashboard (setembro:
// R$ 83,66 contra R$ 64,69 por pedido).
//
// Dois complementos que o Dashboard não faz, ambos sinalizados na tela:
// 1. Cadastro de MODELO ("Gascan (GERAL)") vale para qualquer variante dele —
//    sem isso o item aparece sem custo tendo custo registrado.
// 2. Sem cadastro nenhum, `resolverCusto` estima pelo modelo e marca "est.".

type Custos = { lista: ProductCost[]; porChave: Map<string, number>; chaves: string[] }

/** Chaves do mapa de custo, da mais longa para a mais curta. */
export function chavesPorTamanho(custos: Map<string, number>): string[] {
  return [...custos.keys()].sort((a, b) => b.length - a.length)
}

/** Custo por prefixo de modelo: `Gascan (GERAL)` vale para `Gascan Preto`. O prefixo mais longo vence. */
export function buscarCusto(
  titulo: string,
  custos: Map<string, number>,
  chavesPorTamanho: string[],
): number | null {
  const k = normalizeProductKey(titulo)
  if (!k) return null
  const exato = custos.get(k)
  if (exato !== undefined) return exato
  for (const c of chavesPorTamanho) {
    if (c && (k === c || k.startsWith(`${c} `))) return custos.get(c) ?? null
  }
  return null
}

async function getCustos(): Promise<Custos> {
  const lista = await getProductCosts()
  const porChave = new Map<string, number>()
  for (const row of lista) {
    const key = normalizeProductKey(row.model_name)
    if (!key) continue
    const c = num(row.cost)
    // Cadastro duplicado: fica o MENOR, a mesma regra do Dashboard.
    porChave.set(key, Math.min(porChave.get(key) ?? Infinity, c))
  }
  return { lista, porChave, chaves: chavesPorTamanho(porChave) }
}

/** Custo unitário cadastrado do item: regra oficial primeiro, depois o cadastro por modelo. */
function custoCadastrado(titulo: string, custos: Custos): number | null {
  return matchProductCost(titulo, custos.lista) ?? buscarCusto(titulo, custos.porChave, custos.chaves)
}

// ── Pedidos ───────────────────────────────────────────────────────────────────

type OrderRow = {
  id: string; total: number; payment_method: string; shipping_amount: number
  created_at: string; utm_source: string | null; utm_campaign: string | null
  shipping_state: string | null; subtotal: number; discount: number
}

async function getPaidOrders(client: SupabaseClient, startISO: string, endISO: string): Promise<OrderRow[]> {
  // Pagina: o PostgREST corta em 1000 linhas e ignora `.limit()` maior em
  // silêncio — janelas de 30/60 dias passam disso e sairiam truncadas.
  const data = await fetchAllRows<Record<string, unknown>>((from, to) =>
    client
      .from('orders')
      .select('id, total, payment_method, shipping_amount, created_at, utm_source, utm_campaign, shipping_state, subtotal, discount_amount')
      .eq('store_id', STORE_ID)
      .in('status', PAID_STATUSES)
      .gte('created_at', startISO)
      .lt('created_at', endISO)
      .order('created_at', { ascending: true })
      .range(from, to))
  return data.map(o => ({
    id: String(o.id),
    total: num(o.total),
    payment_method: String(o.payment_method ?? ''),
    shipping_amount: num(o.shipping_amount),
    created_at: String(o.created_at),
    utm_source: o.utm_source ? String(o.utm_source) : null,
    utm_campaign: o.utm_campaign ? String(o.utm_campaign) : null,
    shipping_state: o.shipping_state ? String(o.shipping_state) : null,
    subtotal: num(o.subtotal),
    discount: num(o.discount_amount),
  }))
}

type ItemRow = { order_id: string; product_title: string; quantity: number; total: number }

/**
 * `.in()` com muitos ids estoura a URL e o PostgREST devolve `data: null` sem
 * lançar erro — na tela isso vira "nenhum item", que passa por resultado
 * válido. Usa o tamanho de lote já calibrado no projeto (IN_CHUNK_SIZE).
 */
async function getOrderItems(client: SupabaseClient, orderIds: string[]): Promise<ItemRow[]> {
  // Os lotes vão em paralelo: são leituras independentes.
  const lotes = await Promise.all(
    chunkIds(orderIds).map(lote =>
      fetchAllRows<Record<string, unknown>>((from, to) =>
        client
          .from('order_items')
          .select('order_id, product_title, quantity, total')
          .in('order_id', lote)
          .order('order_id', { ascending: true })
          .range(from, to))),
  )
  return lotes.flat().map(r => ({
    order_id: String(r.order_id),
    product_title: String(r.product_title ?? ''),
    quantity: parseInt(String(r.quantity ?? 1)) || 1,
    total: num(r.total),
  }))
}

/**
 * Investimento em mídia por dia, COM o tributo de 13,8% sobre o Meta (o Google
 * não tem). É a mesma base que o Dashboard usa no custo por pedido, MER e ROI.
 */
async function midiaPorDia(client: SupabaseClient, start: string, endExclusive: string): Promise<Map<string, number>> {
  const rows = await fetchAllRows<{ date: string; amount: number | string | null; platform: string | null }>((from, to) =>
    client.from('daily_marketing_costs')
      .select('date, amount, platform')
      .gte('date', start).lt('date', endExclusive)
      .range(from, to))
  const porDia = new Map<string, number>()
  for (const c of rows) {
    const d = String(c.date ?? '').slice(0, 10)
    if (!d) continue
    const valor = num(c.amount) * (String(c.platform ?? '').toLowerCase() === 'meta' ? fatorTributo : 1)
    porDia.set(d, (porDia.get(d) ?? 0) + valor)
  }
  return porDia
}

// ── Comportamento (rollup diário) ─────────────────────────────────────────────

type Behavior = { views: number; addToCarts: number }

/** Chaves de modelo vindas de `products.name`, para casar com títulos de item. */
async function getModelKeys(client: SupabaseClient): Promise<{ keys: string[]; slugToModel: Map<string, string> }> {
  const { data } = await client.from('products').select('slug, name').limit(1000)  // 90 produtos: cabe numa página
  const slugToModel = new Map<string, string>()
  const keys = new Set<string>()
  for (const p of data ?? []) {
    const key = normalizeProductKey(String(p.name ?? ''))
    if (!key) continue
    keys.add(key)
    slugToModel.set(String(p.slug), key)
  }
  return { keys: [...keys], slugToModel }
}

/**
 * Views e add-to-carts por MODELO na janela (dias de Brasília; fim exclusivo).
 *
 * A agregação por dia é feita no banco (o teto de 1000 linhas do PostgREST
 * truncaria a soma no cliente). Aqui os slugs são dobrados no modelo: a loja
 * tem slugs distintos para o mesmo modelo (`permian` e `permian-175`).
 */
async function getBehavior(client: SupabaseClient, r: Range, slugToModel: Map<string, string>): Promise<Map<string, Behavior>> {
  const { data, error } = await client.rpc('analise_suprema_product_window', {
    p_store_id: STORE_ID,
    p_start: r.start,
    p_end: r.endExclusive,
  })
  if (error) return new Map()

  const agg = new Map<string, Behavior>()
  for (const row of (data ?? []) as Array<{ product_slug: string; views: number; add_to_carts: number }>) {
    const modelo = slugToModel.get(row.product_slug) ?? normalizeProductKey(row.product_slug)
    if (!modelo) continue
    const cur = agg.get(modelo) ?? { views: 0, addToCarts: 0 }
    cur.views += Number(row.views) || 0
    cur.addToCarts += Number(row.add_to_carts) || 0
    agg.set(modelo, cur)
  }
  return agg
}

// ── Calendário: histórico mensal fechado ──────────────────────────────────────
//
// Meses já fechados não mudam, então ficam registrados aqui com a fonte: receita
// paga da Yampi (status atual, extraída em 05/10/2026) e gasto das APIs do Meta e
// do Google. O banco da loja só tem pedidos completos a partir de jul/2026, e a
// Black Friday e o Natal de 2025 estão só na Yampi. O mês corrente é ao vivo.
// MER = receita ÷ (Meta × 1,138 + Google). Out/2025 fica de fora: só 4 dias de Yampi.
const HISTORICO_MENSAL: { mes: string; receita: number; meta: number; google: number }[] = [
  { mes: '2025-11', receita: 303172.77, meta: 91131.68, google: 305.04 },
  { mes: '2025-12', receita: 410191.27, meta: 113887.03, google: 361.12 },
  { mes: '2026-01', receita: 147625.82, meta: 35452.39, google: 358.01 },
  { mes: '2026-02', receita: 90748.22, meta: 16089.32, google: 1265.75 },
  { mes: '2026-03', receita: 22994.78, meta: 10916.72, google: 0 },
  { mes: '2026-04', receita: 17780.37, meta: 11990.84, google: 9.27 },
  { mes: '2026-05', receita: 42522.94, meta: 12990.97, google: 0 },
  { mes: '2026-06', receita: 49078.70, meta: 14843.35, google: 501.28 },
  { mes: '2026-07', receita: 124935.13, meta: 34332.64, google: 3704.97 },
  { mes: '2026-08', receita: 199644.33, meta: 43629.47, google: 9297.21 },
  { mes: '2026-09', receita: 243653.38, meta: 60290.31, google: 0 },
]
const MESES_CURTOS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
const rotuloMes = (mes: string) => `${MESES_CURTOS[Number(mes.slice(5, 7)) - 1]}/${mes.slice(2, 4)}`

// ── Implementação ─────────────────────────────────────────────────────────────

const fonteCrua: AnaliseSupremaSource & {
  getReferencias(): Promise<Referencias>
  getVendasPorCampanha(startISO: string, endISO: string): Promise<VendasPorCampanha>
} = {
  isReal: true,

  async getProductStats(janela: Janela): Promise<ProductStat[]> {
    const client = db()
    const { current, previous } = faixasDe(janela)

    const { keys: modelKeys, slugToModel } = await getModelKeys(client)

    const [ordersNow, ordersPrev, custos, behNow, behPrev] = await Promise.all([
      getPaidOrders(client, current.startISO, current.endISO),
      getPaidOrders(client, previous.startISO, previous.endISO),
      getCustos(),
      getBehavior(client, current, slugToModel),
      getBehavior(client, previous, slugToModel),
    ])

    const [itemsNow, itemsPrev] = await Promise.all([
      getOrderItems(client, ordersNow.map(o => o.id)),
      getOrderItems(client, ordersPrev.map(o => o.id)),
    ])

    // A venda é por variante e o comportamento é por modelo: o agrupamento é no
    // modelo, e o custo é somado item a item pela variante antes de virar custo
    // unitário médio do modelo.
    type Acc = { title: string; revenue: number; units: number; cogs: number; unitsComCusto: number }
    const somaItens = (items: ItemRow[], pedidos: OrderRow[]) => {
      // Rateia o valor PAGO: no "Compre 1 Leve 2" os itens somam R$ 594 e o
      // cliente paga R$ 297 — sem o rateio a receita por produto sai 2× maior.
      const razaoPorPedido = new Map(pedidos.map(o => [o.id, razaoPaga(o.subtotal, o.discount)]))
      const m = new Map<string, Acc>()
      for (const it of items) {
        const chaveItem = normalizeProductKey(it.product_title)
        const key = matchModelKey(it.product_title, modelKeys) ?? chaveItem
        if (!key) continue
        const razao = razaoPorPedido.get(it.order_id) ?? 1
        const cur = m.get(key) ?? { title: it.product_title, revenue: 0, units: 0, cogs: 0, unitsComCusto: 0 }
        cur.revenue += it.total * razao
        cur.units += it.quantity
        const custoUnit = custoCadastrado(it.product_title, custos)
        if (custoUnit !== null) {
          cur.cogs += custoUnit * it.quantity
          cur.unitsComCusto += it.quantity
        }
        m.set(key, cur)
      }
      return m
    }

    const now = somaItens(itemsNow, ordersNow)
    const prev = somaItens(itemsPrev, ordersPrev)

    const indice = indiceDeEstimativa(custos.porChave)
    const chaves = new Set([...now.keys(), ...behNow.keys()])
    return [...chaves].map(key => {
      const v = now.get(key)
      const b = behNow.get(key)
      const medioCadastrado = v && v.unitsComCusto > 0 ? v.cogs / v.unitsComCusto : null
      const custoResolvido = resolverCusto(key, medioCadastrado, indice)
      return {
        key,
        title: v?.title ?? key,
        revenue: v?.revenue ?? 0,
        units: v?.units ?? 0,
        views: b?.views ?? 0,
        addToCarts: b?.addToCarts ?? 0,
        revenuePrev: prev.get(key)?.revenue ?? 0,
        viewsPrev: behPrev.get(key)?.views ?? 0,
        unitCost: custoResolvido?.value ?? null,
        costIsEstimate: custoResolvido?.estimated ?? false,
      }
    })
  },

  async getDayStats(window: WindowDays): Promise<DayStat[]> {
    const serie = await this.getDaySeries()
    const { current } = windowRanges(window, new Date())
    return serie.filter(d => d.date >= current.start && d.date < current.endExclusive)
  },

  /**
   * Série diária dos últimos 60 dias completos, em dias de Brasília, com o
   * investimento em mídia do dia já com o tributo do Meta. `roas` é o MER do
   * dia (receita ÷ mídia com tributo), na mesma base do Dashboard.
   *
   * Dia sem custo registrado mantém `spend: 0` e `roas: 0`, que a UI lê como
   * "sem dado". Não se estima gasto.
   */
  async getDaySeries(): Promise<DayStat[]> {
    const client = db()
    const { current } = windowRanges(60, new Date())

    const [orders, gasto] = await Promise.all([
      getPaidOrders(client, current.startISO, current.endISO),
      midiaPorDia(client, current.start, current.endExclusive),
    ])

    const porDia = new Map<string, { revenue: number; orders: number }>()
    for (const o of orders) {
      const d = diaBRT(o.created_at)
      const cur = porDia.get(d) ?? { revenue: 0, orders: 0 }
      cur.revenue += o.total
      cur.orders += 1
      porDia.set(d, cur)
    }

    return [...porDia.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => {
        const spend = gasto.get(date) ?? 0
        return {
          date,
          weekday: diaDaSemana(date),
          revenue: v.revenue,
          orders: v.orders,
          spend,
          roas: spend > 0 ? v.revenue / spend : 0,
          aov: v.orders > 0 ? v.revenue / v.orders : 0,
        }
      })
  },

  /** Lucro líquido pela conta oficial do admin (`financial-breakdown.ts`), na janela de Brasília. */
  async getFinancial(janela: Janela): Promise<FinancialBreakdown> {
    const { current } = faixasDe(janela)
    const preset = janela === 7 ? 'last_7_days' : janela === 14 ? 'last_14_days' : janela === 30 ? 'last_30_days' : 'custom'
    return getFinancialBreakdown(comoDateRange(current, rotuloJanela(janela), preset))
  },

  /**
   * Margem por produto da janela, sobre os mesmos pedidos e custos do Dashboard
   * (`loadOrderEconomics`): custo de produto oficial, frete oficial (grátis e
   * repassado), taxas e logística por pedido.
   */
  async getMarginBreakdown(janela: Janela): Promise<MarginBreakdown> {
    const { current } = faixasDe(janela)
    const { orders, settings } = await loadOrderEconomics(comoDateRange(current, rotuloJanela(janela)))

    let revenue = 0, cogs = 0, fees = 0, shipping = 0, itemsTotal = 0, itemsWithoutCost = 0
    for (const o of orders) {
      revenue += o.revenue
      cogs += o.productCost
      fees += o.gatewayFee + o.yampiFee
      shipping += o.freightCost
      itemsTotal += o.items.length
      itemsWithoutCost += o.items.filter(it => it.unitCost === null).length
    }
    const logistics = computeLogisticsCost(orders.length, settings)
    return {
      revenue, cogs, fees, shipping, logistics,
      marketing: 0, // o lucro com mídia vem de getFinancial()
      netProfit: revenue - cogs - fees - shipping - logistics,
      coveragePct: itemsTotal > 0 ? ((itemsTotal - itemsWithoutCost) / itemsTotal) * 100 : 0,
      itemsWithoutCost, itemsTotal,
      // A conta oficial não estima custo: item sem cadastro entra como zero e
      // aparece em `itemsWithoutCost`.
      cogsEstimado: 0,
    }
  },

  /**
   * Mês corrente dia a dia (Brasília), pela conta oficial do Dashboard:
   * receita − custo de produto − frete (grátis e repassado) − logística por
   * pedido − taxas AppMax e Yampi − mídia com o tributo de 13,8% sobre o Meta.
   * Fica de fora a mensalidade da Yampi, que é do mês e não do dia.
   *
   * "Vs. histórico" compara o MER do dia com a média do mesmo dia da semana nos
   * 56 dias completos anteriores ao mês (8 ocorrências de cada dia).
   */
  async getMonthlyDailyRows(hoje: Date = new Date()): Promise<DailyRow[]> {
    const client = db()
    const { range, hoje: diaHoje, diasNoMes } = mesCorrenteBRT(hoje)
    const iso = (d: number) => `${diaHoje.slice(0, 7)}-${String(d).padStart(2, '0')}`
    const fimMes = somarDias(iso(diasNoMes), 1)
    const baseInicio = somarDias(range.start, -56)

    const [{ orders, settings }, gasto, gastoBase, pedidosBase, insights] = await Promise.all([
      loadOrderEconomics(comoDateRange(range, 'Este mês', 'current_month')),
      midiaPorDia(client, range.start, fimMes),
      midiaPorDia(client, baseInicio, range.start),
      getPaidOrders(client, inicioDoDiaISO(baseInicio), range.startISO),
      fetchAllRows<{ date_start: string; clicks: number | string | null }>((from, to) =>
        client.from('meta_ad_insights')
          .select('date_start, clicks')
          .eq('store_id', STORE_ID).eq('level', 'campaign')
          .gte('date_start', range.start).lt('date_start', fimMes).range(from, to)),
    ])

    type Acc = { receita: number; vendas: number; custos: number }
    const porDia = new Map<string, Acc>()
    for (const o of orders) {
      const d = diaBRT(o.createdAt)
      const a = porDia.get(d) ?? { receita: 0, vendas: 0, custos: 0 }
      a.receita += o.revenue
      a.vendas += 1
      a.custos += o.productCost + o.freightCost + o.gatewayFee + o.yampiFee + computeLogisticsCost(1, settings)
      porDia.set(d, a)
    }

    const cliquesPorDia = new Map<string, number>()
    for (const i of insights) {
      const d = String(i.date_start ?? '').slice(0, 10)
      if (d) cliquesPorDia.set(d, (cliquesPorDia.get(d) ?? 0) + num(i.clicks))
    }

    // Base: MER por dia da semana nos 56 dias antes do mês.
    const receitaBase = new Map<string, number>()
    for (const o of pedidosBase) {
      const d = diaBRT(o.created_at)
      receitaBase.set(d, (receitaBase.get(d) ?? 0) + o.total)
    }
    const basePorSemana = new Map<number, { receita: number; midia: number }>()
    for (let d = baseInicio; d < range.start; d = somarDias(d, 1)) {
      const midia = gastoBase.get(d) ?? 0
      if (midia <= 0) continue
      const wd = new Date(`${d}T12:00:00Z`).getUTCDay()
      const b = basePorSemana.get(wd) ?? { receita: 0, midia: 0 }
      b.receita += receitaBase.get(d) ?? 0
      b.midia += midia
      basePorSemana.set(wd, b)
    }

    const linhas: DailyRow[] = []
    for (let dd = 1; dd <= diasNoMes; dd++) {
      const date = iso(dd)
      const wd = new Date(`${date}T12:00:00Z`).getUTCDay()
      const isFuture = date > diaHoje
      const a = porDia.get(date) ?? { receita: 0, vendas: 0, custos: 0 }
      const investimento = gasto.get(date) ?? 0
      const lucro = a.receita - a.custos - investimento
      const mer = investimento > 0 ? a.receita / investimento : 0
      const b = basePorSemana.get(wd)
      const media = b && b.midia > 0 ? b.receita / b.midia : 0
      const deltaPct = media > 0 && mer > 0 ? Math.round(((mer - media) / media) * 100) : 0
      const status: DailyRow['vsHistorico']['status'] = deltaPct >= 8 ? 'acima' : deltaPct <= -8 ? 'abaixo' : 'media'

      linhas.push({
        date, day: dd,
        weekday: WEEKDAYS[wd],
        lucro: isFuture ? 0 : Math.round(lucro * 100) / 100,
        investimento: isFuture ? 0 : Math.round(investimento * 100) / 100,
        roas: isFuture ? 0 : Math.round(mer * 100) / 100,
        ticketMedio: isFuture || a.vendas === 0 ? 0 : Math.round((a.receita / a.vendas) * 100) / 100,
        vendas: isFuture ? 0 : a.vendas,
        receita: isFuture ? 0 : Math.round(a.receita * 100) / 100,
        cliques: isFuture ? 0 : cliquesPorDia.get(date) ?? 0,
        compras: isFuture ? 0 : a.vendas,
        // Hora de pico exige agregar `events` por hora; travessão é honesto.
        horarioPico: '—',
        vsHistorico: isFuture || media === 0 ? { status: 'media', pct: 0 } : { status, pct: deltaPct },
        isToday: date === diaHoje,
        isFuture,
      })
    }
    return linhas
  },

  async getChannelBreakdown(janela: Janela): Promise<ChannelBreakdown> {
    const client = db()
    const { current } = faixasDe(janela)
    const orders = await getPaidOrders(client, current.startISO, current.endISO)
    return channelBreakdown(orders.map(o => ({
      utmSource: o.utm_source,
      utmCampaign: o.utm_campaign,
      total: o.total,
    })))
  },

  async getRegionBreakdown(janela: Janela): Promise<RegionStat[]> {
    const client = db()
    const { current } = faixasDe(janela)
    const orders = await getPaidOrders(client, current.startISO, current.endISO)
    const agg = new Map<string, { orders: number; revenue: number }>()
    for (const o of orders) {
      const uf = o.shipping_state || 'Não informado'
      const cur = agg.get(uf) ?? { orders: 0, revenue: 0 }
      cur.orders += 1
      cur.revenue += o.total
      agg.set(uf, cur)
    }
    const total = orders.reduce((s, o) => s + o.total, 0)
    return [...agg.entries()]
      .map(([uf, v]) => ({
        uf, orders: v.orders, revenue: v.revenue,
        aov: v.orders > 0 ? v.revenue / v.orders : 0,
        share: total > 0 ? (v.revenue / total) * 100 : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue)
  },

  /**
   * Cancelados da janela (não pagos) e estornos do último mês fechado.
   *
   * O banco não guarda se um pedido cancelado chegou a ser pago, então os
   * cancelados da janela são tratados como o que quase sempre são: Pix/boleto
   * que expirou ou cartão recusado (em setembro, 159 cancelados contra ~15
   * estornos reais). A perda de verdade vem do extrato AppMax lançado no
   * Fechamento do Mês — a regra do fechamento oficial.
   */
  async getReturnsCost(janela: Janela): Promise<ReturnsCost> {
    const client = db()
    const { current } = faixasDe(janela)
    const [cancelados, fechamento] = await Promise.all([
      fetchAllRows<{ id: string; total: number | string | null }>((from, to) =>
        client.from('orders')
          .select('id, total')
          .eq('store_id', STORE_ID)
          .in('status', ['cancelled', 'canceled', 'refunded'])
          .gte('created_at', current.startISO).lt('created_at', current.endISO)
          .order('created_at', { ascending: true })
          .range(from, to)),
      ultimoFechamento(),
    ])
    const r = fechamento.resultado
    return {
      naoPagos: { orders: cancelados.length, value: cancelados.reduce((s, o) => s + num(o.total), 0) },
      estornosMes: {
        mes: fechamento.mes,
        valor: fechamento.perdasDigitadas ? r.efetivos.perdas.valor : null,
        receitaBruta: r.efetivos.receita_bruta.valor,
      },
    }
  },

  /** Compara "Compre 1 Leve 2" com a unidade avulsa e o order bump, com o custo oficial. */
  async getOfferComparison(janela: Janela): Promise<OfertaStat[]> {
    const client = db()
    const { current } = faixasDe(janela)
    const [orders, custos] = await Promise.all([
      getPaidOrders(client, current.startISO, current.endISO),
      getCustos(),
    ])
    const itens = await getOrderItems(client, orders.map(o => o.id))
    const razaoPorPedido = new Map(orders.map(o => [o.id, razaoPaga(o.subtotal, o.discount)]))

    return compararOfertas(itens.map(it => ({
      oferta: classificarOferta(it.product_title),
      orderId: it.order_id,
      paidRevenue: it.total * (razaoPorPedido.get(it.order_id) ?? 1),
      // Combo da Just Runner é 1 item com 3 óculos dentro.
      units: it.quantity * (classificarOferta(it.product_title) === 'combo' ? 3 : 1),
      unitCost: custoCadastrado(it.product_title, custos),
    })))
  },

  /**
   * ROAS e CPA como FAIXA, cruzando o investimento da Meta (com o tributo de
   * 13,8%) com a atribuição real dos pedidos. O número declarado pela Meta vem
   * junto só para expor a divergência — usá-lo sozinho superestima o retorno.
   */
  async getMidiaRange(janela: Janela): Promise<MidiaRange> {
    const client = db()
    const { current } = faixasDe(janela)
    const [insights, orders] = await Promise.all([
      fetchAllRows<Record<string, unknown>>((from, to) =>
        client.from('meta_ad_insights')
          .select('spend, meta_purchases, meta_purchase_value, date_start')
          .eq('store_id', STORE_ID)
          .eq('level', 'campaign')
          .gte('date_start', current.start)
          .lt('date_start', current.endExclusive)
          .order('date_start', { ascending: true })
          .range(from, to)),
      getPaidOrders(client, current.startISO, current.endISO),
    ])

    const spend = insights.reduce((s, r) => s + num(r.spend), 0) * fatorTributo
    const declaredRevenue = insights.reduce((s, r) => s + num(r.meta_purchase_value), 0)
    const declaredPurchases = insights.reduce((s, r) => s + (parseInt(String(r.meta_purchases ?? 0)) || 0), 0)

    // Instagram e Facebook são a Meta. Recuperação de carrinho não é venda de
    // anúncio, mesmo carregando a origem antiga; "Sem atribuição" vira o teto.
    let attributedRevenue = 0, attributedOrders = 0
    let unattributedRevenue = 0, unattributedOrders = 0
    for (const o of orders) {
      if (ehRecuperacao(o.utm_campaign)) continue
      const canal = canonicalChannel(o.utm_source)
      if (canal === 'Instagram' || canal === 'Facebook') {
        attributedRevenue += o.total; attributedOrders += 1
      } else if (canal === 'Sem atribuição') {
        unattributedRevenue += o.total; unattributedOrders += 1
      }
    }

    return midiaRange({
      spend, attributedRevenue, attributedOrders,
      unattributedRevenue, unattributedOrders,
      declaredRevenue, declaredPurchases,
    })
  },

  async getFunnel(janela: Janela): Promise<FunnelWindow> {
    const client = db()
    const { current } = faixasDe(janela)

    // Volumes diários e contagens por sessão olham os MESMOS dias completos.
    const [diario, unicos] = await Promise.all([
      client
        .from('daily_analytics')
        .select('date, sessions, product_views, add_to_carts, checkout_starts, orders, revenue')
        .eq('store_id', STORE_ID)
        .gte('date', current.start)
        .lt('date', current.endExclusive)
        .limit(400),  // ~60 dias: cabe numa página
      client.rpc('analise_suprema_funnel_sessions', {
        p_store_id: STORE_ID,
        p_inicio:   current.startISO,
        p_fim:      current.endISO,
      }),
    ])

    const rows: DailyAnalyticsRow[] = (diario.data ?? []).map(r => ({
      date: String(r.date),
      sessions: Number(r.sessions) || 0,
      productViews: Number(r.product_views) || 0,
      addToCarts: Number(r.add_to_carts) || 0,
      checkoutStarts: Number(r.checkout_starts) || 0,
      orders: Number(r.orders) || 0,
      revenue: num(r.revenue),
    }))

    // Sem a RPC o funil volta a contar por evento — marcado em `countedBy`.
    const linha = Array.isArray(unicos.data) ? unicos.data[0] : unicos.data
    if (unicos.error || !linha) return buildFunnel(rows)

    return buildFunnel(rows, {
      productViews:   Number(linha.product_views)   || 0,
      addToCarts:     Number(linha.add_to_carts)    || 0,
      checkoutStarts: Number(linha.checkout_starts) || 0,
    })
  },

  async getCustomerStats(): Promise<CustomerStats> {
    const client = db()
    const todos = await fetchAllRows<Record<string, unknown>>((from, to) =>
      client
        .from('customer_purchase_stats')
        .select('email, name, total_spent, orders_count, last_order_at, phone_whatsapp_link')
        .eq('store_id', STORE_ID)
        .order('email', { ascending: true })
        .range(from, to))
    const rows: CustomerRow[] = todos.map(r => ({
      email: String(r.email ?? ''),
      name: r.name ? String(r.name) : null,
      totalSpent: num(r.total_spent),
      ordersCount: parseInt(String(r.orders_count ?? 0)) || 0,
      lastOrderAt: r.last_order_at ? String(r.last_order_at) : null,
      whatsappLink: r.phone_whatsapp_link ? String(r.phone_whatsapp_link) : null,
    }))
    return customerStats(rows, new Date())
  },

  /**
   * Receita paga do mês corrente (Brasília) nos dias COMPLETOS — hoje fica de
   * fora para a projeção não tratar meio dia como dia cheio.
   */
  async getMonthRevenue(): Promise<{ revenue: number; dayOfMonth: number; daysInMonth: number }> {
    const client = db()
    const { range, hoje, diasCompletos, diasNoMes } = mesCorrenteBRT(new Date())
    const pedidos = diasCompletos > 0 ? await getPaidOrders(client, range.startISO, inicioDoDiaISO(hoje)) : []
    return {
      revenue: pedidos.reduce((s, o) => s + o.total, 0),
      dayOfMonth: diasCompletos,
      daysInMonth: diasNoMes,
    }
  },

  /**
   * Calendário ao vivo: dias da semana e dias 5/20 nos últimos 90 dias
   * completos, com MER (receita ÷ mídia com tributo); meses fechados do
   * histórico real e o mês corrente ao vivo.
   */
  async getCalendario(): Promise<Calendario> {
    const client = db()
    const hoje = diaBRT(new Date())
    const start = somarDias(hoje, -90)
    const [pedidos, gasto] = await Promise.all([
      getPaidOrders(client, inicioDoDiaISO(start), inicioDoDiaISO(hoje)),
      midiaPorDia(client, start, hoje),
    ])
    const receita = new Map<string, number>()
    for (const o of pedidos) {
      const d = diaBRT(o.created_at)
      receita.set(d, (receita.get(d) ?? 0) + o.total)
    }

    const semana = WEEKDAYS.map(() => ({ receita: 0, midia: 0, dias: 0 }))
    const pag = { receita: 0, midia: 0, dias: 0 }, demais = { receita: 0, midia: 0, dias: 0 }
    for (let d = start; d < hoje; d = somarDias(d, 1)) {
      const midia = gasto.get(d) ?? 0
      if (midia <= 0) continue  // dia sem mídia não diz nada sobre retorno
      const rec = receita.get(d) ?? 0
      const s = semana[new Date(`${d}T12:00:00Z`).getUTCDay()]
      s.receita += rec; s.midia += midia; s.dias += 1
      const alvo = ['05', '20'].includes(d.slice(8, 10)) ? pag : demais
      alvo.receita += rec; alvo.midia += midia; alvo.dias += 1
    }
    const ordem = [1, 2, 3, 4, 5, 6, 0]  // Seg..Dom
    const merPag = pag.midia > 0 ? pag.receita / pag.midia : null
    const merDemais = demais.midia > 0 ? demais.receita / demais.midia : null
    // Regra declarada: confirma só com 6+ ocorrências e diferença de pelo menos 10%.
    const confirmado = pag.dias >= 6 && merPag !== null && merDemais !== null && merPag >= merDemais * 1.1

    // Mês corrente ao vivo (dias completos).
    const { range, diasCompletos } = mesCorrenteBRT(new Date())
    let recMes = 0, midiaMes = 0
    for (let d = range.start; d < hoje; d = somarDias(d, 1)) {
      recMes += receita.get(d) ?? 0
      midiaMes += gasto.get(d) ?? 0
    }

    const meses: Calendario['meses'] = HISTORICO_MENSAL.map(h => {
      const midia = h.meta * fatorTributo + h.google
      return { mes: h.mes, label: rotuloMes(h.mes), receita: h.receita, midia, mer: midia > 0 ? h.receita / midia : null, fonte: 'historico' as const, parcial: false }
    })
    const mesAtual = range.start.slice(0, 7)
    if (diasCompletos > 0 && !meses.some(m => m.mes === mesAtual)) {
      meses.push({ mes: mesAtual, label: rotuloMes(mesAtual), receita: recMes, midia: midiaMes, mer: midiaMes > 0 ? recMes / midiaMes : null, fonte: 'ao vivo', parcial: true })
    }

    return {
      periodo: { start, endExclusive: hoje, dias: 90 },
      diasDaSemana: ordem.map(i => ({
        label: WEEKDAYS[i],
        avgSpend: semana[i].dias > 0 ? semana[i].midia / semana[i].dias : 0,
        mer: semana[i].midia > 0 ? semana[i].receita / semana[i].midia : null,
        dias: semana[i].dias,
      })),
      pagamento: {
        merDias5e20: merPag, merDemais, ocorrencias: pag.dias, confirmado,
        nota: confirmado
          ? `Nos últimos 90 dias, os dias 5 e 20 renderam MER ${merPag!.toFixed(2)}× contra ${merDemais!.toFixed(2)}× nos demais, com ${pag.dias} ocorrências.`
          : `Hipótese não confirmada: ${pag.dias} ocorrências dos dias 5 e 20 nos últimos 90 dias${merPag !== null && merDemais !== null ? `, MER ${merPag.toFixed(2)}× contra ${merDemais.toFixed(2)}× nos demais` : ''}. Para confirmar: 6+ ocorrências e retorno pelo menos 10% acima.`,
      },
      meses,
    }
  },

  /**
   * CPA de equilíbrio e de escala do último mês fechado, pelas regras do
   * Fechamento do Mês. Substitui as constantes fixas de julho (R$ 125 / R$ 92).
   */
  async getReferencias(): Promise<Referencias> {
    const f = await ultimoFechamento()
    const r = f.resultado
    const ticket = r.ticket.valor
    const equilibrio = r.cpaEquilibrio.valor
    const realizado = r.cpa.valor
    const escala = equilibrio !== null && realizado !== null && realizado > 0 ? Math.min(realizado, equilibrio) : null
    return {
      mes: f.mes,
      ticket,
      cpaEquilibrio: equilibrio,
      cpaEscala: escala,
      merEquilibrio: ticket && equilibrio && equilibrio > 0 ? ticket / equilibrio : null,
      merEscala: ticket && escala && escala > 0 ? ticket / escala : null,
      comFixos: f.fixosDigitados,
      estimado: r.usandoSistema.length > 0,
    }
  },

  /**
   * Vendas reais por campanha: pedidos pagos cuja `utm_campaign` é o nome da
   * campanha no Meta. É o que substitui as "compras" declaradas pelo Meta
   * (~2,7× infladas) nas abas de campanha. Recuperação de carrinho fica de fora.
   */
  async getVendasPorCampanha(startISO: string, endISO: string): Promise<VendasPorCampanha> {
    const orders = await getPaidOrders(db(), startISO, endISO)
    const out: VendasPorCampanha = {}
    for (const o of orders) {
      if (!o.utm_campaign || ehRecuperacao(o.utm_campaign)) continue
      const k = normalizarCampanha(o.utm_campaign)
      const cur = out[k] ?? { pedidos: 0, receita: 0 }
      cur.pedidos += 1
      cur.receita += o.total
      out[k] = cur
    }
    return out
  },

  /** Data do primeiro pedido pago — define até onde a comparação tem lastro. */
  async getFirstDataDate(): Promise<Date | null> {
    const client = db()
    const { data } = await client
      .from('orders').select('created_at')
      .eq('store_id', STORE_ID).in('status', PAID_STATUSES)
      .order('created_at', { ascending: true }).limit(1).maybeSingle()
    return data?.created_at ? new Date(String(data.created_at)) : null
  },

  /**
   * Série diária por campanha, de `meta_ad_insights`.
   *
   * O ROAS gravado é o declarado pela Meta e infla ~2,7×. Para saturação e
   * queda isso não distorce a conclusão, porque ambas olham a TENDÊNCIA da
   * mesma métrica, não o nível absoluto — o viés é constante e se cancela.
   */
  async getCampaignSeries(window: WindowDays): Promise<CampaignPoint[]> {
    const client = db()
    const { current } = windowRanges(window, new Date())
    const rows = await fetchAllRows<Record<string, unknown>>((from, to) =>
      client.from('meta_ad_insights')
        .select('campaign_id, campaign_name, date_start, spend, meta_purchase_value, meta_roas')
        .eq('store_id', STORE_ID)
        .eq('level', 'campaign')
        .gte('date_start', current.start)
        .lt('date_start', current.endExclusive)
        .order('date_start', { ascending: true })
        .range(from, to))

    const agg = new Map<string, CampaignPoint>()
    for (const r of rows) {
      const id = String(r.campaign_id ?? '')
      const date = String(r.date_start ?? '')
      if (!id || !date) continue
      const chave = `${id}|${date}`
      const cur = agg.get(chave) ?? {
        campaignId: id,
        campaignName: String(r.campaign_name ?? id),
        date, spend: 0, revenue: 0, roas: 0,
      }
      cur.spend += num(r.spend)
      cur.revenue += num(r.meta_purchase_value)
      agg.set(chave, cur)
    }
    return [...agg.values()].map(p => ({
      ...p,
      roas: p.spend > 0 ? p.revenue / p.spend : 0,
    }))
  },
}

/**
 * Fonte com memo de curta duração.
 *
 * Envolve cada método por (nome + argumento). Em caso de falha o cache é
 * descartado e a próxima abertura tenta de novo.
 */
export const supabaseSource = new Proxy(fonteCrua, {
  get(alvo, prop, receiver) {
    const valor = Reflect.get(alvo, prop, receiver)
    if (typeof valor !== 'function') return valor
    return (...args: unknown[]) =>
      comCache(`${String(prop)}:${JSON.stringify(args)}`, () =>
        (valor as (...a: unknown[]) => Promise<unknown>).apply(receiver, args))
  },
}) as typeof fonteCrua
