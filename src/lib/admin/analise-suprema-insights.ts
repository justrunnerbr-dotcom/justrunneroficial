// Motor de insights da Análise Suprema.
//
// Regras determinísticas transformam dados em sinais tipados; uma camada de
// redação converte cada sinal em prosa direta. Sem IA em tempo de renderização:
// a página precisa carregar rápido e dar sempre o mesmo resultado.

import type { ProductStat, CampaignPoint, DayStat, WindowDays } from './analise-suprema-source'

export type SignalKind =
  | 'produto_alta' | 'produto_queda' | 'produto_divergente'
  | 'melhor_dia' | 'pior_dia'
  | 'campanha_queda' | 'campanha_saturada' | 'anomalia_cpa'

export type Severity = 'good' | 'warn' | 'crit'

export type Signal = {
  kind: SignalKind
  severity: Severity
  window: WindowDays
  subject: string
  delta: number                     // variação percentual (42 = +42%)
  metrics: Record<string, number>
  priority: number                  // 0–100, ordena o feed
}

export type Narrative = { headline: string; body: string; actionHint?: string }

// ── Limiares ──────────────────────────────────────────────────────────────────

const ALTA = 1.25          // receita 25% acima da janela anterior
const QUEDA = 0.6          // receita 40% abaixo
const DIVERG_VIEWS = 1.3   // views 30% acima da mediana
const DIVERG_REV = 0.7     // receita 30% abaixo da mediana
// Saturação precisa de dias suficientes para separar gasto alto de baixo com
// massa nos dois lados. Abaixo de 9 o tercil tem 2 dias e vira ruído.
const MIN_DIAS_SATURACAO = 9

// Queda de retorno entre o terço mais barato e o mais caro que justifica falar
// em saturação. Calibrado contra 90 dias reais em 19/08: a 30% acusava 14 de 27
// campanhas (ruído), a 40% sobra o grupo em que o efeito é grande de verdade.
const QUEDA_SATURACAO = 0.40

// Campanha sem gasto nos últimos dias da janela está pausada, não saturada.
// Metade do que a regressão antiga acusava se chamava "OFF".
const DIAS_ATIVIDADE = 3

// Piso de relevância. Sem isto, um produto que saiu de 1 para 2 unidades emite
// sinal com a mesma legitimidade de um que moveu milhares de reais. Basta
// atender um dos dois critérios — volume OU dinheiro.
const MIN_UNIDADES = 3
const MIN_IMPACTO_BRL = 500

// Mesmo piso, aplicado a campanha. Sem ele, uma campanha que gastou R$ 18 e
// zerou o ROAS lidera a Manchete sobre uma que queimou milhares — foi
// exatamente o que aconteceu ao ligar o dado real da Meta.
const MIN_SPEND_CAMPANHA = 300

function relevante(units: number, impacto: number): boolean {
  return units >= MIN_UNIDADES || Math.abs(impacto) >= MIN_IMPACTO_BRL
}

// ── Utilidades ────────────────────────────────────────────────────────────────

/** Variação percentual protegida contra divisão por zero. */
export function pctChange(atual: number, anterior: number): number {
  if (anterior === 0) return atual > 0 ? 100 : 0
  return ((atual - anterior) / anterior) * 100
}

function mediana(valores: number[]): number {
  if (!valores.length) return 0
  const s = [...valores].sort((a, b) => a - b)
  const meio = Math.floor(s.length / 2)
  return s.length % 2 ? s[meio] : (s[meio - 1] + s[meio]) / 2
}

function prioridade(delta: number, severity: Severity): number {
  const bonus = severity === 'crit' ? 20 : severity === 'warn' ? 10 : 0
  return Math.min(100, Math.abs(delta) + bonus)
}

/**
 * Prioridade ponderada por dinheiro.
 *
 * Só percentual não serve: um produto que saiu de 1 para 2 unidades marca +100%
 * e passaria na frente de um que moveu milhares de reais. O peso maior fica no
 * impacto absoluto, e a variação percentual entra como desempate.
 */
function prioridadePorImpacto(delta: number, impacto: number, maxImpacto: number, severity: Severity): number {
  const bonus = severity === 'crit' ? 15 : severity === 'warn' ? 8 : 0
  const relativo = maxImpacto > 0 ? Math.abs(impacto) / maxImpacto : 0
  return Math.min(100, relativo * 65 + Math.min(Math.abs(delta), 100) * 0.25 + bonus)
}

