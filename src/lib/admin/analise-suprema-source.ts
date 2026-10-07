// Interface de dados da Análise Suprema.
//
// Toda leitura da página passa por aqui. A implementação real vive em
// `analise-suprema-queries.ts`; trocar a fonte não deve exigir mudança de UI.

export type WindowDays = 1 | 3 | 7 | 14 | 30 | 60

export const WINDOWS: WindowDays[] = [1, 3, 7, 14, 30, 60]

export type ProductStat = {
  key: string            // chave normalizada, usada nos joins
  title: string          // título como aparece no pedido
  revenue: number
  units: number
  views: number
  addToCarts: number
  revenuePrev: number    // janela anterior de mesmo tamanho
  viewsPrev: number
  unitCost: number | null // null = sem custo (NUNCA tratar como 0)
  /** true quando o custo veio de estimativa por modelo, não de cadastro. */
  costIsEstimate: boolean
}

export type CampaignPoint = {
  campaignId: string
  campaignName: string
  date: string           // yyyy-mm-dd
  spend: number
  revenue: number
  roas: number
}

export type DayStat = {
  date: string           // yyyy-mm-dd
  weekday: string        // Seg..Dom
  revenue: number
  orders: number
  spend: number
  roas: number
  aov: number
}

export type MarginBreakdown = {
  revenue: number
  cogs: number
  fees: number
  shipping: number
  /** Custo fixo por pedido pago cobrado pela logística — não é o frete. */
  logistics: number
  marketing: number
  netProfit: number
  coveragePct: number     // % de itens com custo casado — nunca omitir na UI
  itemsWithoutCost: number
  itemsTotal: number
  /** Parte do CMV que se apoia em estimativa, não em custo cadastrado. */
  cogsEstimado: number
}

export type RegionStat = {
  uf: string
  orders: number
  revenue: number
  aov: number
  share: number
}

/**
 * Pedidos cancelados da janela e estornos do último mês fechado.
 *
 * O status `cancelled` do banco mistura duas coisas: Pix/boleto que expirou e
 * cartão recusado (dinheiro que nunca entrou) com estorno de pedido pago. O banco
 * não guarda se o pedido chegou a ser pago, então a janela mostra só os NÃO
 * pagos, como informação — não é perda. A perda real (estornos e chargebacks)
 * vem do extrato da AppMax, lançado no Fechamento do Mês: é a regra do
 * fechamento oficial (estorno entra no mês em que foi debitado).
 */
export type ReturnsCost = {
  naoPagos: { orders: number; value: number }
  estornosMes: {
    mes: string                 // YYYY-MM do último mês fechado
    valor: number | null        // null = não lançado no Fechamento do Mês
    receitaBruta: number        // base do impacto em pontos percentuais
  }
}

/**
 * Multiplicador do tributo de 13,8% sobre o Meta — o mesmo `TRIBUTO_MIDIA_PCT`
 * de cost-settings.ts (um teste garante que os dois não se separam). Fica aqui
 * porque as abas de campanha rodam no navegador e não podem importar o módulo de
 * custos, que fala com o banco.
 */
export const FATOR_TRIBUTO_META = 1.138

/** Meta de faturamento do mês, definida pelo Matheus. */
export const META_FATURAMENTO_MES = 200_000

/**
 * Referências de decisão de mídia, tiradas do último mês fechado pelas regras do
 * Fechamento do Mês (`fechamento.ts`), no lugar das constantes fixas de julho.
 *
 * - Equilíbrio: CPA em que o lucro do mês zera (inclui fixos quando foram
 *   lançados; sem eles é o equilíbrio marginal, sem estrutura).
 * - Escala: o CPA realizado no mês fechado — abaixo dele, cada pedido extra
 *   rende mais que a média do mês. Nunca acima do equilíbrio.
 * Todos os CPAs estão na base do gasto COM o tributo de 13,8% do Meta.
 */
