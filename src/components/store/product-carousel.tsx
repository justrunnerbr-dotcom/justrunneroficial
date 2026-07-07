'use client'
import { useRef } from 'react'
import type { CSSProperties } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { Product } from '@/lib/types'
import { ProductCard } from './product-card'
import { unrollProductVariants } from '@/lib/utils'

interface ProductCarouselProps {
  title: string
  products: Product[]
  href?: string
  unroll?: boolean
  /** Scroll/swipe carousel on mobile too, instead of the static 2-col grid (opt-in, doesn't affect other usages) */
  mobileScroll?: boolean
  /** Vitrine fixa: mantém grid (não vira scroll horizontal) também no desktop, pra mostrar todos os produtos de uma vez */
  fixedGrid?: boolean
}

export function ProductCarousel({ title, products, href = '/colecao', unroll = true, mobileScroll = false, fixedGrid = false }: ProductCarouselProps) {
  const trackRef = useRef<HTMLDivElement>(null)

  const unrolledProducts = unroll ? unrollProductVariants(products) : products

  if (unrolledProducts.length === 0) return null

  // Show navigation arrows only when more products than fit in one viewport
  // (não faz sentido em vitrine fixa: não tem scroll horizontal pra navegar)
  const showArrows = !fixedGrid && unrolledProducts.length > 4

  function scroll(dir: 'left' | 'right') {
    if (!trackRef.current) return
    const amount = trackRef.current.clientWidth * 0.8
    trackRef.current.scrollBy({ left: dir === 'right' ? amount : -amount, behavior: 'smooth' })
  }

  return (
    <section style={{ padding: '48px 0 0' }}>
      <div className="page-width home-carousel-width">
        {/* ── Section header ── */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '24px',
            gap: '16px',
          }}
        >
          <h2
            style={{
              fontFamily: 'var(--font-poppins), sans-serif',
              fontWeight: 800,
              fontSize: 'clamp(18px, 3vw, 28px)',
              color: 'var(--color-heading)',
              lineHeight: 1.2,
            }}
          >
            {title}
          </h2>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            {showArrows && (
              <>
                <button
                  onClick={() => scroll('left')}
                  aria-label="Anterior"
                  style={arrowBtn}
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={() => scroll('right')}
                  aria-label="Próximo"
                  style={arrowBtn}
                >
                  <ChevronRight size={16} />
                </button>
              </>
            )}
            <Link
              href={href}
              style={{
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--color-heading)',
                fontFamily: 'var(--font-montserrat), sans-serif',
                borderBottom: '1px solid currentColor',
                paddingBottom: '1px',
                whiteSpace: 'nowrap',
                opacity: 0.8,
              }}
            >
              Ver tudo
            </Link>
          </div>
        </div>

        {/* ── Carousel track ── */}
        <div ref={trackRef} className={`product-carousel-grid${mobileScroll ? ' product-carousel-scroll' : ''}${fixedGrid ? ' product-carousel-fixed' : ''}`}>
          {unrolledProducts.map((product) => (
            <div key={product.id} className="carousel-item">
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

const arrowBtn: CSSProperties = {
  width: '32px',
  height: '32px',
  border: '1px solid var(--color-border)',
  borderRadius: '50%',
  background: '#fff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  padding: 0,
  transition: 'background 0.15s ease',
}
