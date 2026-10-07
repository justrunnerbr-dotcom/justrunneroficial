import Link from 'next/link'
import { Package, DollarSign, TrendingUp } from 'lucide-react'
import { getAdminSupabase } from '@/lib/admin-client'
import { getDateRangeFromSearchParams } from '@/lib/admin/date-range'
import {
  getSuppliers, getProductCosts, getStockPurchases, summarizeStock,
  matchProductCost, matchProductCostRecord, getOrderCostOverrides,
  cleanCostTitle, closestProductCost,
} from '@/lib/admin/product-costs'
import { getCostSettings, computeGatewayFee, computeYampiFee, computeFreightCost } from '@/lib/admin/cost-settings'
import { getManualOrders } from '@/lib/admin/manual-orders'
import { getSupplierOrderItems } from '@/lib/admin/supplier-orders'
import { getDailyRestockReport } from '@/lib/admin/daily-restock'
import { getSupplierMapping } from '@/lib/admin/supplier-mapping'
import { chunkIds } from '@/lib/admin/supabase-pagination'
import { getLegacyQueue, getCatalogForPicker, isLegacyItemTitle, readMappings, findMapping, mappedLineCost } from '@/lib/admin/legacy-mapping'
import { LegacyMappingTable } from './_components/legacy-mapping-table'
import { CostManager, type MissingCostItem } from './_components/cost-manager'
import { PurchaseManager } from './_components/purchase-manager'
import { OrdersCostTable, type OrderCostRow } from './_components/orders-cost-table'
import { IntegrationsManager } from './_components/integrations-manager'
import { SupplierOrderManager } from './_components/supplier-order-manager'
import { DailyRestockReportView } from './_components/daily-restock-report'
import { SupplierMappingTable } from './_components/supplier-mapping-table'

export const metadata = { title: 'Custo de Produtos · Just Runner Admin' }

const STORE_ID = 'b0000000-0000-0000-0000-000000000001'
const APPROVED_STATUSES = ['paid', 'invoiced', 'on_carriage', 'payment_confirmed', 'preparing_shipping', 'in_separation', 'in_transit', 'delivered']