// ── Detecção ──────────────────────────────────────────────────────────────────

export type DetectOptions = {
  /** Falso quando a janela de comparação não tem histórico — nenhum sinal de variação é emitido. */
  hasComparableHistory?: boolean
}

export function detectProductSignals(
  stats: ProductStat[],
  window: WindowDays,
  opts: DetectOptions = {},
): Signal[] {
  if (!stats.length) return []
  const comparavel = opts.hasComparableHistory !== false
  const sinais: Signal[] = []

  const medViews = mediana(stats.map(s => s.views))
  const medRev = mediana(stats.map(s => s.revenue))
  const maxImpacto = Math.max(1, ...stats.map(s => Math.abs(s.revenue - s.revenuePrev)))

  for (const p of stats) {
    const impacto = p.revenue - p.revenuePrev

    if (comparavel && relevante(p.units, impacto) && p.revenuePrev > 0 && p.revenue > p.revenuePrev * ALTA) {
      const delta = pctChange(p.revenue, p.revenuePrev)
      sinais.push({
        kind: 'produto_alta', severity: 'good', window, subject: p.title, delta,
        metrics: { receita: p.revenue, unidades: p.units, impacto },
        priority: prioridadePorImpacto(delta, impacto, maxImpacto, 'good'),
      })
    }

    if (comparavel && relevante(p.units, impacto) && p.revenuePrev > 0 && p.revenue < p.revenuePrev * QUEDA) {
      const delta = pctChange(p.revenue, p.revenuePrev)
      sinais.push({
        kind: 'produto_queda', severity: 'warn', window, subject: p.title, delta,
        metrics: { receita: p.revenue, receitaAnterior: p.revenuePrev, impacto },
        priority: prioridadePorImpacto(delta, impacto, maxImpacto, 'warn'),
      })
    }

    // Muita visita e pouca venda: o gargalo está na página ou no preço,
    // não na aquisição de tráfego.
    if (medViews > 0 && medRev > 0 && p.views > medViews * DIVERG_VIEWS && p.revenue < medRev * DIVERG_REV) {
      sinais.push({
        kind: 'produto_divergente', severity: 'warn', window, subject: p.title,
        delta: pctChange(p.revenue, medRev),
        metrics: { views: p.views, receita: p.revenue, addToCarts: p.addToCarts },
        priority: prioridade(40, 'warn'),
      })
    }
  }

  return sinais
}

/**
 * Melhor e pior dia da janela.
 *
 * O dia corrente é excluído de propósito: ele está incompleto e compará-lo com
 * dias fechados sempre o elegeria "pior dia". Passe `hoje` para fixar em teste.
 */
export function detectDaySignals(dias: DayStat[], window: WindowDays, hoje?: string): Signal[] {
  const hojeISO = hoje ?? new Date().toISOString().slice(0, 10)
  const comVenda = dias.filter(d => d.orders > 0 && d.date !== hojeISO)
  if (comVenda.length < 2) return []

  const melhor = comVenda.reduce((a, b) => (b.revenue > a.revenue ? b : a))
  const pior = comVenda.reduce((a, b) => (b.revenue < a.revenue ? b : a))
  const media = comVenda.reduce((s, d) => s + d.revenue, 0) / comVenda.length

  return [
    {
      kind: 'melhor_dia', severity: 'good', window,
      subject: `${melhor.date} (${melhor.weekday})`,
      delta: pctChange(melhor.revenue, media),
      metrics: { receita: melhor.revenue, pedidos: melhor.orders, ticket: melhor.aov },
      priority: prioridade(pctChange(melhor.revenue, media), 'good'),
    },
    {
      kind: 'pior_dia', severity: 'warn', window,
      subject: `${pior.date} (${pior.weekday})`,
      delta: pctChange(pior.revenue, media),
      metrics: { receita: pior.revenue, pedidos: pior.orders, ticket: pior.aov },
      priority: prioridade(pctChange(pior.revenue, media), 'warn'),
    },
  ]
}

