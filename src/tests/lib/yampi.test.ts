import { describe, it, expect } from 'vitest'
import { buildSingleCheckoutUrl, buildCartCheckoutUrl } from '@/lib/yampi'
import type { CartItem } from '@/lib/types'

describe('yampi URL builder', () => {
  const alias = 'jhfstore'

  it('builds single product checkout URL', () => {
    const url = buildSingleCheckoutUrl(alias, 'yampi-456')
    expect(url).toBe('https://jhfstore.yampi.com.br/checkout/yampi-456/t')
  })

  it('returns null when yampiProductId is missing', () => {
    const url = buildSingleCheckoutUrl(alias, null)
    expect(url).toBeNull()
  })

  it('builds cart checkout URL with multiple items', () => {
    const items: CartItem[] = [
      {
        variantId: 'v1',
        productId: 'p1',
        productName: 'Flak',
        variantName: 'Preto',
        price: 349.9,
        imageUrl: null,
        quantity: 2,
        yampiProductId: 'yampi-111',
      },
      {
        variantId: 'v2',
        productId: 'p2',
        productName: 'Juliet',
        variantName: 'Prata',
        price: 599.9,
        imageUrl: null,
        quantity: 1,
        yampiProductId: 'yampi-222',
      },
    ]
    const url = buildCartCheckoutUrl(alias, items)
    expect(url).toContain('jhfstore.yampi.com.br')
    expect(url).toContain('yampi-111')
    expect(url).toContain('yampi-222')
    expect(url).toContain('sku[]=yampi-111:2')
    expect(url).toContain('sku[]=yampi-222:1')
  })

  it('skips items without yampiProductId in cart checkout', () => {
    const items: CartItem[] = [
      {
        variantId: 'v1',
        productId: 'p1',
        productName: 'Flak',
        variantName: 'Preto',
        price: 349.9,
        imageUrl: null,
        quantity: 1,
        yampiProductId: null,
      },
    ]
    const url = buildCartCheckoutUrl(alias, items)
    expect(url).toBeNull()
  })
})
