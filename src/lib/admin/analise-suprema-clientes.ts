// Dimensão de cliente: novo vs recorrente, LTV e risco de perda.
//
// `customer_purchase_stats` tem ~3.000 linhas com total gasto, número de
// pedidos e data do último pedido. A 2.0 não tinha uma única métrica de
// cliente — e receita de recompra é a alavanca de crescimento mais barata que
// existe, porque não passa por mídia paga.

export type CustomerRow = {
  email: string
  name: string | null
  totalSpent: number
  ordersCount: number
  lastOrderAt: string | null
  whatsappLink: string | null
}

export type AtRiskCustomer = {
  email: string
  name: string | null
  totalSpent: number
  ordersCount: number
  daysSinceLastOrder: number
  whatsappLink: string | null
}

export type CustomerStats = {
  totalCustomers: number
  repeatCustomers: number
  repeatRatePct: number
  avgLtv: number
  avgOrdersPerCustomer: number
  /** Receita que veio de quem já tinha comprado antes. */
  revenueFromRepeat: number
  revenueFromSingle: number
  atRisk: AtRiskCustomer[]
}

const DIA = 86_400_000

/**
 * Dias sem comprar a partir dos quais um cliente recorrente entra na lista de
 * recuperação.
 *
 * Comecei com um critério relativo (mediana da base × 1,5) e ele se anula
 * sozinho: quando a maior parte da base está dormente, a mediana sobe junto e
 * ninguém fica "anormalmente sumido" — justamente quando o problema é maior.
 * Um limiar absoluto é mais grosseiro, mas é robusto e explicável em uma frase.
 *
 * 45 dias é ponto de partida, não verdade: a loja tem histórico curto e o ciclo
 * de recompra de óculos ainda não está medido. Revisar quando houver base.
 */
export const DIAS_PARA_RISCO = 45

export function customerStats(rows: CustomerRow[], now: Date, diasParaRisco = DIAS_PARA_RISCO): CustomerStats {
  if (!rows.length) {
    return {
      totalCustomers: 0, repeatCustomers: 0, repeatRatePct: 0,
      avgLtv: 0, avgOrdersPerCustomer: 0,
      revenueFromRepeat: 0, revenueFromSingle: 0, atRisk: [],
    }
  }

  const recorrentes = rows.filter(r => r.ordersCount >= 2)
  const unicos = rows.filter(r => r.ordersCount < 2)

  const totalGasto = rows.reduce((s, r) => s + r.totalSpent, 0)
  const totalPedidos = rows.reduce((s, r) => s + r.ordersCount, 0)

  const diasDesde = (iso: string | null): number | null =>
    iso ? Math.floor((now.getTime() - Date.parse(iso)) / DIA) : null

  const atRisk: AtRiskCustomer[] = recorrentes
    .map(r => ({ r, dias: diasDesde(r.lastOrderAt) }))
    .filter((x): x is { r: CustomerRow; dias: number } => x.dias !== null && x.dias > diasParaRisco)
    .map(({ r, dias }) => ({
      email: r.email,
      name: r.name,
      totalSpent: r.totalSpent,
      ordersCount: r.ordersCount,
      daysSinceLastOrder: dias,
      whatsappLink: r.whatsappLink,
    }))
    // Ordena por quanto o cliente já gastou: perder quem gasta mais dói mais.
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, 10)

  return {
    totalCustomers: rows.length,
    repeatCustomers: recorrentes.length,
    repeatRatePct: (recorrentes.length / rows.length) * 100,
    avgLtv: totalGasto / rows.length,
    avgOrdersPerCustomer: totalPedidos / rows.length,
    revenueFromRepeat: recorrentes.reduce((s, r) => s + r.totalSpent, 0),
    revenueFromSingle: unicos.reduce((s, r) => s + r.totalSpent, 0),
    atRisk,
  }
}