/**
 * Retorno do terço mais caro contra o do terço mais barato da mesma campanha.
 *
 * Saturação é "investir mais rende menos". A versão anterior media isso com uma
 * regressão de ROAS sobre gasto diário e disparava com qualquer inclinação
 * negativa — metade das séries aleatórias satisfaz isso. Rodada contra 90 dias
 * reais em 19/08, acusava 16 das 39 campanhas elegíveis: um alerta que aponta
 * 41% da conta não ajuda a decidir nada.
 *
 * Comparar os extremos de gasto responde a pergunta direta, e o efeito medido
 * na conta é forte: 22 de 27 campanhas rendiam menos nos dias caros.
 *
 * Devolve null quando não há massa para comparar.
 */
export function quedaNaEscala(serie: CampaignPoint[]): {
  queda: number; gastoBaixo: number; gastoAlto: number; roasBaixo: number; roasAlto: number
} | null {
  const ativos = serie.filter(p => p.spend > 0)
  if (ativos.length < MIN_DIAS_SATURACAO) return null

  const porGasto = [...ativos].sort((a, b) => a.spend - b.spend)
  const t = Math.floor(porGasto.length / 3)
  if (t < 3) return null

  const agrega = (ps: CampaignPoint[]) => {
    const spend = ps.reduce((s, p) => s + p.spend, 0)
    const revenue = ps.reduce((s, p) => s + p.revenue, 0)
    return { spend, roas: spend > 0 ? revenue / spend : 0, media: spend / ps.length }
  }

  const baixo = agrega(porGasto.slice(0, t))
  const alto  = agrega(porGasto.slice(-t))

  // ROAS zero no terço barato não dá base de comparação; campanha que nunca
  // vendeu não está saturada, está morta.
  if (baixo.roas <= 0 || baixo.spend <= 0 || alto.spend <= 0) return null

  return {
    queda: (alto.roas - baixo.roas) / baixo.roas,
    gastoBaixo: baixo.media, gastoAlto: alto.media,
    roasBaixo: baixo.roas,   roasAlto: alto.roas,
  }
}

export function detectCampaignSignals(pontos: CampaignPoint[], window: WindowDays): Signal[] {
  if (!pontos.length) return []
  const sinais: Signal[] = []

  const maxGasto = Math.max(1, ...[...new Set(pontos.map(p => p.campaignId))].map(id =>
    pontos.filter(p => p.campaignId === id).reduce((s, p) => s + p.spend, 0)))

  // Referência de "agora" para saber quem ainda está no ar: o dia mais recente
  // com dado em qualquer campanha da janela.
  const ultimoDia = pontos.reduce((max, p) => (p.date > max ? p.date : max), pontos[0].date)
  const corteAtividade = new Date(new Date(`${ultimoDia}T00:00:00Z`).getTime() - DIAS_ATIVIDADE * 86_400_000)
    .toISOString().slice(0, 10)

  const porCampanha = new Map<string, CampaignPoint[]>()
  for (const p of pontos) {
    const lista = porCampanha.get(p.campaignId) ?? []
    lista.push(p)
    porCampanha.set(p.campaignId, lista)
  }

  for (const [, serie] of porCampanha) {
    const ordenada = [...serie].sort((a, b) => a.date.localeCompare(b.date))
    const nome = ordenada[0].campaignName
    const gastoTotal = ordenada.reduce((s, p) => s + p.spend, 0)
    if (gastoTotal < MIN_SPEND_CAMPANHA) continue

    // Saturação: os dias caros rendem menos que os baratos. Só para campanha
    // que ainda está no ar — pausada não precisa de recomendação de budget.
    const ativa = ordenada.some(p => p.spend > 0 && p.date >= corteAtividade)
    if (ativa) {
      const escala = quedaNaEscala(ordenada)
      if (escala && escala.queda <= -QUEDA_SATURACAO) {
        sinais.push({
          kind: 'campanha_saturada', severity: 'warn', window, subject: nome,
          delta: escala.queda * 100,
          metrics: {
            roasBaixo: escala.roasBaixo, roasAlto: escala.roasAlto,
            gastoBaixo: escala.gastoBaixo, gastoAlto: escala.gastoAlto,
            gastoTotal,
          },
          // Mesmo peso por impacto usado na queda: perder retorno queimando
          // muito dinheiro importa mais que num teste pequeno.
          priority: prioridadePorImpacto(escala.queda * 100, gastoTotal, maxGasto, 'warn'),
        })
      }
    }

    // Queda: ROAS do último dia bem abaixo da média dos anteriores.
    if (ordenada.length >= 2) {
      const ultimo = ordenada[ordenada.length - 1]
      const anteriores = ordenada.slice(0, -1)
      const mediaAnterior = anteriores.reduce((s, p) => s + p.roas, 0) / anteriores.length
      if (mediaAnterior > 0 && ultimo.roas < mediaAnterior * 0.65) {
        const delta = pctChange(ultimo.roas, mediaAnterior)
        sinais.push({
          kind: 'campanha_queda', severity: 'crit', window, subject: nome, delta,
          metrics: { roas: ultimo.roas, roasMedio: mediaAnterior, spend: ultimo.spend, gastoTotal },
          // Pondera pelo gasto: perder ROAS queimando muito dinheiro é mais
          // urgente que perder ROAS num teste pequeno.
          priority: prioridadePorImpacto(delta, gastoTotal, maxGasto, 'crit'),
        })
      }
    }
  }

  return sinais
}

