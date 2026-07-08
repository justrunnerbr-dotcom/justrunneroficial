'use client'
import Link from 'next/link'
import { useState, useMemo, useRef, useEffect } from 'react'
import type { CSSProperties } from 'react'
import { Minus, Plus, Sun, Glasses, Smile, Gem, Truck, ShieldCheck, RefreshCcw, Lock } from 'lucide-react'
import { useCartStore } from '@/lib/cart-store'
import { buildSingleCheckoutUrl } from '@/lib/yampi'
import { formatPrice } from '@/lib/utils'
import { trackAddToCart, trackBeginCheckout } from '@/lib/gtm'
import { metaViewContent, metaAddToCart, metaInitiateCheckout } from '@/lib/meta'
import { track } from '@/lib/analytics/client'
import { getVariantSwatchColors } from '@/lib/variant-colors'
import type { Product, Variant, Image as ProductImage } from '@/lib/types'
import { ProductionVideosSection } from './production-videos-section'
import { UrgencyTimer } from './urgency-timer'
import { MobileBuyBar } from './mobile-buy-bar'

function extractSubSlug(url: string): string | null {
  const match = url.match(/\/public\/products\/[^/]+\/([^/]+)\//)
  return match?.[1] ?? null
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Mn}/gu, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
}

// Priority 1: variant_id FK on the image row (set during import for 365/370 images).
// Priority 2: URL sub-folder slug matching as fallback for the remaining 5 images.
function buildVariantImageMap(
  variants: Variant[],
  images: ProductImage[],
  productSlug: string,
): Map<string, ProductImage[]> {
  const map = new Map<string, ProductImage[]>()

  for (const variant of variants) {
    const byId = images
      .filter((img) => img.variant_id === variant.id)
      .sort((a, b) => a.position - b.position)
    if (byId.length > 0) {
      map.set(variant.id, byId)
      continue
    }
    const expectedSubSlug = `${productSlug}-${slugify(variant.name)}`
    const bySlug = images
      .filter((img) => extractSubSlug(img.url) === expectedSubSlug)
      .sort((a, b) => a.position - b.position)
    map.set(variant.id, bySlug)
  }

  return map
}

const TRUST = [
  'Frete Grátis para todo Brasil',
  'Tamanho Adulto Unissex',
  'Envios em até 24hrs',
  'Parcelamento Sem Juros',
]

interface Props {
  product: Product
  initialVariantId?: string
}

