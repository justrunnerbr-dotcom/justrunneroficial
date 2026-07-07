'use client'
import { useEffect, useState } from 'react'
import { X, ShoppingBag, Lock } from 'lucide-react'
import { useCartStore } from '@/lib/cart-store'
import { buildCartCheckoutUrl } from '@/lib/yampi'
import { formatPrice } from '@/lib/utils'
import { track } from '@/lib/analytics/client'
import { trackBeginCheckout } from '@/lib/gtm'
import { metaInitiateCheckout } from '@/lib/meta'
import { CartItemRow } from './cart-item'
import { UrgencyTimer } from './urgency-timer'

const UPSELLS = [
  { 
    id: 'upsell-1', 
    name: 'Óculos Surpresa', 
    price: 49, 
    compare: 179, 
    img: '/surprise_box.png'
  },
]

export function CartDrawer() {
  const { items, isOpen, closeCart, total, subtotal, discount, progressiveOfferDiscount, eligibleGlassesCount } = useCartStore()
  const yampiAlias  = process.env.NEXT_PUBLIC_YAMPI_ALIAS ?? ''
  const [checkingOut, setCheckingOut] = useState(false)

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    if (isOpen) track({ event_type: 'cart_open', value: total(), properties: { items_count: items.length } })
    return () => { document.body.style.overflow = '' }
  }, [isOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleCheckout = () => {
    const url = buildCartCheckoutUrl(yampiAlias, items)
    if (!url || checkingOut) return
    setCheckingOut(true)
    
    try {
      trackBeginCheckout(items.map((i) => ({ id: i.variantId, name: i.productName, price: i.price, quantity: i.quantity })))
    } catch (e) {
      console.error('GTM tracking failed', e)
    }

    try {
      metaInitiateCheckout({
        content_ids: items.filter(i => i.sku).map(i => i.sku as string),
        value: total(),
        currency: 'BRL',
        num_items: items.reduce((s, i) => s + i.quantity, 0),
      })
    } catch (e) {
      console.error('Meta tracking failed', e)
    }

    try {
      track({
        event_type: 'initiate_checkout',
        value: total(),
        properties: {
          source: 'cart_drawer',
          checkout_provider: 'yampi',
          items_count: items.length,
          cart_total: total(),
          cart_subtotal: subtotal(),
          discount: discount(),
          items: items.map((item) => ({
            product_id: item.productId,
            variant_id: item.variantId,
            name: item.productName,
            variant: item.variantName,
            quantity: item.quantity,
            price: item.price,
            sku: item.sku ?? null,
          })),
        },
      })
    } catch (e) {
      console.error('Internal tracking failed', e)
    }

    window.location.href = url
    setTimeout(() => setCheckingOut(false), 6000)
  }

  // Lógica de distribuição de gratuidade
  const glassesCount = eligibleGlassesCount()
  let remainingFree = Math.floor(glassesCount / 2)
  const itemsWithDiscount = items.map(item => {
    let freeQty = 0
    if (item.price >= 90 && !item.sku?.startsWith('JHFOP-')) {
      freeQty = Math.min(remainingFree, item.quantity)
      remainingFree -= freeQty
    }
    return { ...item, freeQty }
  })

  // Progresso 1: Óculos — a mensagem depende de qual oferta está ativa no
  // carrinho. Compre 1 Leve 2 (glassesCount, já exclui JHFOP-) e Oferta
  // Progressiva (opQty) têm mecânicas diferentes (2º grátis vs. 2 por R$297),
  // então cada uma tem sua própria frase — mostrar "grátis" pra Oferta
  // Progressiva seria enganoso, já que ali é desconto, não brinde.
  const opQty = items
    .filter((i) => i.sku?.startsWith('JHFOP-'))
    .reduce((sum, i) => sum + i.quantity, 0)
  const hasFreeGlasses = glassesCount >= 2
  const showProgressiveMessage = opQty > 0 && glassesCount === 0

  const progress1 = showProgressiveMessage
    ? (opQty >= 2 ? 100 : 50)
    : (hasFreeGlasses ? 100 : glassesCount === 1 ? 50 : 0)
  const progress1Active = showProgressiveMessage ? opQty >= 2 : hasFreeGlasses
  const progress1Label = showProgressiveMessage
    ? (opQty >= 2 ? '🎁 Oferta Progressiva ativada — 2 óculos por R$297!' : '🎁 Leve mais 1 óculos e pague R$297 nos 2')
    : (hasFreeGlasses ? '🎁 2º óculos grátis garantido!' : '🎁 Falta 1 óculos para ganhar outro grátis')

  // Progresso 2: Frete — conta QUALQUER óculos no carrinho (Leve 2 ou Oferta
  // Progressiva), já que o frete não depende de qual promoção o item ativa.
  const totalGlassesQty = items
    .filter((i) => i.price >= 90)
    .reduce((sum, i) => sum + i.quantity, 0)
  const FRETE_THRESHOLD_GLASSES = 3
  const missingFrete = Math.max(0, FRETE_THRESHOLD_GLASSES - totalGlassesQty)
  const progress2 = Math.min(100, (totalGlassesQty / FRETE_THRESHOLD_GLASSES) * 100)

  return (
    <>
      {isOpen && (
        <div onClick={closeCart} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200 }} aria-hidden="true" />
      )}
      <div
        role="dialog"
        aria-label="Carrinho de compras"
        style={{
          position: 'fixed', top: 0, right: 0, bottom: 0, width: '420px', maxWidth: '100vw',
          background: 'var(--color-background)', zIndex: 201, display: 'flex', flexDirection: 'column',
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s ease',
          boxShadow: '-4px 0 24px rgba(0,0,0,0.08)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid var(--color-border)' }}>
          <span style={{ fontFamily: 'var(--font-poppins), sans-serif', fontWeight: 800, fontSize: '15px', color: 'var(--color-heading)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            Carrinho
            <span style={{ background: '#18181b', color: '#fff', borderRadius: '50%', width: '20px', height: '20px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px' }}>{items.length}</span>
          </span>
          <button onClick={closeCart} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex' }} aria-label="Fechar carrinho">
            <X size={18} strokeWidth={2} color="var(--color-heading)" />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, padding: '16px 20px' }}>
          
          {/* Progresso compacto */}
          <div style={{ background: '#f9f9f9', border: '1px solid #f0f0f0', borderRadius: '8px', padding: '10px 14px', marginBottom: '14px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: progress1Active ? '#16a34a' : '#18181b', marginBottom: '5px' }}>
              {progress1Label}
            </div>
            <div style={{ height: '3px', background: '#e4e4e7', borderRadius: '2px', overflow: 'hidden', marginBottom: '8px' }}>
              <div style={{ height: '100%', background: progress1Active ? '#16a34a' : '#18181b', width: `${progress1}%`, transition: 'width 0.4s' }} />
            </div>
            <div style={{ fontSize: '11px', color: '#71717a' }}>
              {missingFrete <= 0
                ? '🚚 Frete grátis desbloqueado'
                : `🚚 Falta ${missingFrete} óculos para frete grátis`}
            </div>
          </div>

          <h3 style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.6px', textTransform: 'uppercase', color: '#71717a', borderBottom: '1px solid #e4e4e7', paddingBottom: '8px', marginBottom: '10px' }}>
            Itens Reservados
          </h3>

          {items.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 16px' }}>
              <div style={{ width: '56px', height: '56px', background: '#f4f4f5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <ShoppingBag size={24} color="#a1a1aa" />
              </div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#18181b', marginBottom: '6px', fontFamily: 'var(--font-poppins), sans-serif' }}>
                Carrinho vazio
              </div>
              <div style={{ fontSize: '14px', color: '#71717a', marginBottom: '24px', lineHeight: 1.5 }}>
                Escolha seus óculos e garanta a oferta exclusiva!
              </div>
              <button
                onClick={closeCart}
                style={{ background: '#18181b', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 24px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-poppins), sans-serif', letterSpacing: '0.5px' }}
              >
                CONTINUAR COMPRANDO
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0', marginBottom: '16px' }}>
              {itemsWithDiscount.map((item) => <CartItemRow key={item.variantId} item={item} freeQty={item.freeQty} />)}
            </div>
          )}

        </div>

        {items.length > 0 && (
          <div style={{ padding: '12px 20px', paddingBottom: 'calc(12px + env(safe-area-inset-bottom))', borderTop: '1px solid var(--color-border)', background: '#fff', flexShrink: 0 }}>
            {/* Resumo */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginBottom: '10px', fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#71717a' }}>
                <span>{items.reduce((s, i) => s + i.quantity, 0)} item(s)</span>
                <span>{formatPrice(subtotal())}</span>
              </div>
              {discount() > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16a34a', fontWeight: 600 }}>
                  <span>🎁 Compre 1 Leve 2</span>
                  <span>-{formatPrice(discount())}</span>
                </div>
              )}
              {progressiveOfferDiscount() > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16a34a', fontWeight: 600 }}>
                  <span>🎁 Oferta Progressiva</span>
                  <span>-{formatPrice(progressiveOfferDiscount())}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '6px', borderTop: '1px solid #e4e4e7', marginTop: '2px' }}>
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#18181b', fontFamily: 'var(--font-poppins), sans-serif' }}>Total</span>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#18181b', fontFamily: 'var(--font-poppins), sans-serif', lineHeight: 1.1 }}>
                    {formatPrice(total())}
                  </div>
                  <div style={{ fontSize: '10px', color: '#71717a' }}>6x {formatPrice(total() / 6)} sem juros</div>
                </div>
              </div>
            </div>

            {/* Urgency timer compacto */}
            <UrgencyTimer variant="cart" />

            {/* CTA principal */}
            <button
              onClick={handleCheckout}
              disabled={checkingOut}
              style={{
                width: '100%', height: '48px',
                background: checkingOut ? '#52525b' : '#18181b',
                color: '#fff', border: 'none', borderRadius: '10px',
                fontSize: '14px', fontWeight: 700,
                cursor: checkingOut ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
                fontFamily: 'var(--font-poppins), sans-serif',
                transition: 'background 0.2s',
              }}
            >
              {checkingOut ? 'Abrindo checkout...' : <><Lock size={14} />Finalizar compra segura</>}
            </button>

            {/* CTA secundário */}
            <button
              onClick={closeCart}
              style={{
                width: '100%', height: '38px',
                background: '#fff', color: '#18181b',
                border: '1.5px solid #18181b', borderRadius: '10px',
                fontSize: '12px', fontWeight: 700,
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--font-poppins), sans-serif',
                letterSpacing: '0.5px',
                marginTop: '7px',
              }}
            >
              ESCOLHER 2º ÓCULOS GRÁTIS
            </button>

            {/* Trust badges em linha */}
            <p style={{ fontSize: '10px', color: '#a1a1aa', textAlign: 'center', margin: '7px 0 0' }}>
              🔒 Pagamento seguro • 💳 Pix e cartão • 📦 Entrega rastreada
            </p>
          </div>
        )}
      </div>
    </>
  )
}