// ── Redação ───────────────────────────────────────────────────────────────────

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const pct = (v: number) => `${Math.abs(v).toFixed(0)}%`
const dias = (w: WindowDays) => (w === 1 ? 'nas últimas 24 horas' : `nos últimos ${w} dias`)

export function narrate(s: Signal): Narrative {
  switch (s.kind) {
    case 'produto_alta':
      return {
        headline: `+${pct(s.delta)}`,
        body: `${s.subject} vendeu ${pct(s.delta)} a mais ${dias(s.window)} do que no período anterior, somando ${brl(s.metrics.receita ?? 0)}.`,
      }

    case 'produto_queda':
      return {
        headline: `−${pct(s.delta)}`,
        body: `${s.subject} caiu ${pct(s.delta)} em vendas ${dias(s.window)}: passou de ${brl(s.metrics.receitaAnterior ?? 0)} para ${brl(s.metrics.receita ?? 0)}.`,
        actionHint: 'Revisar produto',
      }

    case 'produto_divergente':
      return {
        headline: `${(s.metrics.views ?? 0).toLocaleString('pt-BR')} visitas`,
        body: `${s.subject} recebe muita visita e vende pouco. O problema está na página ou no preço, não na quantidade de gente chegando.`,
        actionHint: 'Revisar página do produto',
      }

    case 'melhor_dia':
      return {
        headline: brl(s.metrics.receita ?? 0),
        body: `Melhor dia do período foi ${s.subject}: ${s.metrics.pedidos ?? 0} pedidos, ticket médio de ${brl(s.metrics.ticket ?? 0)} — ${pct(s.delta)} acima da média.`,
      }

    case 'pior_dia':
      return {
        headline: brl(s.metrics.receita ?? 0),
        body: `Pior dia do período foi ${s.subject}: ${s.metrics.pedidos ?? 0} pedidos, ${pct(s.delta)} abaixo da média.`,
      }

    case 'campanha_queda':
      return {
        headline: `−${pct(s.delta)}`,
        body: `${s.subject} perdeu ${pct(s.delta)} de ROAS em relação aos dias anteriores, com ${brl(s.metrics.spend ?? 0)} investidos.`,
        actionHint: 'Revisar campanha',
      }

    case 'campanha_saturada':
      return {
        headline: `−${pct(s.delta)}`,
        // Números concretos em vez de "está saturada": o gestor precisa ver o
        // ponto em que o retorno virou para decidir onde segurar o budget.
        body: `${s.subject} rende menos quando escala: nos dias de ${brl(s.metrics.gastoBaixo ?? 0)}/dia o ROAS é ${(s.metrics.roasBaixo ?? 0).toFixed(2)}x, nos de ${brl(s.metrics.gastoAlto ?? 0)}/dia cai para ${(s.metrics.roasAlto ?? 0).toFixed(2)}x — ${pct(s.delta)} a menos. Abrir campanha nova tende a render mais que subir o budget desta.`,
        actionHint: 'Escalar na horizontal',
      }

    case 'anomalia_cpa':
      return {
        headline: `+${pct(s.delta)}`,
        body: `O CPA de ${s.subject} subiu ${pct(s.delta)} ${dias(s.window)}.`,
        actionHint: 'Verificar criativo',
      }
  }
}

export type FeedItem = Signal & { narrative: Narrative }

export function buildFeed(sinais: Signal[], limite = 8): FeedItem[] {
  return [...sinais]
    .sort((a, b) => b.priority - a.priority)
    .slice(0, limite)
    .map(s => ({ ...s, narrative: narrate(s) }))
}
