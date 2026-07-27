// Identifica se um pedido da Yampi é do catálogo real da Just Runner (site novo,
// Next.js) e não de pedidos legados de antes da migração (loja antiga, sem prefixo).
// Catálogo principal usa SKU prefixo "JR-" (scripts/sync-yampi-catalog.ts), Oferta
// Progressiva usa "JROP-" (scripts/sync-yampi-oferta-progressiva.ts) e os Combos
// usam "JRC-" (scripts/create-combos.ts) — ver src/lib/cart-store.ts pros mesmos
// prefixos. Prefixo novo de catálogo TEM que entrar aqui também: senão o pedido
// é classificado como legado e nunca chega em `orders`/`customers` no admin.
const CATALOG_SKU_PREFIXES = ['JR-', 'JROP-', 'JRC-']

export function isSiteOficialOrder(items: Array<{ item_sku?: string }>): boolean {
  return items.some((item) => {
    const sku = item.item_sku
    return !!sku && CATALOG_SKU_PREFIXES.some((prefix) => sku.startsWith(prefix))
  })
}
