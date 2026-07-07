import { cache } from 'react'
import type { Product, Collection } from './types'
import { createServerSupabaseClient } from './supabase-server'
import { createClient } from './supabase'
import { mockCollections, mockProducts, mockSettings } from './mock-data'
export { formatPrice, buildProductSlug } from './utils'

function isSupabaseConfigured(): boolean {
  return (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').startsWith('https://')
}

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn()
  } catch {
    return fallback
  }
}

function filterHiddenItems<T extends { slug: string; name?: string }>(items: T[]): T[] {
  return items.filter((item) => {
    const s = item.slug?.toLowerCase() || ''
    const n = item.name?.toLowerCase() || ''
    return !s.includes('sutro') && !s.includes('case') && !n.includes('sutro') && !n.includes('case')
  })
}

export const getCollections = cache(async function getCollections(): Promise<Collection[]> {
  if (!isSupabaseConfigured()) return filterHiddenItems(mockCollections)
  return safe(async () => {
    const supabase = await createServerSupabaseClient()
    const { data, error } = await supabase.from('collections').select('*').order('position')
    if (error) throw error

    let collections = (data ?? []) as Collection[]
    collections = filterHiddenItems(collections)

    const missing = collections.filter((c) => !c.image_url)
    if (missing.length === 0) return collections

    const { data: products } = await supabase
      .from('products')
      .select('collection_id, images(url, position)')
      .in('collection_id', missing.map((c) => c.id))
      .eq('status', 'active')

    const imageMap = new Map<string, string>()
    for (const p of (products ?? []) as { collection_id: string; images: { url: string; position: number }[] }[]) {
      if (imageMap.has(p.collection_id)) continue
      const sorted = [...(p.images ?? [])].sort((a, b) => a.position - b.position)
      if (sorted[0]?.url) imageMap.set(p.collection_id, sorted[0].url)
    }

    return collections.map((c) => ({
      ...c,
      image_url: c.image_url ?? imageMap.get(c.id) ?? null,
    }))
  }, [])
})

export async function getCollectionBySlug(slug: string): Promise<Collection | null> {
  if (!isSupabaseConfigured()) return mockCollections.find((c) => c.slug === slug) ?? null
  return safe(async () => {
    const supabase = await createServerSupabaseClient()
    const { data } = await supabase.from('collections').select('*').eq('slug', slug).single()
    return data
  }, null)
}

export async function getProductsByCollection(collectionId: string): Promise<Product[]> {
  if (!isSupabaseConfigured()) return filterHiddenItems(mockProducts.filter((p) => p.collection_id === collectionId))
  return safe(async () => {
    const supabase = await createServerSupabaseClient()
    const { data, error } = await supabase
      .from('products')
      .select(`*, variants(*), images(*)`)
      .eq('collection_id', collectionId)
      .eq('status', 'active')
      .order('name', { ascending: true })
    if (error) throw error
    return filterHiddenItems((data ?? []) as Product[])
  }, [])
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  if (!isSupabaseConfigured()) return mockProducts.find((p) => p.slug === slug) ?? null
  return safe(async () => {
    const supabase = await createServerSupabaseClient()
    const { data } = await supabase
      .from('products')
      .select(`*, collection:collections(*), variants(*), images(*)`)
      .eq('slug', slug)
      .eq('status', 'active')
      .single()
    return data as Product | null
  }, null)
}

export async function getAllProductSlugs(): Promise<string[]> {
  if (!isSupabaseConfigured()) return mockProducts.map((p) => p.slug)
  return safe(async () => {
    const supabase = createClient()
    const { data } = await supabase.from('products').select('slug').eq('status', 'active')
    return (data ?? []).map((p: { slug: string }) => p.slug)
  }, [])
}

export async function getAllCollectionSlugs(): Promise<string[]> {
  if (!isSupabaseConfigured()) return mockCollections.map((c) => c.slug)
  return safe(async () => {
    const supabase = createClient()
    const { data } = await supabase.from('collections').select('slug')
    return (data ?? []).map((c: { slug: string }) => c.slug)
  }, [])
}

