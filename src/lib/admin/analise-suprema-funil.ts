// Funil de conversão.
//
// A fonte é `daily_analytics`, que já traz o funil diário calculado e é
// atualizada por cron. A 2.0 ignorava essa tabela e reagregava `orders` na mão,
// criando duas fontes de verdade para a receita do mesmo dia — e deixando a
// taxa de conversão, métrica-mãe do e-commerce, fora do painel.
//
// ATENÇÃO à unidade de contagem: `daily_analytics` guarda contagem de EVENTO.
// O Commerce Brain (`commerce-brain.ts`) conta o mesmo funil por SESSÃO ÚNICA,
// porque o "Compre 1 Leve 2" faz uma sessão disparar ~2 add_to_cart e o tráfego
// de bot infla view_content.
//
// Até 18/08/2026 este funil expunha só a contagem de evento e calculava as
// taxas em cima dela. Documentado como divergência aceita — mas a taxa por
// evento é a que decide onde mexer, e a promoção a distorce nos dois sentidos
// (infla ATC/view, deprime checkout/ATC), podendo apontar o gargalo errado.
// Agora as duas unidades convivem: `value` guarda o volume por evento,
// `uniqueValue` a contagem por sessão, e as taxas saem da segunda quando ela
// existe. `countedBy` diz qual está valendo, para a UI nunca deixar dúvida.

export type DailyAnalyticsRow = {
  date: string
  sessions: number
  productViews: number
  addToCarts: number
  checkoutStarts: number
  orders: number
  revenue: number
}

/**
 * Sessões distintas que chegaram a cada passo, no período inteiro.
 *
 * Vem de `events`, não de `daily_analytics`: a tabela diária só guarda contagem
 * de evento, e sessões distintas não somam entre dias (a mesma pessoa voltando
 * amanhã não é uma pessoa nova).
 */
export type SessionUniqueCounts = {
  productViews:   number
  addToCarts:     number
  checkoutStarts: number
}

export type FunnelStep = {
  key: 'sessions' | 'productViews' | 'addToCarts' | 'checkoutStarts' | 'orders'
  label: string
  /** Contagem de EVENTO — volume bruto. */
  value: number
  /** Contagem de SESSÃO ÚNICA, quando disponível. É a base das taxas. */
  uniqueValue: number | null
  /** Conversão a partir do passo anterior, em %. Null no primeiro passo. */
  rateFromPrev: number | null
  /** Quantos se perderam entre o passo anterior e este. */
  dropoff: number
}

export type FunnelWindow = {
  steps: FunnelStep[]
  sessions: number
  orders: number
  revenue: number
  conversionRate: number      // pedidos / sessões, em %
  aov: number
  /** Passo com a pior conversão relativa — onde o dinheiro está vazando. */
  bottleneck: FunnelStep | null
  /** Unidade que sustenta as taxas e o gargalo. A UI precisa dizer qual é. */
  countedBy: 'event' | 'session'
}

const LABELS: Record<FunnelStep['key'], string> = {
  sessions:       'Sessões',
  productViews:   'Viram produto',
  addToCarts:     'Adicionaram ao carrinho',
  checkoutStarts: 'Iniciaram checkout',
  orders:         'Compraram',
}

/**
 * Monta o funil somando os dias da janela.
 *
 * Sem `unicos`, tudo é contagem de EVENTO e o comportamento é o antigo:
 * `productViews` costuma ser MAIOR que `sessions` (uma sessão vê vários
 * produtos), então a taxa desse passo não é calculada — passaria de 100% e não
 * significaria nada.
 *
 * Com `unicos`, as taxas e o gargalo passam a sair da contagem por SESSÃO. Isso
 * importa porque o "Compre 1 Leve 2" faz uma sessão disparar ~2 add_to_cart: a
 * taxa de ATC sai inflada e a de checkout/ATC sai deprimida, e o gargalo pode
 * apontar para o passo errado. Quem decide onde mexer olha o gargalo — ele
 * precisa contar gente, não evento. O volume por evento continua exposto em
 * `value`, que é a leitura certa pra carga de tráfego.
 */
export function buildFunnel(rows: DailyAnalyticsRow[], unicos?: SessionUniqueCounts): FunnelWindow {
  const soma = (f: (r: DailyAnalyticsRow) => number) => rows.reduce((s, r) => s + f(r), 0)

  const sessions = soma(r => r.sessions)
  const productViews = soma(r => r.productViews)
  const addToCarts = soma(r => r.addToCarts)
  const checkoutStarts = soma(r => r.checkoutStarts)
  const orders = soma(r => r.orders)
  const revenue = soma(r => r.revenue)

  const taxa = (atual: number, anterior: number) =>
    anterior > 0 ? (atual / anterior) * 100 : null

  // Base das taxas: sessões distintas quando existem, evento como fallback.
  // `orders` já é contagem de pedido — não tem versão "por evento" pra corrigir.
  const base = unicos
    ? { productViews: unicos.productViews, addToCarts: unicos.addToCarts, checkoutStarts: unicos.checkoutStarts }
    : { productViews, addToCarts, checkoutStarts }

  const steps: FunnelStep[] = [
    { key: 'sessions', label: LABELS.sessions, value: sessions, uniqueValue: unicos ? sessions : null, rateFromPrev: null, dropoff: 0 },
    {
      key: 'productViews', label: LABELS.productViews, value: productViews,
      uniqueValue: unicos ? unicos.productViews : null,
      // Só é comparável com sessões quando conta sessão. Por evento, null.
      rateFromPrev: unicos ? taxa(base.productViews, sessions) : null,
      dropoff: unicos ? Math.max(0, sessions - base.productViews) : 0,
    },
    {
      key: 'addToCarts', label: LABELS.addToCarts, value: addToCarts,
      uniqueValue: unicos ? unicos.addToCarts : null,
      rateFromPrev: taxa(base.addToCarts, base.productViews),
      dropoff: Math.max(0, base.productViews - base.addToCarts),
    },
    {
      key: 'checkoutStarts', label: LABELS.checkoutStarts, value: checkoutStarts,
      uniqueValue: unicos ? unicos.checkoutStarts : null,
      rateFromPrev: taxa(base.checkoutStarts, base.addToCarts),
      dropoff: Math.max(0, base.addToCarts - base.checkoutStarts),
    },
    {
      key: 'orders', label: LABELS.orders, value: orders,
      uniqueValue: unicos ? orders : null,
      rateFromPrev: taxa(orders, base.checkoutStarts),
      dropoff: Math.max(0, base.checkoutStarts - orders),
    },
  ]

  // Gargalo = pior taxa entre os passos que têm taxa calculável.
  const comTaxa = steps.filter(s => s.rateFromPrev !== null && s.value >= 0)
  const bottleneck = comTaxa.length > 0
    ? comTaxa.reduce((pior, s) => (s.rateFromPrev! < pior.rateFromPrev! ? s : pior))
    : null

  return {
    steps,
    sessions,
    orders,
    revenue,
    conversionRate: sessions > 0 ? (orders / sessions) * 100 : 0,
    aov: orders > 0 ? revenue / orders : 0,
    bottleneck,
    countedBy: unicos ? 'session' : 'event',
  }
}
