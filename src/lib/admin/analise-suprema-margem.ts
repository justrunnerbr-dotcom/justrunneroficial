// Margem por produto.
//
// O painel agregado dizia "margem 64%" sem apontar quem puxava pra baixo —
// que era justamente a pergunta. Aqui a conta desce ao nível do produto.
//
// Funções puras, sem acesso a banco: a fonte entrega os números, isto calcula.

export type MarginInput = {
  key: string
  title: string
  revenue: number
  units: number
  unitCost: number | null   // null = sem custo cadastrado
}

export type ProductMargin = {
  key: string
  title: string
  revenue: number
  units: number
  cogs: number | null
  feesShare: number
  margin: number | null
  marginPct: number | null
  /**
   * Margem perdida em R$ por este produto render menos que a média da carteira.
   * Zero para quem está na média ou acima. É a métrica de "quem suga margem":
   * combina o quanto rende mal COM o quanto vende — um produto ruim que vende
   * pouco não é problema; um produto ruim que vende muito é.
   */
  drag: number
}

/**
 * Distribui as taxas do período entre os produtos e calcula a margem de cada um.
 *
 * A taxa de gateway é cobrada por PEDIDO, não por item. O rateio proporcional à
 * participação na receita é uma aproximação — em pedido com vários itens, a
 * atribuição exata não existe no dado. Está documentado para não passar por
 * precisão que não temos.
 *
 * Produto sem custo cadastrado tem `cogs`, `margin` e `marginPct` nulos, nunca
 * zero: tratar ausência como custo zero infla o lucro.
 */
export function productMargins(items: MarginInput[], totalFees: number): ProductMargin[] {
  const receitaTotal = items.reduce((s, i) => s + i.revenue, 0)

  const base = items.map(i => {
    const cogs = i.unitCost === null ? null : i.unitCost * i.units
    const feesShare = receitaTotal > 0 ? totalFees * (i.revenue / receitaTotal) : 0
    const margin = cogs === null ? null : i.revenue - cogs - feesShare
    const marginPct = margin === null || i.revenue <= 0 ? null : (margin / i.revenue) * 100
    return { ...i, cogs, feesShare, margin, marginPct }
  })

  // Média ponderada da carteira, considerando só quem tem custo conhecido —
  // incluir os sem custo distorceria a referência.
  const comCusto = base.filter(p => p.margin !== null && p.revenue > 0)
  const receitaComCusto = comCusto.reduce((s, p) => s + p.revenue, 0)
  const margemComCusto = comCusto.reduce((s, p) => s + (p.margin ?? 0), 0)
  const mediaPct = receitaComCusto > 0 ? (margemComCusto / receitaComCusto) * 100 : 0

  return base.map(p => ({
    ...p,
    drag: p.marginPct === null
      ? 0
      : Math.max(0, ((mediaPct - p.marginPct) / 100) * p.revenue),
  }))
}

/** Percentual de margem da carteira toda, ignorando produtos sem custo. */
export function portfolioMarginPct(margens: ProductMargin[]): number | null {
  const comCusto = margens.filter(p => p.margin !== null)
  const receita = comCusto.reduce((s, p) => s + p.revenue, 0)
  if (receita <= 0) return null
  return (comCusto.reduce((s, p) => s + (p.margin ?? 0), 0) / receita) * 100
}
