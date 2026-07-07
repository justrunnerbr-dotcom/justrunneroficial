'use client'
import Link from 'next/link'
import Image from 'next/image'
import { formatPrice } from '@/lib/utils'
import type { Product } from '@/lib/types'
import { ShoppingBag } from 'lucide-react'

interface ProductCardProps {
  product: Product
}

export function ProductCard({ product }: ProductCardProps) {
  const sortedImages = [...product.images]
    .filter(img => !!img.url && img.url.trim() !== '')
    .sort((a, b) => a.position - b.position)
  const primaryImage   = sortedImages[0]
  const secondaryImage = sortedImages[1]

  // Find the best-priced variant with a real price
  const variantsWithPrice = product.variants.filter((v) => v.price > 0)
  const cheapestVariant =
    variantsWithPrice.length > 0
      ? variantsWithPrice.reduce((min, v) => (v.price < min.price ? v : min))
      : null

  const salePrice    = cheapestVariant?.price ?? null
  const comparePrice = cheapestVariant?.compare_price ?? null
  const variants     = product.variants.slice(0, 4)
  const variantParam = product.variants.length > 0 ? `?v=${product.variants[0].id}` : ''

  return (
    <Link href={`/produto/${product.slug}${variantParam}`} className="product-card" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>
      <div className="product-card-body" style={{ cursor: 'pointer' }}>
        {/* Image container */}
        <div
          className="product-card-media"
          style={{
            position: 'relative',
            aspectRatio: '4 / 3',
            overflow: 'hidden',
          }}
        >
          {primaryImage ? (
            <>
              <div className="product-card-img-primary">
                <Image
                  src={primaryImage.url}
                  alt={primaryImage.alt ?? product.name}
                  fill
                  priority={false}
                  style={{ objectFit: 'contain' }}
                  sizes="(max-width: 749px) 50vw, 25vw"
                />
              </div>
              {secondaryImage && (
                <div className="product-card-img-secondary">
                  <Image
                    src={secondaryImage.url}
                    alt={secondaryImage.alt ?? product.name}
                    fill
                    priority={false}
                    style={{ objectFit: 'contain' }}
                    sizes="(max-width: 749px) 50vw, 25vw"
                  />
                </div>
              )}
            </>
          ) : (
            <div style={{ width: '100%', height: '100%', background: 'transparent' }} />
          )}
        </div>


        {/* Info */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

          {/* Nome */}
          <h3
            className="product-card-name"
            style={{
              fontSize: '15px',
              fontWeight: 700,
              color: '#18181b',
              fontFamily: 'var(--font-montserrat), sans-serif',
            }}
          >
            {product.name}
          </h3>

          {/* Preços */}
          <div className="product-card-price-row" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {comparePrice != null && (
              <span style={{ fontSize: '11px', color: '#4b5563', textDecoration: 'line-through', fontWeight: 600 }}>
                {formatPrice(comparePrice)}
              </span>
            )}
            {salePrice != null && (
              <span style={{ fontSize: '16px', fontWeight: 800, color: '#18181b' }}>
                {formatPrice(salePrice)}
              </span>
            )}
          </div>


          {/* Botão Escolher */}
          <div className="product-card-choose-btn" style={{
            border: '1px solid #e4e4e7',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: '#18181b',
            fontSize: '11px',
            fontWeight: 700,
            background: 'transparent',
            width: 'fit-content',
            transition: 'background 0.2s',
          }}>
            <ShoppingBag size={14} strokeWidth={2.5} />
            ESCOLHER
          </div>

        </div>
      </div>
    </Link>
  )
}
