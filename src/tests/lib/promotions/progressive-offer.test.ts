import { describe, it, expect } from 'vitest'
import {
  calculateProgressiveOffer,
  FLAK_GIFT,
  MINUTE_GIFT,
  PROGRESSIVE_OFFER_ID,
  PROGRESSIVE_OFFER_STATUS,
} from '@/lib/promotions/progressive-offer'
import type { CartItem } from '@/lib/types'

function glasses(quantity: number, overrides: Partial<CartItem> = {}): CartItem {
  return {
    variantId: 'v1',
    productId: 'p1',
    productName: 'Minute',
    variantName: 'Preta',
    price: 297,
    imageUrl: null,
    quantity,
    yampiProductId: 'yampi-1',
    ...overrides,
  }
}

describe('progressive-offer (JHF Oferta Progressiva — nova, separada da Compre 1 Leve 2)', () => {
  it('promoção nasce em modo draft, não ativa no site público', () => {
    expect(PROGRESSIVE_OFFER_STATUS).toBe('draft')
    expect(PROGRESSIVE_OFFER_ID).toBe('jhf-progressive-offer')
  })

  it('1 óculos = R$175, sem brinde', () => {
    const result = calculateProgressiveOffer([glasses(1)])
    expect(result.eligibleCount).toBe(1)
    expect(result.total).toBe(175)
    expect(result.giftsToAdd).toHaveLength(0)
    expect(result.overCapMessage).toBeNull()
  })

  it('2 óculos = R$297, sem brinde', () => {
    const result = calculateProgressiveOffer([glasses(2)])
    expect(result.total).toBe(297)
    expect(result.giftsToAdd).toHaveLength(0)
  })

  it('3 óculos = R$419 + Flak 2.0', () => {
    const result = calculateProgressiveOffer([glasses(3)])
    expect(result.total).toBe(419)
    expect(result.giftsToAdd).toEqual([FLAK_GIFT])
  })

  it('4 óculos = R$549 + Flak 2.0 + Minute', () => {
    const result = calculateProgressiveOffer([glasses(4)])
    expect(result.total).toBe(549)
    expect(result.giftsToAdd).toEqual([FLAK_GIFT, MINUTE_GIFT])
    expect(result.overCapMessage).toBeNull()
  })

  it('5+ óculos: teto visual no tier 4 + aviso explícito de limite', () => {
    const result = calculateProgressiveOffer([glasses(5)])
    expect(result.tier?.count).toBe(4)
    expect(result.total).toBe(549)
    expect(result.giftsToAdd).toEqual([FLAK_GIFT, MINUTE_GIFT])
    expect(result.overCapMessage).toBe(
      'Oferta válida até 4 óculos. Para mais unidades, fale com atendimento.'
    )
  })

  it('carrinho vazio não aplica promoção', () => {
    const result = calculateProgressiveOffer([])
    expect(result.tier).toBeNull()
    expect(result.total).toBe(0)
    expect(result.nextTierMessage).toBe('Adicione mais 1 óculos por R$175')
  })

  it('item não elegível (preço < 90) não conta pro tier nem entra no desconto', () => {
    const result = calculateProgressiveOffer([
      glasses(2),
      glasses(1, { variantId: 'acc', productName: 'Óculos Surpresa', price: 49 }),
    ])
    expect(result.eligibleCount).toBe(2)
    expect(result.total).toBe(297 + 49)
  })

  it('brinde presente no carrinho não conta como item elegível', () => {
    const result = calculateProgressiveOffer([
      glasses(3),
      glasses(1, { variantId: FLAK_GIFT.variantId, productName: FLAK_GIFT.productName }),
    ])
    expect(result.eligibleCount).toBe(3)
    expect(result.tier?.count).toBe(3)
  })

  it('nextTierMessage aponta pro próximo tier com brinde', () => {
    const result = calculateProgressiveOffer([glasses(2)])
    expect(result.nextTierMessage).toContain('Flak 2.0')
  })

  it('nextTierMessage é null quando já está no tier máximo', () => {
    const result = calculateProgressiveOffer([glasses(4)])
    expect(result.nextTierMessage).toBeNull()
  })

  it('yampiCheckoutItems não inclui os brindes automaticamente', () => {
    const items = [glasses(4)]
    const result = calculateProgressiveOffer(items)
    expect(result.yampiCheckoutItems).toBe(items)
  })
})