export type Referencias = {
  mes: string
  ticket: number | null
  cpaEquilibrio: number | null
  cpaEscala: number | null
  merEquilibrio: number | null
  merEscala: number | null
  comFixos: boolean
  /** linhas do fechamento que vieram da sugestão do sistema, não de fatura/extrato */
  estimado: boolean
}

/** Linha da Visão Diária. Antes vivia no arquivo de dados fictícios. */
export interface DailyRow {
  date: string        // YYYY-MM-DD, dia de Brasília
  day: number
  weekday: string      // Seg..Dom
  lucro: number
  /** Investimento em mídia COM o tributo de 13,8% sobre o Meta. */
  investimento: number
  /** MER: receita ÷ investimento com tributo. */
  roas: number
  ticketMedio: number
  vendas: number
  receita: number
  cliques: number
  compras: number
  horarioPico: string
  vsHistorico: { status: 'acima' | 'media' | 'abaixo'; pct: number }
  isToday: boolean
  isFuture: boolean
}

/** Calendário calculado ao vivo (substitui WEEKDAY_STATS, PAYDAY_TEST e MONTH_STATS). */
export type Calendario = {
  periodo: { start: string; endExclusive: string; dias: number }
  diasDaSemana: { label: string; avgSpend: number; mer: number | null; dias: number }[]
  pagamento: { merDias5e20: number | null; merDemais: number | null; ocorrencias: number; confirmado: boolean; nota: string }
  meses: { mes: string; label: string; receita: number; midia: number; mer: number | null; fonte: 'historico' | 'ao vivo'; parcial: boolean }[]
}

/** Vendas reais (pedido pago com a UTM da campanha) por nome de campanha normalizado. */
export type VendasPorCampanha = Record<string, { pedidos: number; receita: number }>

export interface AnaliseSupremaSource {
  isReal: boolean
  getProductStats(janela: Janela): Promise<ProductStat[]>
  getCampaignSeries(window: WindowDays): Promise<CampaignPoint[]>
  getDayStats(window: WindowDays): Promise<DayStat[]>
  /**
   * A série diária inteira (janela máxima), de uma consulta só.
   *
   * As seis janelas do painel são recortes da mesma série — pedir uma consulta
   * por janela é buscar os mesmos pedidos seis vezes. Use `recortarJanela` para
   * derivar cada uma em memória.
   */
  getDaySeries(): Promise<DayStat[]>
  /**
   * Mês corrente dia a dia, no formato que as abas "Visão Diária" e "Supremo"
   * consomem. Substitui `getMonthlyMockData`, que simulava o mês inteiro.
   */
  getMonthlyDailyRows(hoje?: Date): Promise<DailyRow[]>
  getMarginBreakdown(janela: Janela): Promise<MarginBreakdown>
  getChannelBreakdown(janela: Janela): Promise<import('./analise-suprema-canais').ChannelBreakdown>
  getRegionBreakdown(janela: Janela): Promise<RegionStat[]>
  getFunnel(janela: Janela): Promise<import('./analise-suprema-funil').FunnelWindow>
  getCustomerStats(): Promise<import('./analise-suprema-clientes').CustomerStats>
  getReturnsCost(janela: Janela): Promise<ReturnsCost>
  getOfferComparison(janela: Janela): Promise<import('./analise-suprema-ofertas').OfertaStat[]>
  /** Mês corrente em Brasília: receita dos dias COMPLETOS (sem hoje), para projetar sem distorção. */
  getMonthRevenue(): Promise<{ revenue: number; dayOfMonth: number; daysInMonth: number }>
  getCalendario(): Promise<Calendario>
  getMidiaRange(janela: Janela): Promise<import('./analise-suprema-midia').MidiaRange>
  getFinancial(janela: Janela): Promise<import('./financial-breakdown').FinancialBreakdown>
  getFirstDataDate(): Promise<Date | null>
}

// ── Normalização de nome de produto ───────────────────────────────────────────
//
// `product_costs.model_name` e `order_items.product_title` seguem convenções
// diferentes: prefixos de canal ([SO], [OP], [BUMP]), espaços duplicados e
// pontuação final. Join literal casa apenas 3,9% dos itens; com esta
// normalização aplicada aos dois lados, 88,2%.
//
// Esta é a ÚNICA definição da regra — não reimplementar em query nem em SQL.

