// ROAS e CPA honestos.
//
// A Meta declara conversões por atribuição de visualização e reivindica vendas
// que não causou. Medido em 24/06–17/08 de 2026: ela declarou 862 compras num
// período em que a loja teve 813 pedidos no TOTAL, somando todos os canais —
// ou seja, mais vendas do que existiram. O ROAS declarado saiu 5,42x contra
// 2,57x pela atribuição real, e o CPA R$ 54,80 contra R$ 114,94, quase o dobro.
//
// Errar isso não é detalhe de relatório: R$ 54,80 parece folga confortável
// contra o breakeven de R$ 125 e convida a escalar; R$ 114,94 está colado nele.
//
// Como parte da receita não tem origem registrada, o número certo é uma FAIXA,
// não um valor. O piso considera só o que é comprovadamente Meta; o teto assume
// que todo o não atribuído também é. A verdade fica no meio, e declarar a faixa
// é mais honesto que fingir precisão.

export type MidiaRange = {
  spend: number
  /** Receita com origem Meta comprovada (Instagram + Facebook). */
  attributedRevenue: number
  /** Receita sem origem registrada — parte é Meta, parte não. */
  unattributedRevenue: number
  attributedOrders: number
  unattributedOrders: number

  roasMin: number
  roasMax: number
  cpaMin: number      // melhor caso: todo não atribuído é Meta
  cpaMax: number      // pior caso: nenhum é

  /** ROAS que a Meta declara, guardado só para mostrar a divergência. */
  declaredRoas: number | null
  declaredCpa: number | null
}

export type MidiaInput = {
  spend: number
  attributedRevenue: number
  attributedOrders: number
  unattributedRevenue: number
  unattributedOrders: number
  declaredRevenue?: number
  declaredPurchases?: number
}

export function midiaRange(i: MidiaInput): MidiaRange {
  const s = i.spend
  const roasMin = s > 0 ? i.attributedRevenue / s : 0
  const roasMax = s > 0 ? (i.attributedRevenue + i.unattributedRevenue) / s : 0
  const cpaMax = i.attributedOrders > 0 ? s / i.attributedOrders : 0
  const totalPed = i.attributedOrders + i.unattributedOrders
  const cpaMin = totalPed > 0 ? s / totalPed : 0

  return {
    spend: s,
    attributedRevenue: i.attributedRevenue,
    unattributedRevenue: i.unattributedRevenue,
    attributedOrders: i.attributedOrders,
    unattributedOrders: i.unattributedOrders,
    roasMin, roasMax, cpaMin, cpaMax,
    declaredRoas: i.declaredRevenue !== undefined && s > 0 ? i.declaredRevenue / s : null,
    declaredCpa: i.declaredPurchases ? s / i.declaredPurchases : null,
  }
}

/**
 * Quanto a Meta infla, em %. Null quando não há dado declarado.
 * Positivo = a Meta reivindica mais do que a atribuição real mostra.
 */
export function inflacaoDeclarada(r: MidiaRange): number | null {
  if (r.declaredRoas === null || r.roasMin <= 0) return null
  return (r.declaredRoas / r.roasMin - 1) * 100
}

/** O CPA no pior caso já ameaça o breakeven? É a leitura que importa para escalar. */
export function riscoDeEscala(r: MidiaRange, cpaBreakeven: number): 'seguro' | 'atencao' | 'critico' {
  if (r.cpaMax <= 0) return 'seguro'
  if (r.cpaMax >= cpaBreakeven) return 'critico'
  if (r.cpaMax >= cpaBreakeven * 0.85) return 'atencao'
  return 'seguro'
}
