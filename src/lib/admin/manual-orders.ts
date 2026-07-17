import { getAdminSupabase } from '@/lib/admin-client'

export type ManualOrder = {
  id: string
  order_number: string
  customer_name: string | null
  total: number
  shipping_amount: number
  payment_method: 'pix' | 'credit_card' | 'boleto'
  installments: number
  notes: string | null
  created_at: string
}
export type ManualOrderItem = {
  id: string; manual_order_id: string; product_title: string; quantity: number; unit_cost: number
  supplier_id: string | null
}

export async function getManualOrders(range: { startISO: string; endISO: string }): Promise<{ orders: ManualOrder[]; items: ManualOrderItem[] }> {
  const db = getAdminSupabase()
  const { data: orders } = await db
    .from('manual_orders')
    .select('id, order_number, customer_name, total, shipping_amount, payment_method, installments, notes, created_at')
    .gte('created_at', range.startISO)
    .lt('created_at', range.endISO)
    .order('created_at', { ascending: false })
  if (!orders?.length) return { orders: [], items: [] }

  const { data: items } = await db
    .from('manual_order_items')
    .select('id, manual_order_id, product_title, quantity, unit_cost, supplier_id')
    .in('manual_order_id', orders.map(o => o.id))

  return { orders, items: items ?? [] }
}
