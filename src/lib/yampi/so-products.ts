// Identifica se um pedido da Yampi é do catálogo real da Just Runner (site novo,
// Next.js) e não de pedidos legados de antes da migração (loja antiga, sem prefixo).
// Catálogo principal usa SKU prefixo "JR-" (scripts/sync-yampi-catalog.ts), Oferta
// Progressiva usa "JROP-" (scripts/sync-yampi-oferta-progressiva.ts) — ver
// src/lib/cart-store.ts PROGRESSIVE_OFFER_SKU_PREFIX pro mesmo padrão.
export function isSiteOficialOrder(items: Array<{ item_sku?: string }>): boolean {
  return items.some((item) => {
    const sku = item.item_sku
    return !!sku && (sku.startsWith('JR-') || sku.startsWith('JROP-'))
  })
}
