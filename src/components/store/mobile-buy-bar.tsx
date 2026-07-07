'use client'

import { ChevronDown } from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import type { Variant } from '@/lib/types'

interface Props {
  productName: string
  sortedVariants: Variant[]
  selectedVariantId: string
  selectedVariant: Variant
  onSelectVariant: (id: string) => void
  onAddToCart: () => void
  outOfStock: boolean
  isCartOpen: boolean
}

export function MobileBuyBar({
  productName,
  sortedVariants,
  selectedVariantId,
  selectedVariant,
  onSelectVariant,
  onAddToCart,
  outOfStock,
  isCartOpen,
}: Props) {
  if (isCartOpen) return null

  const hasMultipleVariants = sortedVariants.length > 1

  const variantSelector = hasMultipleVariants ? (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      <select
        value={selectedVariantId}
        onChange={(e) => onSelectVariant(e.target.value)}
        className="buy-bar-select"
      >
        {sortedVariants.map((v) => (
          <option key={v.id} value={v.id}>{v.name}</option>
        ))}
      </select>
      <ChevronDown size={12} color="#18181b" style={{ flexShrink: 0, pointerEvents: 'none', marginLeft: '2px' }} />
    </div>
  ) : (
    <span className="buy-bar-variant-name">{selectedVariant.name}</span>
  )

  return (
    <div className="buy-bar">
      {/* ── Mobile layout ── */}
      <div className="buy-bar-mobile">
        <div className="buy-bar-left">
          <span className="buy-bar-product-label">{productName}</span>
          {variantSelector}
          <span className="buy-bar-price">{formatPrice(selectedVariant.price)}</span>
        </div>
        <button onClick={onAddToCart} disabled={outOfStock} className="buy-bar-btn">
          {outOfStock ? 'ESGOTADO' : 'ADICIONAR'}
        </button>
      </div>

      {/* ── Desktop layout ── */}
      <div className="buy-bar-desktop">
        <span className="buy-bar-desktop-name">{productName}</span>
        <div className="buy-bar-desktop-divider" />
        <div className="buy-bar-desktop-center">
          {variantSelector}
        </div>
        <span className="buy-bar-desktop-price">{formatPrice(selectedVariant.price)}</span>
        <button onClick={onAddToCart} disabled={outOfStock} className="buy-bar-btn buy-bar-btn-desktop">
          {outOfStock ? 'ESGOTADO' : 'ADICIONAR AO CARRINHO'}
        </button>
      </div>
    </div>
  )
}
