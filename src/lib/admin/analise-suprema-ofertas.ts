// Ofertas da JHF e as regras de dinheiro que elas impõem.
//
// Confirmado pelo Matheus em 2026-08-14:
//
// - "Compre 1 Leve 2" (prefixo [SO], tabela R$ 297): o cliente escolhe 2 modelos
//   quaisquer do site (podem ser iguais). Paga por um, leva dois. No pedido, os
//   dois entram como item de R$ 297 e o segundo é zerado por desconto.
// - Unidade avulsa (prefixo [OP], R$ 175): teste recente. Preço por unidade
//   deliberadamente maior que o da promoção, para empurrar o cliente ao 1L2.
// - Order bump (prefixo [BUMP]): acessório no checkout, analisado à parte.
// - Sem prefixo: catálogo antigo, ignorado nas análises.
//
// - `product_costs.cost` é o custo do ÓCULOS FÍSICO pago ao fornecedor. Num
//   pedido 1L2, dois óculos saem do estoque: o custo é dobrado, a receita não.
// - Frete custa ~R$ 27,89 POR PEDIDO, não por óculos — dois óculos no mesmo
//   pedido custam praticamente o mesmo frete.
// - Pedido cancelado perde DOIS fretes (ida e devolução) e devolve o produto
//   ao estoque como custo em aberto até a troca com o fornecedor.

// Na Just Runner os prefixos são outros, com a mesma regra: [JR] = Compre 1
// Leve 2 (R$ 297), [JR OP] = unidade avulsa (R$ 175) e [JR COMBO] = kit de 3
// óculos (R$ 327), que a JHF não tem.

export type Oferta = 'leve2' | 'avulso' | 'combo' | 'bump' | 'legado'

export const OFERTA_LABEL: Record<Oferta, string> = {
  leve2:  'Compre 1 Leve 2',
  avulso: 'Unidade avulsa',
  combo:  'Combo (3 óculos)',
  bump:   'Order bump',
  legado: 'Catálogo antigo',
}

/** Classifica o item pela oferta, a partir do prefixo de canal no título. */
export function classificarOferta(productTitle: string | null | undefined): Oferta {
  const t = (productTitle ?? '').trim().toUpperCase()
  if (t.startsWith('[SO]') || t.startsWith('[JR]')) return 'leve2'
  if (t.startsWith('[OP]') || t.startsWith('[JR OP]')) return 'avulso'
  if (t.startsWith('[JR COMBO]')) return 'combo'
  if (t.startsWith('[BUMP]')) return 'bump'
  return 'legado'
}

/**
 * Quanto do preço de tabela foi de fato pago, entre 0 e 1.
 *
 * Num pedido 1L2, os itens somam R$ 594 de tabela e o cliente paga ~R$ 297 —
 * a razão fica em ~0,5. Sem isso, a receita por produto sai inflada em 2× e a
 * margem percentual vira ficção, que foi exatamente o erro da primeira versão.
 *
 * Usa subtotal e desconto (dinheiro de produto), nunca o total, que carrega
 * frete e distorceria o rateio.
 */
export function razaoPaga(subtotal: number, discountAmount: number): number {
  if (subtotal <= 0) return 1
  const liquido = subtotal - discountAmount
  if (liquido <= 0) return 0
  return Math.min(1, liquido / subtotal)
}

export type OfertaStat = {
  oferta: Oferta
  label: string
  orders: number          // pedidos que contêm a oferta
  units: number           // óculos físicos entregues
  revenue: number         // receita efetivamente paga
  cogs: number | null
  marginPct: number | null
  revenuePerUnit: number  // receita paga por óculos entregue
  costPerUnit: number | null
}

/**
 * Compara as ofertas entre si.
 *
 * A métrica que importa aqui é receita por ÓCULOS ENTREGUE, não por pedido:
 * é ela que revela que o 1L2 entrega o óculos a ~R$ 148 enquanto o avulso
 * cobra R$ 175 — e por isso o avulso converte pior, sem que a página tenha
 * qualquer problema.
 */
export function compararOfertas(
  itens: Array<{
    oferta: Oferta
    orderId: string
    paidRevenue: number
    units: number
    unitCost: number | null
  }>,
): OfertaStat[] {
  const agg = new Map<Oferta, {
    orders: Set<string>; units: number; revenue: number
    cogs: number; unitsComCusto: number
  }>()

  for (const i of itens) {
    if (i.oferta === 'legado') continue
    const cur = agg.get(i.oferta) ?? { orders: new Set<string>(), units: 0, revenue: 0, cogs: 0, unitsComCusto: 0 }
    cur.orders.add(i.orderId)
    cur.units += i.units
    cur.revenue += i.paidRevenue
    if (i.unitCost !== null) {
      cur.cogs += i.unitCost * i.units
      cur.unitsComCusto += i.units
    }
    agg.set(i.oferta, cur)
  }

  return [...agg.entries()].map(([oferta, v]) => {
    const temCusto = v.unitsComCusto > 0
    const cogs = temCusto ? v.cogs : null
    return {
      oferta,
      label: OFERTA_LABEL[oferta],
      orders: v.orders.size,
      units: v.units,
      revenue: v.revenue,
      cogs,
      marginPct: cogs !== null && v.revenue > 0 ? ((v.revenue - cogs) / v.revenue) * 100 : null,
      revenuePerUnit: v.units > 0 ? v.revenue / v.units : 0,
      costPerUnit: temCusto ? v.cogs / v.unitsComCusto : null,
    }
  }).sort((a, b) => b.revenue - a.revenue)
}
