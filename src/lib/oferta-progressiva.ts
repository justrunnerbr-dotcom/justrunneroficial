import { createServerSupabaseClient } from './supabase-server'
import type { OrderEntry } from '@/app/(store)/page'

const OFERTA_PROGRESSIVA_SKU_PREFIX = 'JHFOP-'

// A JHF Oferta Progressiva é um catálogo duplicado (mesmos produtos, SKUs
// novas com prefixo JHFOP-, preço R$175). Pra reaproveitar a curadoria da Home
// original (ordem de seções, banners) sem reescrevê-la, traduzimos cada
// variantId da Home pro variantId equivalente da Oferta Progressiva via SKU.
export async function resolveOfertaProgressivaOrder(
  orders: OrderEntry[]
): Promise<OrderEntry[]> {
  const supabase = await createServerSupabaseClient()
  const originalVariantIds = [...new Set(orders.map((o) => o.variantId))]

  const { data: originalVariants } = await supabase
    .from('variants')
    .select('id, sku')
    .in('id', originalVariantIds)

  const skuByOriginalId = new Map<string, string>(
    (originalVariants ?? []).map((v: { id: string; sku: string }) => [v.id, v.sku])
  )

  const opSkus = [...skuByOriginalId.values()].map(
    (sku) => OFERTA_PROGRESSIVA_SKU_PREFIX + sku.replace(/^JHF-/, '')
  )

  const { data: opVariants } = await supabase
    .from('variants')
    .select('id, sku, products(slug)')
    .in('sku', opSkus)

  const opByOpSku = new Map<string, { id: string; productSlug: string }>(
    (opVariants ?? []).map((v: { id: string; sku: string; products: { slug: string } | { slug: string }[] | null }) => {
      const product = Array.isArray(v.products) ? v.products[0] : v.products
      return [v.sku, { id: v.id, productSlug: product?.slug ?? '' }]
    })
  )

  return orders
    .map((entry) => {
      const originalSku = skuByOriginalId.get(entry.variantId)
      if (!originalSku) return undefined
      const opSku = OFERTA_PROGRESSIVA_SKU_PREFIX + originalSku.replace(/^JHF-/, '')
      const op = opByOpSku.get(opSku)
      if (!op || !op.productSlug) return undefined
      return { collectionSlug: 'oferta-progressiva', productSlug: op.productSlug, variantId: op.id }
    })
    .filter((e): e is OrderEntry => e !== undefined)
}