export function normalizeProductKey(raw: string | null | undefined): string {
  return (raw ?? '')
    .toLowerCase()
    // Dobra o acento em vez de destruir a letra: sem isto, "Vilão" virava
    // "vil o" e "Óculos" virava "culos", quebrando o casamento.
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/^\s*\[[^\]]{1,10}\]\s*/, '') // remove prefixo de canal ([SO], [OP], [BUMP], [JR], [JR OP], [JR COMBO])
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    // `product_costs` marca alguns cadastros com "(GERAL)" — é anotação de
    // cadastro, não parte do nome do produto.
    .replace(/\bgeral\b$/, '')
    // "Lentes Roxa" e "Lente Roxa" são o mesmo produto escrito de dois jeitos.
    .replace(/\blentes\b/g, 'lente')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Resolve a qual modelo pertence o título de um item de pedido.
 *
 * `products.name` guarda o modelo ("Permian"); `order_items.product_title`
 * guarda a variante ("[OP] Permian All Black"). São granularidades diferentes,
 * então o casamento é por prefixo — e o prefixo mais longo vence, para
 * "Romeo 1" não ser capturado por um eventual "Romeo".
 *
 * Devolve a chave do modelo, ou null quando nenhum modelo corresponde.
 */
export function matchModelKey(itemTitle: string, modelKeys: string[]): string | null {
  const alvo = normalizeProductKey(itemTitle)
  if (!alvo) return null
  let melhor: string | null = null
  for (const modelo of modelKeys) {
    if (!modelo) continue
    if (alvo === modelo || alvo.startsWith(`${modelo} `)) {
      if (melhor === null || modelo.length > melhor.length) melhor = modelo
    }
  }
  return melhor
}

// ── Janelas ───────────────────────────────────────────────────────────────────
//
// Mesma convenção do Dashboard (`date-range.ts`): janela de N dias = N dias
// COMPLETOS no horário de Brasília, terminando ontem. Hoje fica de fora porque
// está pela metade: comparado com dias cheios, puxava médias e variações para
// baixo. Antes a janela era "agora − N×24h" em UTC, e pedidos depois das 21h de
// Brasília caíam no dia seguinte.

const TZ = 'America/Sao_Paulo'

/** Data (YYYY-MM-DD) de um instante no horário de Brasília. */
export function diaBRT(instante: string | Date): string {
  const d = typeof instante === 'string' ? new Date(instante) : instante
  return d.toLocaleDateString('en-CA', { timeZone: TZ })
}

export function somarDias(data: string, n: number): string {
  const [y, m, d] = data.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10)
}

/** Meia-noite de Brasília daquele dia, como instante ISO. Brasil é UTC−3 fixo desde 2019. */
export function inicioDoDiaISO(data: string): string {
  return new Date(`${data}T00:00:00-03:00`).toISOString()
}

export type Range = { start: string; endExclusive: string; startISO: string; endISO: string }

function faixa(start: string, endExclusive: string): Range {
  return { start, endExclusive, startISO: inicioDoDiaISO(start), endISO: inicioDoDiaISO(endExclusive) }
}

/**
 * Janela atual e a janela de comparação.
 *
 * Janela de uma semana ou mais compara com o período imediatamente anterior:
 * já cobre todos os dias da semana, então o efeito de dia útil vs fim de
 * semana se dilui.
 *
 * Janela menor que 7 dias não pode fazer isso. Uma janela de 3 dias na terça
 * compararia Sáb–Seg contra Qua–Sex — dias diferentes, e em varejo o efeito de
 * dia da semana é grande o bastante para inverter o sinal. Nesses casos a
 * comparação desloca exatamente 7 dias, caindo nos MESMOS dias da semana
 * anterior. Deslocar 7 dias numa janela maior criaria sobreposição entre os
 * dois períodos, o que é pior que o problema original.
 */
