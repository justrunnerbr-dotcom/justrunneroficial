import { getAdminSupabase } from '@/lib/admin-client'

export type SupplierMappingRow = {
  id: string
  product_name: string
  variant_name: string | null
  supplier_primary_id: string | null
  supplier_alternatives: { supplier_id: string; quantity: number }[]
  period_volume_by_supplier: Record<string, number>
  confidence_level: 'high' | 'medium' | 'low'
  source_period: string
  notes: string | null
  needs_review: boolean
}

export async function getSupplierMapping(): Promise<SupplierMappingRow[]> {
  const db = getAdminSupabase()
  const { data } = await db
    .from('supplier_mapping')
    .select('id, product_name, variant_name, supplier_primary_id, supplier_alternatives, period_volume_by_supplier, confidence_level, source_period, notes, needs_review')
    .order('needs_review', { ascending: false })
    .order('product_name')
  return data ?? []
}
