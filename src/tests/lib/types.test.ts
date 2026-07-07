import { describe, it, expectTypeOf } from 'vitest'
import type { Product, Variant, Collection, Image, CartItem } from '@/lib/types'

describe('types', () => {
  it('Product has required fields', () => {
    expectTypeOf<Product>().toHaveProperty('id')
    expectTypeOf<Product>().toHaveProperty('slug')
    expectTypeOf<Product>().toHaveProperty('name')
    expectTypeOf<Product>().toHaveProperty('variants')
    expectTypeOf<Product>().toHaveProperty('images')
  })

  it('CartItem has required fields', () => {
    expectTypeOf<CartItem>().toHaveProperty('variantId')
    expectTypeOf<CartItem>().toHaveProperty('quantity')
  })
})
