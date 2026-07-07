import { ProductCard } from './product-card'
import type { Product } from '@/lib/types'
import { unrollProductVariants } from '@/lib/utils'

interface ProductsGridProps {
  products: Product[]
  unroll?: boolean
}

export function ProductsGrid({ products, unroll = true }: ProductsGridProps) {
  // Unroll products into their variants to give "volume" to the catalog
  const unrolledProducts = unroll ? unrollProductVariants(products) : products

  if (unrolledProducts.length === 0) {
    return (
      <div
        style={{
          textAlign: 'center',
          padding: '64px 0',
          color: 'var(--color-muted)',
          fontSize: '14px',
          fontFamily: 'var(--font-montserrat), sans-serif',
        }}
      >
        Nenhum produto encontrado.
      </div>
    )
  }

  return (
    <div className="products-grid-layout">
      {unrolledProducts.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  )
}