async function getOrdersCostData(
  range: { startISO: string; endISO: string },
  costs: Awaited<ReturnType<typeof getProductCosts>>,
  settings: Awaited<ReturnType<typeof getCostSettings>>,
  suppliers: Awaited<ReturnType<typeof getSuppliers>>,
) {
  const supplierNameById = new Map(suppliers.map(s => [s.id, s.name]))
  const db = getAdminSupabase()
  const [{ data: orders }, overrides, { orders: manualOrders, items: manualItems }] = await Promise.all([
    db.from('orders')
      .select('id, external_id, status, total, shipping_amount, payment_method, created_at, metadata')
      .eq('store_id', STORE_ID)
      .in('status', APPROVED_STATUSES)
      .gte('created_at', range.startISO)
      .lt('created_at', range.endISO)
      .order('created_at', { ascending: false }),
    getOrderCostOverrides(),
    getManualOrders(range),
  ])

  const overrideByOrderId = new Map(overrides.map(o => [o.order_id, o.custo_override]))
  const orderIds = (orders ?? []).map(o => o.id)

  // Em lotes: com o mês inteiro (400+ pedidos) o `.in()` de uma vez só passa de
  // 15 KB de URL, a requisição falha e o cliente devolve `data: null` calado —
  // o mês inteiro aparecia com "sem custo". Ver IN_CHUNK_SIZE.
  type ItemRow = { id: string; order_id: string; product_title: string; quantity: number; sku: string | null }
  const items: ItemRow[] = []
  for (const chunk of chunkIds(orderIds)) {
    const { data, error } = await db
      .from('order_items')
      .select('id, order_id, product_title, quantity, sku')
      .in('order_id', chunk)
    if (error) { console.error('[custos] lote de order_items falhou:', error); continue }
    items.push(...((data ?? []) as ItemRow[]))
  }

  const rows: OrderCostRow[] = (orders ?? []).map(o => {
    const orderItems = items.filter(i => i.order_id === o.id)
    const mappings = readMappings(o.metadata as Record<string, unknown> | null)
    let autoCusto = 0
    let unmatchedCount = 0
    for (const it of orderItems) {
      // Item do catálogo antigo NUNCA recebe custo por semelhança de texto —
      // o título é genérico ("Óculos de Sol Just Runner preto") e o matcher
      // casava com outro modelo a 0,750 de Jaccard, aplicando custo errado com
      // aparência de certo. Só vale o mapeamento manual (aba Mapeamento Legado).
      if (isLegacyItemTitle(it.product_title)) {
        const mapped = findMapping(mappings, it.sku)
        if (mapped) autoCusto += mappedLineCost(mapped, it.quantity)
        else unmatchedCount++
        continue
      }
      const cost = matchProductCost(it.product_title, costs)
      if (cost === null) unmatchedCount++
      else autoCusto += cost * it.quantity
    }
    const total = parseFloat(String(o.total ?? 0))
    const shippingAmount = parseFloat(String(o.shipping_amount ?? 0))
    return {
      id: o.id,
      externalId: o.external_id,
      status: o.status,
      createdAt: o.created_at,
      total,
      items: orderItems.map(i => {
        if (isLegacyItemTitle(i.product_title)) {
          const mapped = findMapping(mappings, i.sku)
          return {
            title: i.product_title,
            qty: i.quantity,
            unitCost: mapped?.unit_cost ?? null,
            supplierId: mapped?.supplier_id ?? null,
            modelName: mapped ? `${mapped.product_name} ${mapped.variant_name ?? ''}`.trim() : i.product_title,
            isLegacy: true as const,
            mapped: !!mapped,
          }
        }
        const match = matchProductCostRecord(i.product_title, costs)
        return {
          title: i.product_title.replace(/^\[[^\]]*\]\s*/, ''),
          qty: i.quantity,
          unitCost: match?.cost ?? null,
          supplierId: match?.supplier_id ?? null,
          modelName: match?.model_name ?? i.product_title.replace(/^\[[^\]]*\]\s*/, ''),
        }
      }),
      autoCusto: unmatchedCount === orderItems.length ? null : autoCusto,
      unmatchedCount,
      overrideCusto: overrideByOrderId.get(o.id) ?? null,
      gatewayFee: computeGatewayFee(total, o.payment_method, settings),
      yampiFee: computeYampiFee(total, settings),
      freightCost: computeFreightCost(shippingAmount, settings),
      logisticsCost: settings.custo_logistica_pedido,
      paymentMethod: o.payment_method,
      isManual: false as const,
    }
  })

  const manualRows: OrderCostRow[] = manualOrders.map(o => {
    const orderItems = manualItems.filter(i => i.manual_order_id === o.id)
    const autoCusto = orderItems.reduce((s, i) => s + i.unit_cost * i.quantity, 0)
    return {
      id: o.id,
      externalId: o.order_number,
      status: 'manual',
      createdAt: o.created_at,
      total: o.total,
      items: orderItems.map(i => ({
        title: i.product_title, qty: i.quantity,
        supplierName: i.supplier_id ? supplierNameById.get(i.supplier_id) : null,
        unitCost: i.unit_cost, supplierId: i.supplier_id ?? null, modelName: i.product_title,
      })),
      autoCusto,
      unmatchedCount: 0,
      overrideCusto: null,
      gatewayFee: computeGatewayFee(o.total, o.payment_method, settings, o.installments),
      yampiFee: 0, // pedido manual via link não passa pelo checkout da Yampi
      freightCost: computeFreightCost(o.shipping_amount, settings),
      logisticsCost: settings.custo_logistica_pedido,
      paymentMethod: o.payment_method,
      isManual: true as const,
      customerName: o.customer_name,
    }
  })

  return [...rows, ...manualRows].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

/** Itens vendidos no período que o matcher não casa com nenhum custo — os
 *  mesmos que fazem o Dashboard mostrar "N pedido(s) sem custo". Agrupa pelo
 *  título limpo: [SO] e [OP] da mesma cor viram uma linha só, porque um
 *  cadastro cobre os dois. */
