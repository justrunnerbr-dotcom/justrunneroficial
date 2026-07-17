import { getAdminSupabase } from '@/lib/admin-client'
import type { ProductCost } from '@/lib/admin/product-costs'
import { matchProductCost } from '@/lib/admin/product-costs'

export type SupplierOrderItem = {
  id: string
  supplier_id: string
  order_date: string
  model_name: string
  quantity_ordered: number
  quantity_received: number | null
  unit_cost: number
  subtotal: number
  notes: string | null
}

export type OrderItemStatus = 'pendente' | 'completo' | 'divergencia' | 'excesso'

export async function getSupplierOrderItems(): Promise<SupplierOrderItem[]> {
  const db = getAdminSupabase()
  const { data } = await db
    .from('supplier_order_items')
    .select('id, supplier_id, order_date, model_name, quantity_ordered, quantity_received, unit_cost, subtotal, notes')
    .order('order_date', { ascending: false })
    .order('created_at', { ascending: false })
  return data ?? []
}

/** Extrai linhas "Modelo = quantidade" (formato que o fornecedor manda no
 *  WhatsApp) de um texto colado. Linhas sem "=" (cabeçalho tipo nome do
 *  fornecedor, data do pedido) são ignoradas por não casarem o padrão. */
export function parseSupplierOrderPaste(text: string): { modelName: string; quantity: number }[] {
  const results: { modelName: string; quantity: number }[] = []
  for (const rawLine of text.split('\n')) {
    const match = rawLine.trim().match(/^(.+?)\s*=\s*(\d+)\s*$/)
    if (!match) continue
    const modelName = match[1].trim()
    const quantity = parseInt(match[2], 10)
    if (modelName && quantity > 0) results.push({ modelName, quantity })
  }
  return results
}

export function deriveOrderStatus(ordered: number, received: number | null): OrderItemStatus {
  if (received === null) return 'pendente'
  if (received === ordered) return 'completo'
  if (received < ordered) return 'divergencia'
  return 'excesso'
}

/** Sugere o custo unitário de um modelo pro fornecedor selecionado, reaproveitando
 *  o mesmo fuzzy-match usado em "Registrar Compra/Estoque" e "Pedidos × Custo". */
export function suggestUnitCost(modelName: string, supplierId: string, costs: ProductCost[]): number | null {
  const supplierCosts = costs.filter(c => c.supplier_id === supplierId)
  return matchProductCost(modelName, supplierCosts)
}

export type SupplierOrderSummary = {
  totalOrdered: number
  totalReceivedValue: number
  pendingCount: number
  divergenceCount: number
}

export function summarizeSupplierOrders(items: SupplierOrderItem[]): SupplierOrderSummary {
  let totalOrdered = 0
  let totalReceivedValue = 0
  let pendingCount = 0
  let divergenceCount = 0
  for (const item of items) {
    totalOrdered += item.subtotal
    const status = deriveOrderStatus(item.quantity_ordered, item.quantity_received)
    if (status === 'pendente') pendingCount++
    if (status === 'divergencia' || status === 'excesso') divergenceCount++
    if (item.quantity_received !== null) totalReceivedValue += item.quantity_received * item.unit_cost
  }
  return { totalOrdered, totalReceivedValue, pendingCount, divergenceCount }
}
