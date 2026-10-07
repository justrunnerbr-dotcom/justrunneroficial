import { getAdminSupabase } from '@/lib/admin-client'
import { matchProductCostRecord, type ProductCost, type Supplier } from '@/lib/admin/product-costs'
import type { SupplierMappingRow } from '@/lib/admin/supplier-mapping'

const STORE_ID = 'b0000000-0000-0000-0000-000000000001'

/** Itens vindos do catálogo ANTIGO da Yampi. Todos foram cadastrados lá com o
 *  mesmo nome de produto genérico ("Óculos de Sol Just Runner"), variando só
 *  a cor — não existe nome de modelo em lugar nenhum do pedido (conferido no
 *  payload cru: `variations` só traz `Cor`, o SKU é aleatório, `price_cost` é 0
 *  e a imagem do produto é um placeholder). Por isso o casamento textual de
 *  custo (matchProductCost) NÃO pode rodar aqui: ele casa "…Just Runner
 *  preto" com "…Just Runner metallic" a 0,750 de Jaccard e aplica um custo
 *  errado com cara de certo. Estes itens só ganham custo por mapeamento manual. */
const LEGACY_TITLE_RE = /oculos\s+de\s+sol\s+just\s+have\s+fun/i

function normalize(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

export function isLegacyItemTitle(title: string): boolean {
  return LEGACY_TITLE_RE.test(normalize(title))
}

/** Um pedido é legado quando foi importado como tal (metadata) ou quando
 *  carrega item do catálogo antigo — o segundo caso cobre os pedidos MISTOS,
 *  que entraram pelo webhook normal porque tinham ao menos um item [SO]. */
export function isLegacyOrder(
  metadata: Record<string, unknown> | null | undefined,
  itemTitles: string[],
): boolean {
  if (metadata?.is_legacy === true) return true
  if (metadata?.source === 'yampi_legacy') return true
  return itemTitles.some(isLegacyItemTitle)
}

/** ÂNCORA = `sku`, nunca `order_items.id`.
 *
 *  O webhook da Yampi (`upsertYampiOrder`) apaga e recria TODOS os
 *  `order_items` do pedido a cada sincronização — e um pedido sincroniza
 *  várias vezes ao longo da vida (pago → faturado → em separação → enviado →
 *  entregue). Mapeamento preso ao id do item vira órfão no primeiro update:
 *  o custo some da tela sem aviso e o trabalho manual é perdido. O SKU antigo
 *  vem da Yampi e sobrevive à recriação, então é ele que ancora.
 *
 *  `quantity`/`total_cost` NÃO são gravados: são derivados na leitura a partir
 *  dos itens que existem no momento — assim uma mudança de quantidade no
 *  pedido também não deixa o custo defasado. */
export type LegacyItemMapping = {
  sku: string
  /** só rastro histórico de qual item originou o mapeamento; não é chave */
  order_item_id?: string | null
  product_id: string | null
  variant_id: string | null
  product_name: string | null
  variant_name: string | null
  supplier_id: string | null
  supplier_name: string | null
  unit_cost: number
  note: string | null
  mapped_by: 'manual'
  mapped_at: string
}

/** Os mapeamentos vivem em `orders.metadata.legacy_item_mappings` (jsonb que já
 *  existe) em vez de tabela própria: `order_cost_overrides` nunca foi criada em
 *  produção (migration de 08/07 não rodada — o endpoint dela responde 500), e
 *  aqui não há CLI de banco pra criar tabela. Toda leitura/escrita passa por
 *  este arquivo, então trocar por uma tabela real depois é mudar só daqui. */
export function readMappings(metadata: Record<string, unknown> | null | undefined): LegacyItemMapping[] {
  const raw = metadata?.legacy_item_mappings
  return Array.isArray(raw) ? (raw as LegacyItemMapping[]) : []
}

/** Casa um item legado com seu mapeamento pelo SKU. Descarta registros no
 *  formato antigo (sem `sku`), que ficaram órfãos após uma ressincronização. */
export function findMapping(
  mappings: LegacyItemMapping[],
  sku: string | null | undefined,
): LegacyItemMapping | null {
  if (!sku) return null
  return mappings.find(m => m.sku === sku) ?? null
}

/** Custo total de um item já mapeado, calculado na leitura. */
export function mappedLineCost(mapping: LegacyItemMapping, quantity: number): number {
  return Number((mapping.unit_cost * quantity).toFixed(2))
}

export type LegacyQueueItem = {
  orderItemId: string
  originalTitle: string
  originalSku: string | null
  quantity: number
  unitPrice: number
  lineTotal: number
  mapping: LegacyItemMapping | null
}

export type LegacyQueueOrder = {
  orderId: string
  externalId: string
  yampiNumber: string | null
  createdAt: string
  status: string
  total: number
  customerName: string | null
  customerPhone: string | null
  importedManually: boolean
  items: LegacyQueueItem[]
  pendingCount: number
  mappedCost: number
}

const APPROVED_STATUSES = ['paid', 'invoiced', 'on_carriage', 'payment_confirmed', 'preparing_shipping', 'in_separation', 'in_transit', 'delivered']

function customerNameOf(snapshot: unknown): string | null {
  if (!snapshot || typeof snapshot !== 'object') return null
  const s = snapshot as { first_name?: string; last_name?: string; name?: string }
  const composed = [s.first_name, s.last_name].filter(Boolean).join(' ')
  return composed || s.name || null
}

function customerPhoneOf(snapshot: unknown): string | null {
  if (!snapshot || typeof snapshot !== 'object') return null
  const phone = (snapshot as { phone?: unknown }).phone
  if (typeof phone === 'string') return phone
  if (phone && typeof phone === 'object') {
    const p = phone as { formated_number?: string; full_number?: string }
    return p.formated_number ?? p.full_number ?? null
  }
  return null
}

/** `.in('order_id', ids)` vira query string: com ~400 UUIDs a URL passa de 15 KB
 *  e a requisição falha (o erro volta no header e estoura o parser do fetch),
 *  com o cliente devolvendo `data: null` silenciosamente — a fila aparecia
 *  vazia. Quebrar em lotes é o que mantém isso funcionando conforme o mês
 *  cresce. */
const IN_CHUNK = 100

async function fetchItemsByOrderIds(
  db: ReturnType<typeof getAdminSupabase>,
  orderIds: string[],
) {
  type Row = { id: string; order_id: string; product_title: string; sku: string | null; price: number; quantity: number }
  const all: Row[] = []
  for (let i = 0; i < orderIds.length; i += IN_CHUNK) {
    const { data, error } = await db
      .from('order_items')
      .select('id, order_id, product_title, sku, price, quantity')
      .in('order_id', orderIds.slice(i, i + IN_CHUNK))
    if (error) {
      console.error('[legacy-mapping] lote de order_items falhou:', error)
      continue
    }
    all.push(...((data ?? []) as Row[]))
  }
  return all
}

export async function getLegacyQueue(range: { startISO: string; endISO: string }): Promise<LegacyQueueOrder[]> {
  const db = getAdminSupabase()
  const { data: orders } = await db
    .from('orders')
    .select('id, external_id, status, total, created_at, metadata, customer_snapshot')
    .eq('store_id', STORE_ID)
    .in('status', APPROVED_STATUSES)
    .gte('created_at', range.startISO)
    .lt('created_at', range.endISO)
    .order('created_at', { ascending: false })

  if (!orders?.length) return []

  const items = await fetchItemsByOrderIds(db, orders.map(o => o.id))

  const result: LegacyQueueOrder[] = []
  for (const order of orders) {
    const orderItems = items.filter(i => i.order_id === order.id)
    const legacyItems = orderItems.filter(i => isLegacyItemTitle(i.product_title))
    const metadata = (order.metadata ?? {}) as Record<string, unknown>
    if (legacyItems.length === 0 && metadata.is_legacy !== true) continue

    const mappings = readMappings(metadata)
    const queueItems: LegacyQueueItem[] = legacyItems.map(item => {
      const price = parseFloat(String(item.price ?? 0))
      const quantity = item.quantity ?? 1
      return {
        orderItemId: item.id,
        originalTitle: item.product_title,
        originalSku: item.sku ?? null,
        quantity,
        unitPrice: price,
        lineTotal: price * quantity,
        mapping: findMapping(mappings, item.sku),
      }
    })

    result.push({
      orderId: order.id,
      externalId: order.external_id,
      yampiNumber: (metadata.yampi_order_number as string) ?? null,
      createdAt: order.created_at,
      status: order.status,
      total: parseFloat(String(order.total ?? 0)),
      customerName: customerNameOf(order.customer_snapshot),
      customerPhone: customerPhoneOf(order.customer_snapshot),
      importedManually: metadata.imported_manually === true,
      items: queueItems,
      pendingCount: queueItems.filter(i => !i.mapping).length,
      mappedCost: queueItems.reduce((sum, i) => sum + (i.mapping ? mappedLineCost(i.mapping, i.quantity) : 0), 0),
    })
  }
  return result
}

export type CatalogVariant = {
  id: string
  name: string
  sku: string | null
  price: number
  imageUrl: string | null
}

export type CatalogProduct = {
  id: string
  name: string
  slug: string
  status: string | null
  imageUrl: string | null
  variants: CatalogVariant[]
}

/** Catálogo atual pro seletor da tela de mapeamento (90 produtos / 720
 *  variações / 1162 imagens — cabe numa carga só, sem paginação). */
export async function getCatalogForPicker(): Promise<CatalogProduct[]> {
  const db = getAdminSupabase()
  const [{ data: products }, { data: variants }, { data: images }] = await Promise.all([
    db.from('products').select('id, name, slug, status').order('name'),
    db.from('variants').select('id, product_id, name, sku, price').order('position'),
    db.from('images').select('product_id, variant_id, url, position').order('position'),
  ])

  const imageByVariant = new Map<string, string>()
  const imageByProduct = new Map<string, string>()
  for (const img of images ?? []) {
    if (img.variant_id && !imageByVariant.has(img.variant_id)) imageByVariant.set(img.variant_id, img.url)
    if (img.product_id && !imageByProduct.has(img.product_id)) imageByProduct.set(img.product_id, img.url)
  }

  return (products ?? []).map(p => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    status: p.status ?? null,
    imageUrl: imageByProduct.get(p.id) ?? null,
    variants: (variants ?? [])
      .filter(v => v.product_id === p.id)
      .map(v => ({
        id: v.id,
        name: v.name,
        sku: v.sku ?? null,
        price: parseFloat(String(v.price ?? 0)),
        imageUrl: imageByVariant.get(v.id) ?? imageByProduct.get(p.id) ?? null,
      })),
  }))
}

