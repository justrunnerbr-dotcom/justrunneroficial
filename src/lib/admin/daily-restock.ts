import { getAdminSupabase } from '@/lib/admin-client'
import type { DateRange } from '@/lib/admin/date-range'
import type { ProductCost } from '@/lib/admin/product-costs'
import { matchProductCostRecord } from '@/lib/admin/product-costs'
import type { SupplierMappingRow } from '@/lib/admin/supplier-mapping'

const STORE_ID = 'b0000000-0000-0000-0000-000000000001'
const PAID_STATUSES = ['paid', 'invoiced', 'on_carriage', 'payment_confirmed', 'preparing_shipping', 'in_separation', 'in_transit', 'delivered']

export type DailyRestockRow = { modelName: string; quantity: number; unitCost: number | null; subtotal: number; fromMapping: boolean }
export type DailyRestockUnmatched = { title: string; quantity: number }

export type DailyRestockReport = {
  rows: DailyRestockRow[]
  unmatched: DailyRestockUnmatched[]
  needsReview: DailyRestockUnmatched[]
  total: number
  totalUnits: number
}

function norm(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()
}
function tokenSet(s: string) { return new Set(norm(s).split(' ').filter(Boolean)) }
function jaccard(a: Set<string>, b: Set<string>) {
  const inter = [...a].filter(x => b.has(x)).length
  const union = new Set([...a, ...b]).size
  return union === 0 ? 0 : inter / union
}

/** Casa o item vendido contra o mapeamento real de fornecedor — é mais
 *  confiável que "menor custo cadastrado" porque vem do que você de fato
 *  pediu, não de uma suposição de preço. */
function matchSupplierMapping(productTitle: string, mapping: SupplierMappingRow[]): SupplierMappingRow | null {
  const clean = productTitle.replace(/^\[JR\]\s*/, '').replace(/\s+/g, ' ').trim()
  const titleTokens = tokenSet(clean)
  let bestScore = 0
  let best: SupplierMappingRow | null = null
  for (const m of mapping) {
    const combined = m.variant_name ? `${m.product_name} ${m.variant_name}` : m.product_name
    const score = jaccard(titleTokens, tokenSet(combined))
    if (score > bestScore) { bestScore = score; best = m }
  }
  return bestScore >= 0.6 ? best : null
}

/** Cruza os pedidos pagos do período (normalmente 1 dia só, escolhido no
 *  seletor de período do topo do admin) com a base de fornecedor pra gerar a
 *  lista de reposição a pedir no dia seguinte.
 *
 *  Prioridade de fonte por item vendido:
 *  1. `supplier_mapping` (histórico real de compra) — se o produto tem
 *     fornecedor principal definido ali, essa é a resposta, não importa o que
 *     o cadastro de custo diria. Se o mapeamento marcou o item como "precisa
 *     conferir" (empate/ambíguo), ele cai à parte (needsReview), não entra
 *     automaticamente na lista de nenhum fornecedor.
 *  2. Cadastro de custo (`product_costs`), pegando o mais barato entre os
 *     fornecedores que atendem aquele produto — só usado quando NÃO existe
 *     entrada no mapeamento real pra esse item (produto novo, etc).
 *
 *  Um item só entra na lista do fornecedor selecionado se ele for o
 *  vencedor — evita o mesmo produto aparecendo duplicado em duas abas. */
export async function getDailyRestockReport(
  range: DateRange,
  supplierId: string,
  costs: ProductCost[],
  mapping: SupplierMappingRow[],
): Promise<DailyRestockReport> {
  const db = getAdminSupabase()
  const { data: orders } = await db
    .from('orders')
    .select('id')
    .eq('store_id', STORE_ID)
    .in('status', PAID_STATUSES)
    .gte('created_at', range.startISO)
    .lt('created_at', range.endISO)

  const orderIds = (orders ?? []).map(o => o.id)
  const { data: items } = orderIds.length > 0
    ? await db.from('order_items').select('product_title, quantity').in('order_id', orderIds)
    : { data: [] as { product_title: string; quantity: number }[] }

  const rowsByModel = new Map<string, DailyRestockRow>()
  const unmatched: DailyRestockUnmatched[] = []
  const needsReview: DailyRestockUnmatched[] = []

  for (const item of items ?? []) {
    const title = item.product_title.replace(/^\[JR\]\s*/, '')
    const mapped = matchSupplierMapping(item.product_title, mapping)

    if (mapped) {
      if (mapped.needs_review || !mapped.supplier_primary_id) {
        needsReview.push({ title, quantity: item.quantity })
        continue
      }
      if (mapped.supplier_primary_id !== supplierId) continue // vencedor real é outro fornecedor

      const modelName = mapped.variant_name ? `${mapped.product_name} — ${mapped.variant_name}` : mapped.product_name
      const unitCost = mapped.period_volume_by_supplier[mapped.supplier_primary_id]
        ? (costs.find(c => c.supplier_id === mapped.supplier_primary_id
            && jaccard(tokenSet(c.model_name), tokenSet(modelName)) >= 0.5)?.cost ?? null)
        : null
      const existing = rowsByModel.get(modelName)
      if (existing) {
        existing.quantity += item.quantity
        if (unitCost != null) existing.subtotal += unitCost * item.quantity
      } else {
        rowsByModel.set(modelName, { modelName, quantity: item.quantity, unitCost, subtotal: unitCost != null ? unitCost * item.quantity : 0, fromMapping: true })
      }
      continue
    }

    // sem entrada no mapeamento real — cai pro cadastro de custo (mais barato)
    const rec = matchProductCostRecord(item.product_title, costs)
    if (!rec) {
      unmatched.push({ title, quantity: item.quantity })
      continue
    }
    if (rec.supplier_id !== supplierId) continue

    const existing = rowsByModel.get(rec.model_name)
    if (existing) {
      existing.quantity += item.quantity
      existing.subtotal += rec.cost * item.quantity
    } else {
      rowsByModel.set(rec.model_name, { modelName: rec.model_name, quantity: item.quantity, unitCost: rec.cost, subtotal: rec.cost * item.quantity, fromMapping: false })
    }
  }

  const rows = [...rowsByModel.values()].sort((a, b) => b.subtotal - a.subtotal)
  return {
    rows,
    unmatched,
    needsReview,
    total: rows.reduce((s, r) => s + r.subtotal, 0),
    totalUnits: rows.reduce((s, r) => s + r.quantity, 0),
  }
}
