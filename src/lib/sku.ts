// Prefixos de SKU do catálogo da Just Runner. Cada linha de produto tem o seu,
// e é o prefixo — não o preço, nem a categoria — que decide de quais promoções
// o item participa. Módulo sem dependência de client/server de propósito: é
// consumido tanto pelo carrinho (client) quanto pelas páginas (server).
//
// JR-    catálogo principal  (scripts/sync-yampi-catalog.ts)
// JROP-  Oferta Progressiva  (scripts/sync-yampi-oferta-progressiva.ts)
// JRC-   Combos              (scripts/create-combos.ts + sync-yampi-combos.ts)
//
// Prefixo novo TEM que ser adicionado em CATALOG_SKU_PREFIXES (src/lib/yampi/
// so-products.ts), senão os pedidos dele são tratados como legado e nunca
// chegam no admin.
export const PROGRESSIVE_OFFER_SKU_PREFIX = 'JROP-'
export const COMBO_SKU_PREFIX = 'JRC-'

/**
 * O item entra na conta do "Compre 1 Leve 2" (2º óculos grátis)?
 *
 * Fonte única — usada pelo carrinho, pelo drawer e pelas páginas de produto,
 * que precisam concordar sobre quem é elegível. Combos são kit fechado de 3
 * óculos a R$327 e ficam de fora: 2 combos no carrinho dariam um combo inteiro
 * grátis. A Oferta Progressiva tem mecânica própria (desconto de R$53 no 2º).
 *
 * A mesma exclusão precisa existir nas regras buy_x_get_y da Yampi (elas são
 * escopadas por categoria), ou o desconto volta no checkout real mesmo com o
 * site bloqueando.
 */
export function isFreeGlassesEligible(item: { price: number; sku?: string | null }): boolean {
  return (
    item.price >= 90 &&
    !item.sku?.startsWith(PROGRESSIVE_OFFER_SKU_PREFIX) &&
    !item.sku?.startsWith(COMBO_SKU_PREFIX)
  )
}

export function isCombo(item: { sku?: string | null }): boolean {
  return !!item.sku?.startsWith(COMBO_SKU_PREFIX)
}