export function ProductClient({ product, initialVariantId }: Props) {
  const sortedVariants = useMemo(
    () => [...product.variants].sort((a, b) => a.position - b.position),
    [product.variants],
  )

  const variantImageMap = useMemo(
    () => buildVariantImageMap(sortedVariants, product.images, product.slug),
    [sortedVariants, product.images, product.slug],
  )

  // galleryItems: todas as fotos de cada variação, em sequência (foto de produto + extras,
  // como fotos de uso/rosto) antes de passar pra próxima variação. Setas/swipe navegam
  // foto a foto; selecionar a cor pula pra primeira foto (capa) daquela variação.
  const galleryItems = useMemo(() => {
    if (sortedVariants.length > 1) {
      return sortedVariants.flatMap((v) => {
        const variantImgs = variantImageMap.get(v.id) ?? []
        const imgs = variantImgs.length > 0 ? variantImgs : (product.images[0] ? [product.images[0]] : [])
        return imgs.map((img) => ({
          variantId: v.id,
          variantName: v.name,
          imageUrl: img.url?.trim() ?? '',
          imageAlt: img.alt ?? v.name,
        }))
      })
    }
    const singleId = sortedVariants[0]?.id ?? ''
    const variantImgs = variantImageMap.get(singleId) ?? []
    const imgs = variantImgs.length > 0 ? variantImgs : product.images
    return imgs.map(img => ({
      variantId: singleId,
      variantName: sortedVariants[0]?.name ?? '',
      imageUrl: img.url?.trim() ?? '',
      imageAlt: img.alt ?? product.name,
    }))
  }, [sortedVariants, variantImageMap, product.images, product.name])

  const [selectedVariantId, setSelectedVariantId] = useState(() => {
    if (initialVariantId && sortedVariants.some(v => v.id === initialVariantId)) return initialVariantId
    const first = sortedVariants.find((v) => (variantImageMap.get(v.id) ?? []).length > 0)
    return first?.id ?? sortedVariants[0]?.id ?? ''
  })
  const [galleryIndex, setGalleryIndex] = useState(() => {
    if (initialVariantId) {
      const idx = galleryItems.findIndex(item => item.variantId === initialVariantId)
      if (idx >= 0) return idx
    }
    return 0
  })
  const [qty, setQty] = useState(1)
  const [isLightboxOpen, setIsLightboxOpen] = useState(false)

  const { addItem, isOpen: isCartOpen } = useCartStore()
  const swatchRef = useRef<HTMLDivElement>(null)
  const touchStartXRef = useRef<number>(0)
  const touchStartYRef = useRef<number>(0)

  const selectedVariant = sortedVariants.find((v) => v.id === selectedVariantId) ?? sortedVariants[0]

  // Lightbox: Escape fecha, setas do teclado navegam
  useEffect(() => {
    if (!isLightboxOpen) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsLightboxOpen(false)
      if (e.key === 'ArrowRight') navigateGallery('next')
      if (e.key === 'ArrowLeft') navigateGallery('prev')
    }
    window.addEventListener('keydown', handleKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [isLightboxOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  // ViewContent: fires on mount and on every variant change
  useEffect(() => {
    if (!selectedVariant) return
    metaViewContent({
      content_ids: [selectedVariant.sku],
      content_name: product.name,
      content_category: product.collection?.name ?? 'Óculos',
      value: selectedVariant.price,
      currency: 'BRL',
      content_type: 'product',
    })
    track({
      event_type:   'view_content',
      product_slug: product.slug,
      product_id:   product.id,
      variant_id:   selectedVariant.id,
      value:        selectedVariant.price,
    })
  }, [selectedVariantId]) // eslint-disable-line react-hooks/exhaustive-deps

  const activeItem = galleryItems[galleryIndex] ?? galleryItems[0]
  const galleryLength = galleryItems.length
  const showSwatchArrows = sortedVariants.length > 5

  function selectVariant(variantId: string) {
    setSelectedVariantId(variantId)
    const idx = galleryItems.findIndex(item => item.variantId === variantId)
    setGalleryIndex(idx >= 0 ? idx : 0)
  }

  function scrollSwatches(dir: 'left' | 'right') {
    swatchRef.current?.scrollBy({ left: dir === 'right' ? 68 : -68, behavior: 'smooth' })
  }

  function navigateGallery(dir: 'prev' | 'next') {
    if (galleryLength < 2) return
    const next = dir === 'next'
      ? (galleryIndex + 1) % galleryLength
      : (galleryIndex - 1 + galleryLength) % galleryLength
    setGalleryIndex(next)
    const item = galleryItems[next]
    if (item && item.variantId !== selectedVariantId) {
      setSelectedVariantId(item.variantId)
    }
  }

  const yampiAlias = process.env.NEXT_PUBLIC_YAMPI_ALIAS ?? ''
  const hasCompare = selectedVariant
    ? selectedVariant.compare_price !== null && selectedVariant.compare_price > selectedVariant.price
    : false
  const discountPct =
    hasCompare && selectedVariant
      ? Math.round((1 - selectedVariant.price / (selectedVariant.compare_price as number)) * 100)
      : null
  const installment =
    selectedVariant?.price && selectedVariant.price >= 90
      ? Math.ceil((selectedVariant.price / 6) * 100) / 100
      : null
  
  // Ignora verificação de estoque local para permitir vendas contínuas
  const outOfStock = false

  function handleAddToCart() {
    if (!selectedVariant) return
    addItem({
      variantId: selectedVariant.id,
      productId: product.id,
      productName: product.name,
      variantName: selectedVariant.name,
      price: selectedVariant.price,
      imageUrl: activeItem?.imageUrl ?? null,
      quantity: qty,
      yampiProductId: selectedVariant.yampi_product_id,
      sku: selectedVariant.sku,
    })
    trackAddToCart({ id: selectedVariant.id, name: product.name, price: selectedVariant.price, quantity: qty })
    metaAddToCart({
      content_ids: [selectedVariant.sku],
      content_name: product.name,
      content_category: product.collection?.name ?? 'Óculos',
      value: selectedVariant.price * qty,
      currency: 'BRL',
      num_items: qty,
    })
    track({ event_type: 'add_to_cart', product_slug: product.slug, product_id: product.id, variant_id: selectedVariant.id, value: selectedVariant.price * qty })
  }

  function handleBuyNow() {
    if (!selectedVariant) return
    const url = buildSingleCheckoutUrl(yampiAlias, selectedVariant.yampi_product_id ?? selectedVariant.sku)
    if (!url) return
    trackBeginCheckout([{ id: selectedVariant.id, name: product.name, price: selectedVariant.price, quantity: qty }])
    metaInitiateCheckout({
      content_ids: [selectedVariant.sku],
      value: selectedVariant.price * qty,
      currency: 'BRL',
      num_items: qty,
    })
    track({ event_type: 'initiate_checkout', product_slug: product.slug, product_id: product.id, variant_id: selectedVariant.id, value: selectedVariant.price * qty })
    window.location.href = url
  }

  if (!selectedVariant) return null

  return (
    <>
    <div className="product-layout">
      {/* ── Gallery — left column ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minWidth: 0 }}>
        
        {/* Main hero image */}
        {activeItem?.imageUrl && (
          <div
            className="product-gallery-main"
            style={{
              width: '100%',
              background: '#ffffff',
              overflow: 'hidden',
              borderRadius: '12px',
              position: 'relative',
            }}
            onTouchStart={(e) => {
              touchStartXRef.current = e.touches[0].clientX
              touchStartYRef.current = e.touches[0].clientY
            }}
            onTouchEnd={(e) => {
              const dx = e.changedTouches[0].clientX - touchStartXRef.current
              const dy = e.changedTouches[0].clientY - touchStartYRef.current
              if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
                navigateGallery(dx < 0 ? 'next' : 'prev')
              }
            }}
          >
            <img
              src={activeItem.imageUrl}
              alt={activeItem.imageAlt}
              loading="eager"
              onError={(e) => { e.currentTarget.style.opacity = '0' }}
              onClick={() => setIsLightboxOpen(true)}
              // Zoom/corte só no mobile via CSS (.product-gallery-zoom, media query) — no
              // desktop a caixa 1:1 já bate com a foto quadrada, então fica como era antes.
              // Fotos de rosto (UGC) são retrato, não fundo branco — o zoom corta a cabeça.
              className={
                /kit/i.test(activeItem.variantName) || /rosto/i.test(activeItem.imageUrl)
                  ? undefined
                  : 'product-gallery-zoom'
              }
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                display: 'block',
                boxSizing: 'border-box',
                padding: '8px',
                cursor: 'zoom-in',
              }}
            />
          </div>
        )}

        {/* Lightbox — clique na imagem principal expande pra melhor visualização */}
        {isLightboxOpen && activeItem?.imageUrl && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Imagem ampliada do produto"
            onClick={() => setIsLightboxOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.92)',
              zIndex: 300,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '24px',
            }}
            onTouchStart={(e) => {
              touchStartXRef.current = e.touches[0].clientX
              touchStartYRef.current = e.touches[0].clientY
            }}
            onTouchEnd={(e) => {
              const dx = e.changedTouches[0].clientX - touchStartXRef.current
              const dy = e.changedTouches[0].clientY - touchStartYRef.current
              if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
                navigateGallery(dx < 0 ? 'next' : 'prev')
              }
            }}
          >
            <button
              onClick={() => setIsLightboxOpen(false)}
              aria-label="Fechar imagem ampliada"
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#fff',
                fontSize: '20px',
                lineHeight: 1,
              }}
            >
              ✕
            </button>

            {galleryLength > 1 && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); navigateGallery('prev') }}
                  aria-label="Imagem anterior"
                  style={{
                    position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
                    background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%',
                    width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', color: '#fff', fontSize: '22px',
                  }}
                >
                  ‹
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); navigateGallery('next') }}
                  aria-label="Próxima imagem"
                  style={{
                    position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                    background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%',
                    width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', color: '#fff', fontSize: '22px',
                  }}
                >
                  ›
                </button>
              </>
            )}

            <img
              src={activeItem.imageUrl}
              alt={activeItem.imageAlt}
              onClick={(e) => e.stopPropagation()}
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain',
                cursor: 'default',
              }}
            />
          </div>
        )}

        {/* Horizontal Thumbnail strip */}
        {galleryLength > 1 && (
          <div
            style={{
              display: 'flex',
              gap: '12px',
              width: '100%',
              overflowX: 'auto',
              paddingBottom: '12px',
            }}
            className="horizontal-scrollbar"
          >
            {galleryItems.map((item, idx) => {
              const isSelected = idx === galleryIndex
              return (
                <button
                  key={item.variantId + idx}
                  onClick={() => {
                    setGalleryIndex(idx)
                    if (item.variantId !== selectedVariantId) {
                      setSelectedVariantId(item.variantId)
                    }
                  }}
                  style={{
                    width: '92px',
                    height: '92px',
                    flexShrink: 0,
                    padding: 0,
                    border: isSelected ? '2px solid #18181b' : '2px solid transparent',
                    background: '#ffffff',
                    cursor: 'pointer',
                    position: 'relative',
                    overflow: 'hidden',
                    borderRadius: '8px',
                    transition: 'border-color 0.2s ease',
                  }}
                >
                  <img
                    src={item.imageUrl}
                    alt={item.imageAlt}
                    loading="lazy"
                    onError={(e) => { e.currentTarget.style.opacity = '0' }}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                      display: 'block',
                      padding: '2px',
                      boxSizing: 'border-box',
                    }}
                  />
                </button>
              )
            })}
          </div>
        )}

      </div>

      {/* ── Info panel — right column ── */}
      <div className="product-info-panel">
        
        <h1 style={{ fontSize: '28px', fontWeight: 400, color: '#18181b', lineHeight: 1.2, fontFamily: 'var(--font-poppins), sans-serif' }}>
          Óculos {product.name}
        </h1>

        {/* ── Price block ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px', fontWeight: 800, color: '#18181b', fontFamily: 'var(--font-poppins), sans-serif' }}>
              {formatPrice(selectedVariant.price)}
            </span>
            {hasCompare && (
              <span style={{ fontSize: '14px', color: '#a1a1aa', textDecoration: 'line-through' }}>
                {formatPrice(selectedVariant.compare_price as number)}
              </span>
            )}
            {discountPct !== null && (
              <span style={{ background: '#000000', color: '#ffffff', fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px' }}>
                {discountPct}% OFF
              </span>
            )}
          </div>
          {installment !== null && (
            <p style={{ fontSize: '12px', color: '#52525b' }}>
              6x {formatPrice(installment)} sem juros
            </p>
          )}
        </div>

        {/* ── Circular variant swatches ── */}
        {sortedVariants.length > 1 && (
          <div>
            <p style={{ fontSize: '13px', color: '#18181b', marginBottom: '8px' }}>
              Cor: <span style={{ color: '#52525b' }}>{selectedVariant.name}</span>
            </p>

            <div
              style={{
                display: 'flex',
                gap: '6px',
                flexWrap: 'wrap',
              }}
            >
              {sortedVariants.map((variant) => {
                const { primary, secondary } = getVariantSwatchColors(variant.name)
                const isSelected = variant.id === selectedVariantId
                return (
                  <button
                    key={variant.id}
                    onClick={() => selectVariant(variant.id)}
                    title={variant.name}
                    aria-label={variant.name}
                    style={{
                      flex: '0 0 20px',
                      width: '20px',
                      height: '20px',
                      padding: 0,
                      border: '1px solid #e4e4e7',
                      outline: isSelected ? '2px solid #18181b' : '1px solid transparent',
                      outlineOffset: '1px',
                      borderRadius: '50%',
                      background: `linear-gradient(90deg, ${primary} 50%, ${secondary} 50%)`,
                      cursor: 'pointer',
                      transition: 'outline-color 0.15s ease',
                      flexShrink: 0,
                    }}
                  />
                )
              })}
            </div>
          </div>
        )}

        {/* ── Urgency: Compre 1 Leve 2 + offer timer ── */}
        <UrgencyTimer variant="pdp" />

        {/* Bloco de destaque: Feature Boxes + Trust Icons num fundo cinza clarinho */}
        <div style={{ background: '#f4f4f5', border: '1px solid #e4e4e7', borderRadius: '4px', padding: '12px', marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* 4 Feature Boxes */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
            {[
              { icon: Sun, title: 'Proteção Solar', sub: 'UV 400' },
              { icon: Glasses, title: 'Lente', sub: 'Polarizada' },
              { icon: Smile, title: 'Ajuste', sub: 'Confortável' },
              { icon: Gem, title: 'Qualidade', sub: 'Premium' },
            ].map((b) => {
              const Icon = b.icon
              return (
                <div key={b.title} style={{ background: '#ffffff', border: '1px solid #e4e4e7', borderRadius: '4px', padding: '12px 4px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                  <Icon size={18} color="#18181b" strokeWidth={1.5} />
                  <span style={{ fontSize: '9px', fontWeight: 700, color: '#18181b', lineHeight: 1.2 }}>{b.title}<br/>{b.sub}</span>
                </div>
              )
            })}
          </div>

          {/* Trust Icons — antes do CTA para reforço antes da decisão */}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 8px' }}>
            {[
              { icon: Truck, text: 'Envio Expresso' },
              { icon: ShieldCheck, text: 'Garantia Risco' },
              { icon: RefreshCcw, text: 'Troca Fácil' },
              { icon: Lock, text: 'Compra Segura' },
            ].map((b) => {
              const Icon = b.icon
              return (
                <div key={b.text} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                  <Icon size={18} color="#18181b" strokeWidth={1.5} />
                  <span style={{ fontSize: '9px', fontWeight: 700, color: '#18181b' }}>{b.text}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Add to Cart */}
        <button
          onClick={handleAddToCart}
          disabled={outOfStock}
          style={{
            width: '100%',
            height: '52px',
            background: outOfStock ? '#a1a1aa' : '#000000',
            color: '#ffffff',
            border: 'none',
            fontSize: '13px',
            fontWeight: 700,
            cursor: outOfStock ? 'not-allowed' : 'pointer',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            transition: 'opacity 0.2s',
          }}
          onMouseEnter={(e) => { if(!outOfStock) e.currentTarget.style.opacity = '0.85' }}
          onMouseLeave={(e) => { if(!outOfStock) e.currentTarget.style.opacity = '1' }}
        >
          {outOfStock ? 'Esgotado' : 'Adicionar ao Carrinho'}
        </button>

        {/* CTA secundário: escolher 2º óculos grátis */}
        <Link
          href="/colecao/compre-1-leve-2"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            height: '46px',
            background: '#fff',
            color: '#18181b',
            border: '2px solid #18181b',
            fontSize: '13px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '1px',
            textDecoration: 'none',
            marginTop: '8px',
            transition: 'opacity 0.2s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.75' }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
        >
          ESCOLHER 2º ÓCULOS GRÁTIS
        </Link>

        {/* Linha de Produção */}
        <ProductionVideosSection categorySlug={product.collection?.slug} />

        {/* Promo Box */}
        <div style={{ background: '#fafafa', border: '1px solid #f4f4f5', borderRadius: '4px', padding: '24px', marginBottom: '24px', textAlign: 'center' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 400, color: '#18181b', marginBottom: '8px', fontFamily: 'var(--font-poppins), sans-serif' }}>
            COMPRE 1 E GANHE OUTRO!
          </h3>
          <p style={{ fontSize: '13px', fontStyle: 'italic', color: '#71717a', marginBottom: '16px', lineHeight: 1.4 }}>
            Leve 2 Óculos por R$ 297,00!<br/>
            Promoção válida por tempo limitado.
          </p>
          <div style={{ fontSize: '12px', color: '#18181b', lineHeight: 1.6 }}>
            1. Adicione <span style={{ fontWeight: 700 }}>2 Óculos</span> ao carrinho<br/>
            2. O <span style={{ fontWeight: 700 }}>desconto é aplicado automaticamente</span>
          </div>
        </div>

        {/* Accordions removidos temporariamente — restaurar quando solicitado */}

      </div>
    </div>
    <MobileBuyBar
      productName={`Óculos ${product.name}`}
      sortedVariants={sortedVariants}
      selectedVariantId={selectedVariantId}
      selectedVariant={selectedVariant}
      onSelectVariant={selectVariant}
      onAddToCart={handleAddToCart}
      outOfStock={outOfStock}
      isCartOpen={isCartOpen}
    />
    </>
  )
}

// ── Style helpers ────────────────────────────────────────────────────────────

function swatchArrow(side: 'left' | 'right'): CSSProperties {
  return {
    position: 'absolute',
    [side]: 0,
    top: '50%',
    transform: 'translateY(-50%)',
    zIndex: 2,
    background: '#ffffff',
    border: '1px solid var(--color-border)',
    borderRadius: '50%',
    width: '28px',
    height: '28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    padding: 0,
    boxShadow: '0 1px 4px rgba(0,0,0,0.10)',
  }
}

const qtyBtn: CSSProperties = {
  width: '36px',
  height: '36px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  color: 'var(--color-heading)',
}
