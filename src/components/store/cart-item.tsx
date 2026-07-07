'use client'
import { Plus, Minus } from 'lucide-react'
import { useCartStore } from '@/lib/cart-store'
import { formatPrice } from '@/lib/utils'
import type { CartItem } from '@/lib/types'

import { Tag } from 'lucide-react'

export function CartItemRow({ item, freeQty = 0 }: { item: CartItem, freeQty?: number }) {
  const { removeItem, updateQuantity } = useCartStore()

  // Quantidade paga é o total menos os itens que saíram de graça
  const paidQty = item.quantity - freeQty
  const rowTotal = item.price * paidQty
  const originalTotal = item.price * item.quantity

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '60px 1fr auto',
        gap: '10px',
        alignItems: 'start',
        padding: '12px 0',
        borderBottom: '1px solid var(--color-border)',
      }}
    >
      <div style={{ width: 60, height: 60, borderRadius: '6px', overflow: 'hidden', background: '#f9f9f9', flexShrink: 0 }}>
        {item.imageUrl ? (
          <img
            src={item.imageUrl.trim()}
            alt={item.productName}
            loading="lazy"
            onError={(e) => { e.currentTarget.style.opacity = '0' }}
            style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', background: '#f4f4f5' }} />
        )}
      </div>
      <div>
        <div style={{ fontSize: '13px', fontWeight: 700, color: '#18181b', marginBottom: '2px', fontFamily: 'var(--font-poppins), sans-serif', lineHeight: 1.3 }}>
          {item.productName}
        </div>
        <div style={{ fontSize: '11px', color: '#71717a', marginBottom: '6px' }}>
          {item.variantName}
        </div>
        
        {freeQty > 0 && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#f4f4f5', padding: '4px 8px', borderRadius: '4px', marginBottom: '12px' }}>
            <Tag size={10} color="#18181b" />
            <span style={{ fontSize: '10px', fontWeight: 800, color: '#18181b', textTransform: 'uppercase' }}>
              Compre 1, Ganhe Outro
            </span>
          </div>
        )}
        
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'space-between', height: '100%' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
          {freeQty > 0 && (
            <span style={{ fontSize: '11px', color: '#4b5563', textDecoration: 'line-through', fontWeight: 600 }}>
              {formatPrice(originalTotal)}
            </span>
          )}
          <span style={{ fontSize: '14px', fontWeight: 800, fontFamily: 'var(--font-poppins), sans-serif', color: '#18181b' }}>
            {rowTotal === 0 ? 'Grátis' : formatPrice(rowTotal)}
          </span>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', border: '1px solid #e4e4e7', borderRadius: '4px', padding: '1px' }}>
            <button onClick={() => updateQuantity(item.variantId, item.quantity - 1)} aria-label="Diminuir quantidade"
              style={{ width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: 'none', border: 'none' }}>
              <Minus size={10} strokeWidth={2} />
            </button>
            <span style={{ fontSize: '12px', fontWeight: 600, minWidth: '14px', textAlign: 'center' }}>
              {item.quantity}
            </span>
            <button onClick={() => updateQuantity(item.variantId, item.quantity + 1)} aria-label="Aumentar quantidade"
              style={{ width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: 'none', border: 'none' }}>
              <Plus size={10} strokeWidth={2} />
            </button>
          </div>
          <button onClick={() => removeItem(item.variantId)} style={{ fontSize: '11px', color: '#a1a1aa', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }} aria-label={`Remover ${item.productName}`}>
            Remover
          </button>
        </div>
      </div>
    </div>
  )
}
