export interface Collection {
  id: string
  slug: string
  name: string
  description: string | null
  image_url: string | null
  position: number
}

export interface Image {
  id: string
  product_id: string
  variant_id: string | null
  url: string
  position: number
  alt: string | null
}

export interface Variant {
  id: string
  product_id: string
  name: string
  price: number
  compare_price: number | null
  sku: string
  stock: number
  yampi_product_id: string | null
  position: number
}

export interface Product {
  id: string
  slug: string
  name: string
  description: string | null
  collection_id: string
  status: 'active' | 'draft'
  featured?: boolean
  collection?: Collection
  variants: Variant[]
  images: Image[]
  created_at: string
  updated_at: string
}

export interface CartItem {
  variantId: string
  productId: string
  productName: string
  variantName: string
  price: number
  imageUrl: string | null
  quantity: number
  yampiProductId: string | null
  sku?: string | null
}
