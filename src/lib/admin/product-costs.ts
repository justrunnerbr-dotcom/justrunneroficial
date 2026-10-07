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

/** Mesma lógica de casamento de matchProductCost, mas devolve o registro
 *  inteiro (id/supplier_id/model_name) em vez de só o número — usado quando
 *  precisa saber QUAL linha de product_costs corrigir, não só o valor. */
/** [OP] (versão R$ 175) e [BUMP] (order bump) são o mesmo óculos do [SO]: sem
 *  tirar a etiqueta, ela vira um token a mais e derruba o casamento. */
export function cleanCostTitle(productTitle: string): string {
  return productTitle.replace(/^\[[^\]]*\]\s*/, '').replace(/\s+/g, ' ').trim()
}

/** O custo cadastrado mais parecido com o título, SEM o corte de 0,6 — só
 *  serve de sugestão (fornecedor e valor de referência) na hora de cadastrar
 *  um modelo novo, nunca como custo do pedido. */
export function closestProductCost(productTitle: string, costs: ProductCost[]): ProductCost | null {
  const titleTokens = tokenSet(cleanCostTitle(productTitle))
  let best: ProductCost | null = null
  let bestScore = 0
  for (const c of costs) {
    const score = jaccard(titleTokens, tokenSet(c.model_name))
    if (score > bestScore) { bestScore = score; best = c }
  }
  return best
}

export function matchProductCostRecord(productTitle: string, costs: ProductCost[]): ProductCost | null {
  const clean = cleanCostTitle(productTitle)
  const n = norm(clean)

  const exact = costs.filter(c => norm(c.model_name) === n)
  if (exact.length > 0) return exact.reduce((min, c) => (c.cost < min.cost ? c : min))

  const titleTokens = tokenSet(clean)
  let bestScore = 0
  let bestMatches: ProductCost[] = []
  for (const c of costs) {
    const score = jaccard(titleTokens, tokenSet(c.model_name))
    if (score > bestScore) { bestScore = score; bestMatches = [c] }
    else if (score === bestScore && score > 0) { bestMatches.push(c) }
  }
  if (bestScore < 0.6) return null
  return bestMatches.reduce((min, c) => (c.cost < min.cost ? c : min))
}

export function matchProductCost(productTitle: string, costs: ProductCost[]): number | null {
  return matchProductCostRecord(productTitle, costs)?.cost ?? null
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
