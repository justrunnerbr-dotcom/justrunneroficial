export function formatPrice(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function buildProductSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
}

import type { Product } from '@/lib/types'
import { resolveVariantImages } from '@/lib/product-image'

export function unrollProductVariants(products: Product[]): Product[] {
  return products.flatMap(product => {
    if (!product.variants || product.variants.length <= 1) return [product]

    return product.variants.map((variant) => {
      const { primary, secondary } = resolveVariantImages(product.images, product.variants, variant.id)
      const images = [primary, secondary]
        .filter((img): img is NonNullable<typeof img> => img !== null)
        .map((img, i) => ({ ...img, position: i }))

      return {
        ...product,
        id: `${product.id}-${variant.id}`,
        name: `${product.name} - ${variant.name}`,
        images,
        variants: [variant, ...product.variants.filter(v => v.id !== variant.id)]
      }
    })
  })
}
