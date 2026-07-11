import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CartItem } from './types'

// Oferta Progressiva (produtos JROP-, catálogo duplicado a R$175 cada): 1
// óculos = R$175, 2 óculos = R$297 (desconto fixo de R$53 no 2º). Faixas de
// 3/4 unidades ainda não existem — se forem criadas, essa função precisa
// ganhar os tiers correspondentes.
const PROGRESSIVE_OFFER_SKU_PREFIX = 'JROP-'
const PROGRESSIVE_OFFER_TIER2_DISCOUNT = 53
const PROGRESSIVE_OFFER_TIER2_MIN_QTY = 2

interface CartState {
  items: CartItem[]
  isOpen: boolean
  addItem: (item: CartItem) => void
  removeItem: (variantId: string) => void
  updateQuantity: (variantId: string, quantity: number) => void
  clearCart: () => void
  openCart: () => void
  closeCart: () => void
  total: () => number
  subtotal: () => number
  discount: () => number
  progressiveOfferDiscount: () => number
  itemCount: () => number
  eligibleGlassesCount: () => number
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,

      addItem: (newItem) => {
        set((state) => {
          const existing = state.items.find((i) => i.variantId === newItem.variantId)
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.variantId === newItem.variantId
                  ? { ...i, quantity: i.quantity + newItem.quantity }
                  : i
              ),
              isOpen: true,
            }
          }
          return { items: [...state.items, newItem], isOpen: true }
        })
      },

      removeItem: (variantId) => {
        set((state) => ({
          items: state.items.filter((i) => i.variantId !== variantId),
        }))
      },

      updateQuantity: (variantId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(variantId)
          return
        }
        set((state) => ({
          items: state.items.map((i) =>
            i.variantId === variantId ? { ...i, quantity } : i
          ),
        }))
      },

      clearCart: () => set({ items: [] }),
      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),

      subtotal: () =>
        get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),

      discount: () => {
        const eligiblePrices = get().items
          .filter(i => i.price >= 90 && !i.sku?.startsWith(PROGRESSIVE_OFFER_SKU_PREFIX))
          .flatMap(i => Array(i.quantity).fill(i.price))
          .sort((a, b) => b - a)
          
        let totalDiscount = 0
        for(let i = 1; i < eligiblePrices.length; i += 2) {
           totalDiscount += eligiblePrices[i]
        }
        return totalDiscount
      },

      progressiveOfferDiscount: () => {
        const opQty = get().items
          .filter((i) => i.sku?.startsWith(PROGRESSIVE_OFFER_SKU_PREFIX))
          .reduce((sum, i) => sum + i.quantity, 0)
        return opQty >= PROGRESSIVE_OFFER_TIER2_MIN_QTY ? PROGRESSIVE_OFFER_TIER2_DISCOUNT : 0
      },

      total: () => get().subtotal() - get().discount() - get().progressiveOfferDiscount(),

      itemCount: () =>
        get().items.reduce((sum, i) => sum + i.quantity, 0),

      eligibleGlassesCount: () =>
        get().items.reduce((sum, i) => (i.price >= 90 && !i.sku?.startsWith(PROGRESSIVE_OFFER_SKU_PREFIX)) ? sum + i.quantity : sum, 0),
    }),
    {
      name: 'jhf-cart',
      partialize: (state) => ({ items: state.items }),
    }
  )
)
