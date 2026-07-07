declare global {
  interface Window {
    dataLayer: Record<string, unknown>[]
  }
}

export function pushToDataLayer(event: Record<string, unknown>) {
  if (typeof window === 'undefined') return
  window.dataLayer = window.dataLayer || []
  window.dataLayer.push(event)
}

export function trackPageView(url: string) {
  pushToDataLayer({ event: 'page_view', page_location: url })
}

export function trackViewItem(product: {
  id: string
  name: string
  price: number
  category?: string
}) {
  pushToDataLayer({
    event: 'view_item',
    ecommerce: {
      items: [
        {
          item_id: product.id,
          item_name: product.name,
          price: product.price,
          item_category: product.category,
          quantity: 1,
        },
      ],
    },
  })
}

export function trackAddToCart(item: {
  id: string
  name: string
  price: number
  quantity: number
  category?: string
}) {
  pushToDataLayer({
    event: 'add_to_cart',
    ecommerce: {
      items: [
        {
          item_id: item.id,
          item_name: item.name,
          price: item.price,
          quantity: item.quantity,
          item_category: item.category,
        },
      ],
    },
  })
}

export function trackBeginCheckout(items: Array<{
  id: string
  name: string
  price: number
  quantity: number
}>) {
  pushToDataLayer({
    event: 'begin_checkout',
    ecommerce: {
      items: items.map((i) => ({
        item_id: i.id,
        item_name: i.name,
        price: i.price,
        quantity: i.quantity,
      })),
    },
  })
}
