'use client'
import { useState } from 'react'
import NextImage from 'next/image'
import { Minus, Plus } from 'lucide-react'
import { useCartStore } from '@/lib/cart-store'
import { buildSingleCheckoutUrl } from '@/lib/yampi'
import { formatPrice } from '@/lib/utils'
import { trackAddToCart, trackBeginCheckout } from '@/lib/gtm'
import type { Variant, Image as ProductImage } from '@/lib/types'

interface VariantSelectorProps {
  productId: string
  productName: string
  variants: Variant[]
  images: ProductImage[]
}

const TRUST = [
  'Frete Grátis para todo Brasil',
  'Tamanho Adulto Unissex',
  'Envios em até 24hrs',
  'Parcelamento Sem Juros',
]

export function VariantSelector({ productId, productName, variants, images }: VariantSelectorProps) {
  const [selectedId, setSelectedId] = useState(variants[0]?.id ?? null)
  const [qty, setQty] = useState(1)
  const { addItem } = useCartStore()

  const selected = variants.find((v) => v.id === selectedId) ?? variants[0]
  const yampiAlias = process.env.NEXT_PUBLIC_YAMPI_ALIAS ?? ''

  const getImageUrl = (): string | null => {
    if (!selected) return null
    return images.find((img) => img.variant_id === selected.id)?.url ?? images[0]?.url ?? null
  }

  const handleAddToCart = () => {
    if (!selected) return
    addItem({
      variantId: selected.id,
      productId,
      productName,
      variantName: selected.name,
      price: selected.price,
      imageUrl: getImageUrl(),
      quantity: qty,
      yampiProductId: selected.yampi_product_id,
    })
    trackAddToCart({ id: selected.id, name: productName, price: selected.price, quantity: qty })
  }

  const handleBuyNow = () => {
    if (!selected) return
    const url = buildSingleCheckoutUrl(yampiAlias, selected.yampi_product_id)
    if (!url) return
    trackBeginCheckout([{ id: selected.id, name: productName, price: selected.price, quantity: qty }])
    window.location.href = url
  }

  if (!selected) return null

  const hasCompare = selected.compare_price !== null && selected.compare_price > selected.price
  const discountPct = hasCompare
    ? Math.round((1 - selected.price / (selected.compare_price as number)) * 100)
    : null
  const installment = selected.price >= 90 ? Math.ceil((selected.price / 6) * 100) / 100 : null

  return (
    <div>
      {/* ── Price block ── */}
      <div style={{ marginBottom: '24px' }}>
        {hasCompare && (
          <p style={{ fontSize: '14px', color: '#999', textDecoration: 'line-through', marginBottom: '2px', fontFamily: 'var(--font-montserrat), sans-serif' }}>
            {formatPrice(selected.compare_price as number)}
          </p>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '4px' }}>
          <span style={{ fontSize: '32px', fontWeight: 800, fontFamily: 'var(--font-poppins), sans-serif', color: 'var(--color-heading)', lineHeight: 1.1 }}>
            {formatPrice(selected.price)}
          </span>
          {discountPct !== null && (
            <span style={{ background: '#e00000', color: '#fff', fontSize: '12px', fontWeight: 800, padding: '3px 9px', borderRadius: '4px', fontFamily: 'var(--font-poppins), sans-serif' }}>
              {discountPct}%OFF
            </span>
          )}
        </div>
        {installment !== null && (
          <p style={{ fontSize: '13px', color: 'var(--color-muted)', fontFamily: 'var(--font-montserrat), sans-serif' }}>
            6x de {formatPrice(installment)} sem juros
          </p>
        )}
      </div>

      {/* ── Variant pills ── */}
      {variants.length > 1 && (
        <div style={{ marginBottom: '24px' }}>
          <p style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px', color: 'var(--color-heading)', fontFamily: 'var(--font-poppins), sans-serif' }}>
            COR: <span style={{ fontWeight: 500, textTransform: 'none' }}>{selected.name}</span>
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {variants.map((v) => {
              const outOfStock = v.stock === 0
              const isSelected = v.id === selectedId
              const variantImage = images.find(img => img.variant_id === v.id)
              return (
                <button
                  key={v.id}
                  onClick={() => {
                    setSelectedId(v.id)
                    if (variantImage) {
                      window.dispatchEvent(new CustomEvent('variantImageSelected', { detail: variantImage.id }))
                    }
                  }}
                  title={outOfStock ? `${v.name} (Esgotado)` : v.name}
                  style={{
                    width: '44px',
                    height: '44px',
                    padding: 0,
                    borderRadius: '50%',
                    border: isSelected ? '2px solid var(--color-heading)' : '1px solid var(--color-border)',
                    background: 'transparent',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    opacity: outOfStock ? 0.6 : 1,
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative'
                  }}
                >
                  {variantImage?.url ? (
                    <NextImage
                      src={variantImage.url}
                      alt={v.name}
                      fill
                      style={{ objectFit: 'cover' }}
                      sizes="48px"
                    />
                  ) : (
                    <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--color-heading)', fontFamily: 'var(--font-poppins), sans-serif' }}>
                      {v.name.substring(0, 3).toUpperCase()}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Logo notice ── */}
      <div
        style={{
          background: '#fffbeb',
          border: '1px solid #fcd34d',
          borderRadius: '8px',
          padding: '12px 16px',
          marginBottom: '20px',
          display: 'flex',
          gap: '10px',
          alignItems: 'flex-start',
        }}
      >
        <span style={{ fontSize: '18px', flexShrink: 0, lineHeight: 1.3 }}>🚨</span>
        <div>
          <p style={{ fontSize: '13px', fontWeight: 700, color: '#92400e', fontFamily: 'var(--font-poppins), sans-serif', marginBottom: '2px' }}>
            Óculos possuem logo?
          </p>
          <p style={{ fontSize: '13px', color: '#78350f', fontFamily: 'var(--font-montserrat), sans-serif', lineHeight: 1.5 }}>
            Todos os óculos acompanham os emblemas das marcas!
          </p>
        </div>
      </div>

      {/* ── Quantity ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
        <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--color-heading)', fontFamily: 'var(--font-poppins), sans-serif', whiteSpace: 'nowrap' }}>
          Quantidade
        </span>
        <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--color-border)', borderRadius: '6px', overflow: 'hidden' }}>
          <button
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            aria-label="Diminuir quantidade"
            style={{ width: '36px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-heading)', borderRight: '1px solid var(--color-border)' }}
          >
            <Minus size={13} strokeWidth={2} />
          </button>
          <span style={{ minWidth: '44px', textAlign: 'center', fontSize: '15px', fontWeight: 700, fontFamily: 'var(--font-poppins), sans-serif', color: 'var(--color-heading)' }}>
            {qty}
          </span>
          <button
            onClick={() => setQty((q) => q + 1)}
            aria-label="Aumentar quantidade"
            style={{ width: '36px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-heading)', borderLeft: '1px solid var(--color-border)' }}
          >
            <Plus size={13} strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* ── CTAs ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
        {/* Primary: Adicionar ao Carrinho */}
        <button
          onClick={handleAddToCart}
          style={{ width: '100%', padding: '16px 24px', background: 'var(--color-heading)', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '15px', fontWeight: 700, fontFamily: 'var(--font-poppins), sans-serif', textTransform: 'uppercase', letterSpacing: '0.5px', cursor: 'pointer', transition: 'opacity 0.2s' }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85' }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
        >
          Adicionar ao Carrinho
        </button>

        {/* Secondary: Comprar Agora */}
        <button
          onClick={handleBuyNow}
          style={{ width: '100%', padding: '15px 24px', background: 'transparent', color: 'var(--color-heading)', border: '2px solid var(--color-heading)', borderRadius: '6px', fontSize: '15px', fontWeight: 700, fontFamily: 'var(--font-poppins), sans-serif', textTransform: 'uppercase', letterSpacing: '0.5px', cursor: 'pointer', transition: 'background 0.2s, color 0.2s' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-heading)'; e.currentTarget.style.color = '#fff' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-heading)' }}
        >
          Comprar Agora
        </button>
      </div>

      {/* ── Trust badges ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingTop: '20px', borderTop: '1px solid var(--color-border)' }}>
        {TRUST.map((label) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'var(--color-heading)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="10" height="10" viewBox="0 0 12 10" fill="none">
                <path d="M1 5l3.5 3.5L11 1" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-heading)', fontFamily: 'var(--font-montserrat), sans-serif' }}>
              {label}
            </span>
          </div>
        ))}
      </div>

      {/* SKU */}
      <p style={{ fontSize: '11px', color: 'var(--color-muted)', marginTop: '16px', fontFamily: 'var(--font-montserrat), sans-serif' }}>
        SKU: {selected.sku}
      </p>
    </div>
  )
}