export function windowRanges(window: WindowDays, now: Date): { current: Range; previous: Range } {
  const hoje = diaBRT(now)
  const deslocamento = window < 7 ? 7 : window
  const prevFim = somarDias(hoje, -deslocamento)
  return {
    current: faixa(somarDias(hoje, -window), hoje),
    previous: faixa(somarDias(prevFim, -window), prevFim),
  }
}

/** Período escolhido no filtro da página: dias de Brasília, fim exclusivo. */
export type Periodo = { start: string; endExclusive: string }

/** Janela fixa (1–60 dias completos até ontem) ou o período do filtro. */
export type Janela = WindowDays | Periodo

/**
 * Período atual e de comparação para qualquer janela.
 *
 * Para o período do filtro vale a mesma regra das janelas fixas: com uma semana
 * ou mais, compara com o período imediatamente anterior; com menos de 7 dias
 * (ex.: um dia só), compara com os MESMOS dias da semana anterior.
 */
export function faixasDe(janela: Janela, now: Date = new Date()): { current: Range; previous: Range } {
  if (typeof janela === 'number') return windowRanges(janela, now)
  const dias = Math.max(1, Math.round((Date.parse(`${janela.endExclusive}T12:00:00Z`) - Date.parse(`${janela.start}T12:00:00Z`)) / 86_400_000))
  const deslocamento = dias < 7 ? 7 : dias
  return {
    current: faixa(janela.start, janela.endExclusive),
    previous: faixa(somarDias(janela.start, -deslocamento), somarDias(janela.endExclusive, -deslocamento)),
  }
}

/** Mês corrente em Brasília: do dia 1 até amanhã (exclusivo), e quantos dias já fecharam. */
export function mesCorrenteBRT(now: Date): { range: Range; hoje: string; diasCompletos: number; diasNoMes: number } {
  const hoje = diaBRT(now)
  const inicio = `${hoje.slice(0, 7)}-01`
  const [y, m] = hoje.split('-').map(Number)
  return {
    range: faixa(inicio, somarDias(hoje, 1)),
    hoje,
    diasCompletos: Number(hoje.slice(8, 10)) - 1,
    diasNoMes: new Date(Date.UTC(y, m, 0)).getUTCDate(),
  }
}

/**
 * Recorta uma janela da série diária completa.
 *
 * Substitui uma consulta por janela: as seis janelas do painel olham o mesmo
 * conjunto de pedidos, só que com cortes diferentes. Buscar a maior uma vez e
 * fatiar em memória troca seis idas ao banco por uma.
 *
 * O corte usa a mesma fronteira de `windowRanges` para que as duas formas de
 * obter a janela deem exatamente o mesmo resultado.
 */
export function recortarJanela(serie: DayStat[], window: WindowDays, now: Date = new Date()): DayStat[] {
  const { current } = windowRanges(window, now)
  return serie.filter(d => d.date >= current.start && d.date < current.endExclusive)
}

/**
 * A janela de comparação tem histórico suficiente para sustentar a conta?
 *
 * Uma janela de 60 dias pode olhar para trás além do primeiro pedido do banco:
 * a janela anterior fica vazia e qualquer variação percentual calculada sobre
 * ela é artefato, não sinal.
 */
export function hasComparableHistory(window: WindowDays, now: Date, firstDataDate: Date): boolean {
  const { previous } = windowRanges(window, now)
  return Date.parse(previous.startISO) >= firstDataDate.getTime()
}

/** Nome de campanha para casar `utm_campaign` com o nome no Meta. */
export function normalizarCampanha(nome: string | null | undefined): string {
  return (nome ?? '').toLowerCase().replace(/\s+/g, ' ').trim()
}

/** Pedido recuperado por WhatsApp/e-mail: a campanha original foi sobrescrita, não é venda de anúncio. */
export function ehRecuperacao(utmCampaign: string | null | undefined): boolean {
  return /whatsapp|carrinho_abandonado|carrinho abandonado/i.test(utmCampaign ?? '')
}
