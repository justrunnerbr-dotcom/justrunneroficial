import { describe, it, expect, beforeEach } from 'vitest'
import { useCartStore } from '@/lib/cart-store'

const mockItem = {
  variantId: 'v1',
  productId: 'p1',
  productName: 'Flak 2.0',
  variantName: 'Preto',
  price: 349.90,
  imageUrl: null,
  quantity: 1,
  yampiProductId: 'yampi-123',
}

describe('cart store', () => {
  beforeEach(() => {
    useCartStore.setState({ items: [], isOpen: false })
  })

  it('starts empty', () => {
    expect(useCartStore.getState().items).toHaveLength(0)
  })

  it('adds item to cart and opens drawer', () => {
    useCartStore.getState().addItem(mockItem)
    expect(useCartStore.getState().items).toHaveLength(1)
    expect(useCartStore.getState().items[0].variantId).toBe('v1')
    expect(useCartStore.getState().isOpen).toBe(true)
  })

  it('increments quantity when adding same variant', () => {
    useCartStore.getState().addItem(mockItem)
    useCartStore.getState().addItem(mockItem)
    const items = useCartStore.getState().items
    expect(items).toHaveLength(1)
    expect(items[0].quantity).toBe(2)
  })

  it('removes item from cart', () => {
    useCartStore.getState().addItem(mockItem)
    useCartStore.getState().removeItem('v1')
    expect(useCartStore.getState().items).toHaveLength(0)
  })

  it('calculates total correctly', () => {
    useCartStore.getState().addItem({ ...mockItem, quantity: 2 })
    expect(useCartStore.getState().total()).toBeCloseTo(699.80, 2)
  })

  it('calculates item count correctly', () => {
    useCartStore.getState().addItem({ ...mockItem, quantity: 3 })
    expect(useCartStore.getState().itemCount()).toBe(3)
  })

  it('clears cart', () => {
    useCartStore.getState().addItem(mockItem)
    useCartStore.getState().clearCart()
    expect(useCartStore.getState().items).toHaveLength(0)
  })

  it('updateQuantity to 0 removes item', () => {
    useCartStore.getState().addItem(mockItem)
    useCartStore.getState().updateQuantity('v1', 0)
    expect(useCartStore.getState().items).toHaveLength(0)
  })
})
