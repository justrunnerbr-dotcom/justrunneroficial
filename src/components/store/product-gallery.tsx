'use client'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import type { Image as ProductImage } from '@/lib/types'

interface ProductGalleryProps {
  images: ProductImage[]
  productName: string
}

export function ProductGallery({ images, productName }: ProductGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const sorted = [...images].sort((a, b) => a.position - b.position)
  const active = sorted[activeIndex]
  const total = sorted.length

  const prev = () => setActiveIndex((i) => (i - 1 + total) % total)
  const next = () => setActiveIndex((i) => (i + 1) % total)

  useEffect(() => {
    const handler = (e: Event) => {
      const imgId = (e as CustomEvent<string>).detail;
      const idx = sorted.findIndex(img => img.id === imgId);
      if (idx !== -1) setActiveIndex(idx);
    };
    window.addEventListener('variantImageSelected', handler);
    return () => window.removeEventListener('variantImageSelected', handler);
  }, [sorted]);

  return (
    <div>
      {/* Main image */}
      <div
        style={{
          background: '#ffffff',
          overflow: 'hidden',
          aspectRatio: '1 / 1',
          position: 'relative',
          marginBottom: '10px',
          border: 'none',
        }}
      >
        {active ? (
          <Image
            src={active.url}
            alt={active.alt ?? productName}
            fill
            priority
            style={{ objectFit: 'contain', padding: '16px' }}
            sizes="(max-width: 750px) 100vw, 50vw"
          />
        ) : (
          <div style={{ width: '100%', height: '100%', background: '#f5f5f5' }} />
        )}

        {/* Prev/Next arrows */}
        {total > 1 && (
          <>
            <button
              onClick={prev}
              aria-label="Imagem anterior"
              style={{
                position: 'absolute',
                left: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'rgba(255,255,255,0.9)',
                border: '1px solid var(--color-border)',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: '16px',
                color: 'var(--color-heading)',
                boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
              }}
            >
              ‹
            </button>
            <button
              onClick={next}
              aria-label="Próxima imagem"
              style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'rgba(255,255,255,0.9)',
                border: '1px solid var(--color-border)',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: '16px',
                color: 'var(--color-heading)',
                boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
              }}
            >
              ›
            </button>
          </>
        )}

        {/* Counter */}
        {total > 1 && (
          <div
            style={{
              position: 'absolute',
              bottom: '10px',
              right: '12px',
              background: 'rgba(0,0,0,0.45)',
              color: '#fff',
              fontSize: '11px',
              fontWeight: 600,
              padding: '3px 8px',
              borderRadius: '12px',
              fontFamily: 'var(--font-montserrat), sans-serif',
              letterSpacing: '0.3px',
            }}
          >
            {activeIndex + 1} / {total}
          </div>
        )}
      </div>

      {/* Thumbnails */}
      {total > 1 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${Math.min(total, 6)}, 1fr)`,
            gap: '6px',
          }}
        >
          {sorted.map((img, i) => (
            <button
              key={img.id}
              onClick={() => setActiveIndex(i)}
              aria-label={`Ver imagem ${i + 1}`}
              style={{
                background: '#ffffff',
                overflow: 'hidden',
                aspectRatio: '1 / 1',
                position: 'relative',
                border: i === activeIndex
                  ? '2px solid var(--color-heading)'
                  : '1px solid var(--color-border)',
                cursor: 'pointer',
                padding: 0,
                transition: 'border-color 0.15s ease',
              }}
            >
              <Image
                src={img.url}
                alt={img.alt ?? `${productName} ${i + 1}`}
                fill
                style={{ objectFit: 'contain', padding: '4px' }}
                sizes="80px"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
