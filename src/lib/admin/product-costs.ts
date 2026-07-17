import { getAdminSupabase } from '@/lib/admin-client'

export type Supplier = { id: string; name: string }
export type ProductCost = { id: string; supplier_id: string; model_name: string; cost: number; notes: string | null }
export type StockPurchase = {
  id: string
  purchased_at: string
  supplier_id: string | null
  model_name: string
  quantity: number
  unit_cost: number
  total_cost: number
  notes: string | null
}

export async function getSuppliers(): Promise<Supplier[]> {
  const db = getAdminSupabase()
  const { data } = await db.from('suppliers').select('id, name').order('name')
  return data ?? []
}

export async function getProductCosts(): Promise<ProductCost[]> {
  const db = getAdminSupabase()
  const { data } = await db
    .from('product_costs')
    .select('id, supplier_id, model_name, cost, notes')
    .order('model_name')
  return data ?? []
}

export async function getStockPurchases(): Promise<StockPurchase[]> {
  const db = getAdminSupabase()
  const { data } = await db
    .from('stock_purchases')
    .select('id, purchased_at, supplier_id, model_name, quantity, unit_cost, total_cost, notes')
    .order('purchased_at', { ascending: false })
    .order('created_at', { ascending: false })
  return data ?? []
}

export type StockSummaryRow = { modelName: string; totalQuantity: number; totalSpent: number; lastPurchaseAt: string }

function norm(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\(geral\)/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
function tokenSet(s: string) { return new Set(norm(s).split(' ').filter(Boolean)) }
function jaccard(a: Set<string>, b: Set<string>) {
  const inter = [...a].filter(x => b.has(x)).length
  const union = new Set([...a, ...b]).size
  return union === 0 ? 0 : inter / union
}

/** Casa o título de um item de pedido contra o banco de custos já cadastrado
 *  (product_costs), que cobre tanto o nome do PDF/planilha do fornecedor
 *  quanto o nome real do catálogo do site. Retorna o MENOR custo entre os
 *  fornecedores que batem (o override por pedido cobre o caso raro de ter
 *  sido o fornecedor mais caro). */
export function matchProductCost(productTitle: string, costs: ProductCost[]): number | null {
  const clean = productTitle.replace(/^\[JR\]\s*/, '').replace(/\s+/g, ' ').trim()
  const n = norm(clean)

  const exact = costs.filter(c => norm(c.model_name) === n)
  if (exact.length > 0) return Math.min(...exact.map(c => c.cost))

  const titleTokens = tokenSet(clean)
  let bestScore = 0
  let bestCosts: number[] = []
  for (const c of costs) {
    const score = jaccard(titleTokens, tokenSet(c.model_name))
    if (score > bestScore) { bestScore = score; bestCosts = [c.cost] }
    else if (score === bestScore && score > 0) { bestCosts.push(c.cost) }
  }
  return bestScore >= 0.6 ? Math.min(...bestCosts) : null
}

export type OrderCostOverride = { order_id: string; custo_override: number; notes: string | null }

export async function getOrderCostOverrides(): Promise<OrderCostOverride[]> {
  const db = getAdminSupabase()
  const { data } = await db.from('order_cost_overrides').select('order_id, custo_override, notes')
  return data ?? []
}

export function summarizeStock(purchases: StockPurchase[]): StockSummaryRow[] {
  const map = new Map<string, StockSummaryRow>()
  for (const p of purchases) {
    const existing = map.get(p.model_name)
    if (existing) {
      existing.totalQuantity += p.quantity
      existing.totalSpent += p.total_cost
      if (p.purchased_at > existing.lastPurchaseAt) existing.lastPurchaseAt = p.purchased_at
    } else {
      map.set(p.model_name, { modelName: p.model_name, totalQuantity: p.quantity, totalSpent: p.total_cost, lastPurchaseAt: p.purchased_at })
    }
  }
  return [...map.values()].sort((a, b) => b.totalQuantity - a.totalQuantity)
}
