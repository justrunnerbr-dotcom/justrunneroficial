import { PROGRESSIVE_OFFER_SKU_PREFIX } from './sku'

/**
 * Cupom RUN10 — espelho da configuração real do painel da Yampi (promocode
 * 5508958). O site não consulta a Yampi para saber se o cupom vale: ele
 * reproduz a regra aqui e manda `&promocode=RUN10` na URL do checkout, que é
 * quem aplica o desconto de verdade. Por isso este arquivo precisa continuar
 * batendo com o painel — se divergir, o carrinho promete um desconto que o
 * checkout recusa.
 *
 * Tudo abaixo foi medido no checkout real em 2026-08-08, não deduzido:
 *
 *   1 óculos principal (R$297) ............. −R$10  →  R$287
 *   2 principais (com o 2º grátis) ......... −R$10  →  R$287  (empilha)
 *   1 combo (R$327) ........................ −R$10  →  R$317
 *   1, 2, 3 ou 4 da Oferta Progressiva ..... recusado, em qualquer valor
 *   misto (1 principal + 1 OP) ............. −R$10  →  R$462
 *
 * O `min_value` de R$297 do painel NÃO explica sozinho a recusa da Oferta
 * Progressiva: 2 itens de OP fecham em exatos R$297 (o mesmo total de 1 óculos
 * principal, que passa) e mesmo assim são recusados, assim como 4 itens a
 * R$700. O cupom exclui os produtos da OP por produto, não por valor.
 */
export const CUPOM = {
  codigo: 'RUN10',

  /** Reais, valor FIXO. Na Yampi é `discount_type: "v"` com `value: "10.00"` —
   *  apesar do nome, o cupom não é de 10%. */
  valor: 10,

  /** `min_value` do painel. Hoje é inalcançável na prática: o item mais barato
   *  fora da Oferta Progressiva é R$297 (catálogo principal; combos são R$327),
   *  então qualquer carrinho elegível já nasce no mínimo. Fica explícito assim
   *  mesmo, para o dia em que entrar um produto mais barato. */
  minSubtotal: 297,

  /**
   * A Oferta Progressiva entra na conta do cupom?
   *
   * `false` = comportamento medido hoje na Yampi. Virar para `true` **somente
   * depois** de estender o cupom para a OP no painel e reconferir no checkout
   * real — se ligar antes, o carrinho oferece um desconto que o checkout nega.
   */
  cobreOfertaProgressiva: false,

  /** `end_at` do painel. Depois disso a Yampi recusa, então o site para de
   *  oferecer sozinho em vez de prometer o que não vai valer. */
  expiraEm: new Date('2026-08-31T16:19:00-03:00').getTime(),
} as const

type ItemCarrinho = { price: number; quantity: number; sku?: string | null }

function cobertoPeloCupom(item: ItemCarrinho): boolean {
  if (CUPOM.cobreOfertaProgressiva) return true
  return !item.sku?.startsWith(PROGRESSIVE_OFFER_SKU_PREFIX)
}

/** Soma só dos itens que o cupom cobre — é contra isto que o mínimo é medido.
 *  Usar o subtotal cheio faria o carrinho oferecer o cupom para um carrinho de
 *  Oferta Progressiva grande, que a Yampi recusa. */
export function subtotalElegivel(items: ItemCarrinho[]): number {
  return items
    .filter(cobertoPeloCupom)
    .reduce((soma, i) => soma + i.price * i.quantity, 0)
}

/** O cupom pode ser oferecido para este carrinho? */
export function cupomElegivel(
  items: ItemCarrinho[],
  agora: number = Date.now()
): boolean {
  if (agora >= CUPOM.expiraEm) return false
  return subtotalElegivel(items) >= CUPOM.minSubtotal
}