async function getMissingCostItems(
  range: { startISO: string; endISO: string },
  costs: Awaited<ReturnType<typeof getProductCosts>>,
): Promise<MissingCostItem[]> {
  const db = getAdminSupabase()
  const { data: orders } = await db.from('orders')
    .select('id, external_id')
    .eq('store_id', STORE_ID)
    .in('status', APPROVED_STATUSES)
    .gte('created_at', range.startISO)
    .lt('created_at', range.endISO)
  const extById = new Map((orders ?? []).map(o => [o.id, String(o.external_id ?? '')]))

  const byTitle = new Map<string, MissingCostItem>()
  for (const chunk of chunkIds([...extById.keys()])) {
    const { data, error } = await db.from('order_items')
      .select('order_id, product_title, quantity')
      .in('order_id', chunk)
    if (error) { console.error('[custos] lote de itens sem custo falhou:', error); continue }
    for (const it of data ?? []) {
      if (matchProductCost(it.product_title, costs) !== null) continue
      const legacy = isLegacyItemTitle(it.product_title)
      const title = legacy ? it.product_title.trim() : cleanCostTitle(it.product_title)
      let row = byTitle.get(title)
      if (!row) {
        const near = legacy ? null : closestProductCost(title, costs)
        row = {
          title, legacy, quantity: 0, orders: [],
          suggestedSupplierId: near?.supplier_id ?? null,
          nearestModel: near ? { name: near.model_name, cost: near.cost } : null,
        }
        byTitle.set(title, row)
      }
      row.quantity += it.quantity
      const ext = extById.get(it.order_id)
      if (ext && !row.orders.includes(ext)) row.orders.push(ext)
    }
  }
  return [...byTitle.values()].sort((a, b) => b.orders.length - a.orders.length)
}

function KpiCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ComponentType<{ size?: number; color?: string }>
  label: string
  value: string
  sub?: string
  color?: string
}) {
  return (
    <div style={{ background: 'var(--admin-card)', border: '1px solid var(--admin-border)', borderRadius: '12px', padding: '16px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
        <Icon size={13} color="var(--admin-text-muted)" />
        <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{label}</span>
      </div>
      <div style={{ fontSize: '22px', fontWeight: 700, color: color ?? 'var(--admin-text-main)', fontFamily: 'monospace', lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontSize: '11px', color: 'var(--admin-text-muted)', marginTop: '4px' }}>{sub}</div>}
    </div>
  )
}

function TabLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link href={href} style={{
      padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
      textDecoration: 'none',
      background: active ? 'var(--admin-accent)' : 'var(--admin-card)',
      color: active ? '#fff' : 'var(--admin-text-sec)',
      border: '1px solid var(--admin-border)',
    }}>
      {label}
    </Link>
  )
}

