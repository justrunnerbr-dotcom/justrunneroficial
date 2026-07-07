import type { Image as ProductImage, Variant } from './types'

export interface ResolvedCardImages {
  primary: ProductImage | null
  secondary: ProductImage | null
}

/**
 * Single source of truth for "which image(s) represent this product/variant
 * card". Used by the Home grid/carousels so mobile and desktop never diverge
 * on which photo is picked for a given variant.
 *
 * Priority:
 * 1. Images explicitly linked to the variant (variant_id match)
 * 2. 1:1 fallback — product has exactly one image per variant, use same index
 * 3. Any other real image belonging to the product
 * 4. null — caller renders a safe placeholder, never an <img> with empty src
 */
export function resolveVariantImages(
  productImages: ProductImage[],
  variants: Variant[],
  variantId: string | null,
): ResolvedCardImages {
  const real = [...productImages]
    .filter(img => !!img.url && img.url.trim() !== '')
    .sort((a, b) => a.position - b.position)

  if (real.length === 0) return { primary: null, secondary: null }

  if (variantId) {
    const byVariant = real.filter(img => img.variant_id === variantId)
    if (byVariant.length > 0) {
      return { primary: byVariant[0], secondary: byVariant[1] ?? null }
    }

    if (variants.length > 0 && variants.length === real.length) {
      const idx = variants.findIndex(v => v.id === variantId)
      const img = idx >= 0 ? real[idx] : undefined
      if (img) return { primary: img, secondary: null }
    }
  }

  return { primary: real[0], secondary: real[1] ?? null }
}