export type CostSuggestion = {
  unitCost: number | null
  supplierId: string | null
  supplierName: string | null
  origin: 'product_costs' | 'supplier_mapping' | 'nenhuma'
}

/** Sugestão de custo/fornecedor DEPOIS que o usuário escolheu produto+variação
 *  do catálogo atual. Aqui o casamento textual é legítimo — o nome já é o nome
 *  real do modelo escolhido à mão, não o título genérico da Yampi. */
export function suggestCost(
  productName: string,
  variantName: string,
  costs: ProductCost[],
  supplierMapping: SupplierMappingRow[],
  suppliers: Supplier[],
): CostSuggestion {
  const supplierNameById = new Map(suppliers.map(s => [s.id, s.name]))
  const full = `${productName} ${variantName}`.trim()

  const costRecord = matchProductCostRecord(full, costs) ?? matchProductCostRecord(productName, costs)
  const mappingRow =
    supplierMapping.find(m => m.product_name.toLowerCase() === productName.toLowerCase() && (m.variant_name ?? '').toLowerCase() === variantName.toLowerCase()) ??
    supplierMapping.find(m => m.product_name.toLowerCase() === productName.toLowerCase())

  if (costRecord) {
    return {
      unitCost: costRecord.cost,
      supplierId: costRecord.supplier_id,
      supplierName: supplierNameById.get(costRecord.supplier_id) ?? null,
      origin: 'product_costs',
    }
  }
  if (mappingRow?.supplier_primary_id) {
    return {
      unitCost: null,
      supplierId: mappingRow.supplier_primary_id,
      supplierName: supplierNameById.get(mappingRow.supplier_primary_id) ?? null,
      origin: 'supplier_mapping',
    }
  }
  return { unitCost: null, supplierId: null, supplierName: null, origin: 'nenhuma' }
}