export default async function CustosPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; range?: string; from?: string; to?: string; fornecedor?: string }>
}) {
  const sp    = await searchParams
  const view  = sp.view === 'compras' ? 'compras' : sp.view === 'pedidos' ? 'pedidos'
    : sp.view === 'integracoes' ? 'integracoes' : sp.view === 'fornecedor-pedidos' ? 'fornecedor-pedidos'
    : sp.view === 'reposicao' ? 'reposicao' : sp.view === 'mapeamento' ? 'mapeamento'
    : sp.view === 'legado' ? 'legado' : 'custos'
  const range = getDateRangeFromSearchParams(sp)

  // Preserva o período (from/to/range) atual ao trocar de aba
  function tabHref(v: 'custos' | 'compras' | 'pedidos' | 'integracoes' | 'fornecedor-pedidos' | 'reposicao' | 'mapeamento' | 'legado') {
    const params = new URLSearchParams()
    if (sp.from) params.set('from', sp.from)
    if (sp.to)   params.set('to', sp.to)
    if (sp.range) params.set('range', sp.range)
    if (v !== 'custos') params.set('view', v)
    const qs = params.toString()
    return qs ? `?${qs}` : '?'
  }

  const [suppliers, costs, purchases, settings, supplierOrderItems, supplierMapping] = await Promise.all([
    getSuppliers(), getProductCosts(), getStockPurchases(), getCostSettings(), getSupplierOrderItems(), getSupplierMapping(),
  ])
  const stockSummary = summarizeStock(purchases)
  const orders = view === 'pedidos' ? await getOrdersCostData(range, costs, settings, suppliers) : []
  const missing = view === 'custos' ? await getMissingCostItems(range, costs) : []
  const [legacyQueue, catalog] = view === 'legado'
    ? await Promise.all([getLegacyQueue(range), getCatalogForPicker()])
    : [[], []]

  const selectedSupplierId = sp.fornecedor ?? suppliers[0]?.id ?? ''
  const restockReport = view === 'reposicao' && selectedSupplierId
    ? await getDailyRestockReport(range, selectedSupplierId, costs, supplierMapping)
    : null

  const fmtBrl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
  const totalInvested = purchases.reduce((s, p) => s + p.total_cost, 0)
  const totalUnits    = purchases.reduce((s, p) => s + p.quantity, 0)

  return (
    <div className="px-4 py-6 md:p-8" style={{ maxWidth: '1100px', margin: '0 auto' }}>
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--admin-text-main)', marginBottom: '4px' }}>Custo de Produtos</h1>
        <p style={{ fontSize: '14px', color: 'var(--admin-text-muted)' }}>
          Custo por fornecedor e registro de compras — cadastro independente do catálogo do site
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3" style={{ gap: '12px', marginBottom: '20px' }}>
        <KpiCard icon={Package}     label="Fornecedores"      value={String(suppliers.length)} sub={`${costs.length} modelos com custo cadastrado`} />
        <KpiCard icon={TrendingUp}  label="Unidades compradas" value={String(totalUnits)}        sub={`${purchases.length} pedido(s) registrado(s)`} />
        <KpiCard icon={DollarSign}  label="Total investido"    value={fmtBrl.format(totalInvested)} color="#16a34a" />
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <TabLink href={tabHref('custos')} label="Custo por Fornecedor" active={view === 'custos'} />
        <TabLink href={tabHref('compras')} label="Registrar Compra / Estoque" active={view === 'compras'} />
        <TabLink href={tabHref('pedidos')} label="Pedidos × Custo" active={view === 'pedidos'} />
        <TabLink href={tabHref('fornecedor-pedidos')} label="Pedidos a Fornecedores" active={view === 'fornecedor-pedidos'} />
        <TabLink href={tabHref('reposicao')} label="Reposição do Dia" active={view === 'reposicao'} />
        <TabLink href={tabHref('mapeamento')} label="Mapeamento de Fornecedores" active={view === 'mapeamento'} />
        <TabLink href={tabHref('legado')} label="Mapeamento Legado" active={view === 'legado'} />
        <TabLink href={tabHref('integracoes')} label="Integrações" active={view === 'integracoes'} />
      </div>

      {view === 'legado' && (
        <LegacyMappingTable
          orders={legacyQueue}
          catalog={catalog}
          suppliers={suppliers}
          costs={costs}
          supplierMapping={supplierMapping}
          rangeLabel={range.label}
        />
      )}

      {(view === 'pedidos' || view === 'reposicao') && (
        <p style={{ fontSize: '12px', color: 'var(--admin-text-muted)', marginTop: '-12px', marginBottom: '16px' }}>
          Período: {range.label} — use o filtro &quot;Período&quot; no topo da página pra mudar.
        </p>
      )}

      {view === 'custos' && (
        <CostManager suppliers={suppliers} costs={costs} missing={missing} rangeLabel={range.label} legacyHref={tabHref('legado')} />
      )}
      {view === 'compras' && <PurchaseManager suppliers={suppliers} costs={costs} purchases={purchases} stockSummary={stockSummary} />}
      {view === 'pedidos' && <OrdersCostTable orders={orders} suppliers={suppliers} />}
      {view === 'fornecedor-pedidos' && <SupplierOrderManager suppliers={suppliers} costs={costs} items={supplierOrderItems} />}
      {view === 'reposicao' && restockReport && (
        <DailyRestockReportView suppliers={suppliers} supplierId={selectedSupplierId} report={restockReport} />
      )}
      {view === 'mapeamento' && (
        <>
          <p style={{ fontSize: '12px', color: 'var(--admin-text-muted)', marginTop: '-8px', marginBottom: '16px' }}>
            Base de julho (01/07–21/07) — fornecedor principal calculado por maior volume, a partir dos pedidos enviados manualmente por fornecedor. Ver [[PROMPT CLAUDE 66]].
          </p>
          <SupplierMappingTable rows={supplierMapping} suppliers={suppliers} />
        </>
      )}
      {view === 'integracoes' && <IntegrationsManager settings={settings} />}
    </div>
  )
}
