import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/admin-client'
import { isLegacyItemTitle, readMappings, type LegacyItemMapping } from '@/lib/admin/legacy-mapping'
import { checkAuth, unauthorized } from '@/lib/admin/auth'

const STORE_ID = 'b0000000-0000-0000-0000-000000000001'


type SaveBody = {
  orderId?: string
  orderItemId?: string
  productId?: string
  variantId?: string
  supplierId?: string | null
  unitCost?: number
  note?: string | null
}

/** Grava o mapeamento manual de UM item legado dentro de
 *  `orders.metadata.legacy_item_mappings`. O nome/SKU/preço originais da Yampi
 *  ficam intactos em `order_items` — nada é sobrescrito lá, o mapeamento é uma
 *  camada por cima, só pro fechamento financeiro. */
export async function POST(req: Request) {
  if (!(await checkAuth())) return unauthorized()

  const body = await req.json() as SaveBody
  const { orderId, orderItemId, productId, variantId, supplierId, unitCost, note } = body

  if (!orderId || !orderItemId || !productId || !variantId) {
    return NextResponse.json({ error: 'orderId, orderItemId, productId e variantId são obrigatórios.' }, { status: 400 })
  }
  if (typeof unitCost !== 'number' || !isFinite(unitCost) || unitCost < 0) {
    return NextResponse.json({ error: 'unitCost precisa ser um número >= 0.' }, { status: 400 })
  }

  const db = getAdminSupabase()

  const { data: order, error: orderError } = await db
    .from('orders')
    .select('id, metadata')
    .eq('store_id', STORE_ID)
    .eq('id', orderId)
    .maybeSingle()
  if (orderError) return NextResponse.json({ error: orderError.message }, { status: 500 })
  if (!order) return NextResponse.json({ error: 'Pedido não encontrado.' }, { status: 404 })

  const { data: item, error: itemError } = await db
    .from('order_items')
    .select('id, order_id, product_title, quantity, sku')
    .eq('id', orderItemId)
    .maybeSingle()
  if (itemError) return NextResponse.json({ error: itemError.message }, { status: 500 })
  if (!item || item.order_id !== orderId) {
    return NextResponse.json({ error: 'Item não pertence a esse pedido.' }, { status: 400 })
  }
  // Trava de segurança: essa rota só mapeia item do catálogo antigo. Item do
  // site novo continua no fluxo normal de custo (product_costs), intocado.
  if (!isLegacyItemTitle(item.product_title)) {
    return NextResponse.json({ error: 'Esse item não é do catálogo antigo — não é mapeável por aqui.' }, { status: 400 })
  }

  const [{ data: product }, { data: variant }] = await Promise.all([
    db.from('products').select('id, name').eq('id', productId).maybeSingle(),
    db.from('variants').select('id, name, product_id').eq('id', variantId).maybeSingle(),
  ])
  if (!product) return NextResponse.json({ error: 'Produto não encontrado.' }, { status: 400 })
  if (!variant || variant.product_id !== productId) {
    return NextResponse.json({ error: 'Variação não pertence a esse produto.' }, { status: 400 })
  }

  let supplierName: string | null = null
  if (supplierId) {
    const { data: supplier } = await db.from('suppliers').select('id, name').eq('id', supplierId).maybeSingle()
    if (!supplier) return NextResponse.json({ error: 'Fornecedor não encontrado.' }, { status: 400 })
    supplierName = supplier.name
  }

  // A ancoragem e o SKU antigo, nao o id do item: o webhook da Yampi recria os
  // order_items a cada sincronizacao do pedido (ver legacy-mapping.ts).
  if (!item.sku) {
    return NextResponse.json({ error: 'Item sem SKU original — não é mapeável (não há âncora estável).' }, { status: 400 })
  }

  const metadata = (order.metadata ?? {}) as Record<string, unknown>
  const existing = readMappings(metadata)

  const mapping: LegacyItemMapping = {
    sku: item.sku,
    order_item_id: orderItemId,
    product_id: productId,
    variant_id: variantId,
    product_name: product.name,
    variant_name: variant.name,
    supplier_id: supplierId ?? null,
    supplier_name: supplierName,
    unit_cost: unitCost,
    note: note ?? null,
    mapped_by: 'manual',
    mapped_at: new Date().toISOString(),
  }

  // Remove qualquer registro do mesmo SKU e tambem os do formato antigo
  // (sem `sku`), que so podem estar orfaos apos uma ressincronizacao.
  const next = [...existing.filter(m => !!m.sku && m.sku !== item.sku), mapping]

  // Pedido só vira "mapped" quando TODO item legado dele tem mapeamento.
  const { data: allItems } = await db
    .from('order_items')
    .select('id, sku, product_title')
    .eq('order_id', orderId)
  const legacySkus = (allItems ?? []).filter(i => isLegacyItemTitle(i.product_title)).map(i => i.sku)
  const todosMapeados = legacySkus.every(s => !!s && next.some(m => m.sku === s))

  const { error: updateError } = await db
    .from('orders')
    .update({
      metadata: {
        ...metadata,
        legacy_item_mappings: next,
        mapping_status: todosMapeados ? 'mapped' : 'pending',
        cost_status: todosMapeados ? 'mapped' : 'pending',
      },
      updated_at: new Date().toISOString(),
    })
    .eq('store_id', STORE_ID)
    .eq('id', orderId)

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })
  return NextResponse.json({ ok: true, mapping, mappingStatus: todosMapeados ? 'mapped' : 'pending' })
}

/** Desfaz o mapeamento de um item — volta a "pendente", sem apagar nada do
 *  item original. */
export async function DELETE(req: Request) {
  if (!(await checkAuth())) return unauthorized()

  const { orderId, orderItemId, sku: skuBody } = await req.json() as { orderId?: string; orderItemId?: string; sku?: string }
  if (!orderId || !orderItemId) {
    return NextResponse.json({ error: 'orderId e orderItemId são obrigatórios.' }, { status: 400 })
  }

  const db = getAdminSupabase()
  const { data: order } = await db
    .from('orders')
    .select('id, metadata')
    .eq('store_id', STORE_ID)
    .eq('id', orderId)
    .maybeSingle()
  if (!order) return NextResponse.json({ error: 'Pedido não encontrado.' }, { status: 404 })

  // Resolve o SKU do item (a ancora) — aceita tambem o proprio SKU vindo do
  // cliente, pro caso do item ja ter sido recriado pelo webhook.
  const { data: item } = await db.from('order_items').select('sku').eq('id', orderItemId).maybeSingle()
  const alvo = item?.sku ?? skuBody ?? null
  if (!alvo) return NextResponse.json({ error: 'Não foi possível identificar o SKU do item.' }, { status: 400 })

  const metadata = (order.metadata ?? {}) as Record<string, unknown>
  const next = readMappings(metadata).filter(m => m.sku !== alvo)

  const { error } = await db
    .from('orders')
    .update({
      metadata: { ...metadata, legacy_item_mappings: next, mapping_status: 'pending', cost_status: 'pending' },
      updated_at: new Date().toISOString(),
    })
    .eq('store_id', STORE_ID)
    .eq('id', orderId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