export async function getFeaturedProducts(): Promise<Product[]> {
  if (!isSupabaseConfigured()) return filterHiddenItems(mockProducts.filter((p) => p.featured)).slice(0, 8)
  return safe(async () => {
    const supabase = await createServerSupabaseClient()
    const { data, error } = await supabase
      .from('products')
      .select(`*, variants(*), images(*)`)
      .eq('status', 'active')
      .order('name', { ascending: true })
    if (error) throw error
    // Still limit to 8 after filtering
    return filterHiddenItems((data ?? []) as Product[]).slice(0, 8)
  }, [])
}

export async function searchProducts(query: string): Promise<Product[]> {
  if (!isSupabaseConfigured()) {
    const q = query.toLowerCase()
    return filterHiddenItems(mockProducts.filter((p) => p.name.toLowerCase().includes(q)))
  }
  return safe(async () => {
    const supabase = await createServerSupabaseClient()
    const { data, error } = await supabase
      .from('products')
      .select(`*, variants(*), images(*)`)
      .eq('status', 'active')
      .textSearch('name', query, { type: 'websearch', config: 'portuguese' })
      .limit(30) // Fetch a bit more to account for filtering
    if (error) throw error
    return filterHiddenItems((data ?? []) as Product[]).slice(0, 24)
  }, [])
}

export async function getRelatedProducts(
  collectionId: string,
  excludeProductId: string,
  limit = 8
): Promise<Product[]> {
  if (!isSupabaseConfigured()) {
    return filterHiddenItems(mockProducts.filter((p) => p.collection_id !== collectionId)).slice(0, limit)
  }
  return safe(async () => {
    const supabase = await createServerSupabaseClient()
    const { data, error } = await supabase
      .from('products')
      .select(`*, variants(*), images(*)`)
      .neq('collection_id', collectionId)
      .eq('status', 'active')
      .limit(limit + 5) // fetch slightly more to compensate for filtered items
    if (error) throw error
    return filterHiddenItems((data ?? []) as Product[]).slice(0, limit)
  }, [])
}

export async function getSetting(key: string): Promise<string | null> {
  if (!isSupabaseConfigured()) return mockSettings[key] ?? null
  return safe(async () => {
    const supabase = await createServerSupabaseClient()
    const { data } = await supabase.from('settings').select('value').eq('key', key).single()
    return data?.value ?? null
  }, null)
}

// Batch: fetch multiple settings in a single query
export async function getSettings(keys: string[]): Promise<Record<string, string | null>> {
  const empty = Object.fromEntries(keys.map((k) => [k, null as string | null]))
  if (!isSupabaseConfigured()) {
    return Object.fromEntries(keys.map((k) => [k, (mockSettings as Record<string, string>)[k] ?? null]))
  }
  return safe(async () => {
    const supabase = await createServerSupabaseClient()
    const { data } = await supabase.from('settings').select('key, value').in('key', keys)
    const result = { ...empty }
    for (const row of (data ?? []) as { key: string; value: string | null }[]) {
      result[row.key] = row.value ?? null
    }
    return result
  }, empty)
}

// Batch: fetch products for multiple collections in a single query
export async function getProductsBatchByCollections(
  collectionIds: string[]
): Promise<Map<string, Product[]>> {
  if (!isSupabaseConfigured()) {
    const result = new Map<string, Product[]>()
    for (const id of collectionIds) {
      result.set(id, filterHiddenItems(mockProducts.filter((p) => p.collection_id === id)))
    }
    return result
  }
  return safe(async () => {
    const supabase = await createServerSupabaseClient()
    const { data, error } = await supabase
      .from('products')
      .select(`*, variants(*), images(*)`)
      .in('collection_id', collectionIds)
      .eq('status', 'active')
      .order('name', { ascending: true })
    if (error) throw error

    const result = new Map<string, Product[]>()
    for (const id of collectionIds) result.set(id, [])

    for (const product of filterHiddenItems((data ?? []) as Product[])) {
      const arr = result.get(product.collection_id) ?? []
      arr.push(product)
      result.set(product.collection_id, arr)
    }
    return result
  }, new Map())
}
