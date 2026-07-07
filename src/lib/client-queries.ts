import { createClient } from './supabase'
import { mockProducts } from './mock-data'
import type { Product } from './types'

function isSupabaseConfigured(): boolean {
  return (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').startsWith('https://')
}

export async function searchProductsClient(
  query: string,
  limit = 8
): Promise<Product[]> {
  const q = query.trim()
  if (q.length < 1) return []

  if (!isSupabaseConfigured()) {
    const lower = q.toLowerCase()
    return mockProducts
      .filter((p) => p.status === 'active' && p.name.toLowerCase().includes(lower))
      .slice(0, limit)
  }

  try {
    const supabase = createClient()
    const { data } = await supabase
      .from('products')
      .select('id, slug, name, collection_id, status, variants(*), images(*)')
      .eq('status', 'active')
      .ilike('name', `%${q}%`)
      .order('name')
      .limit(limit)
    return (data ?? []) as Product[]
  } catch {
    return []
  }
}
