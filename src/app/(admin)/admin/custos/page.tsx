import Link from 'next/link'
import { Package, DollarSign, TrendingUp } from 'lucide-react'
import { getAdminSupabase } from '@/lib/admin-client'
import { getDateRangeFromSearchParams } from '@/lib/admin/date-range'
import {
  getSuppliers, getProductCosts, getStockPurchases, summarizeStock,
  matchProductCost, getOrderCostOverrides,
} from '@/lib/admin/product-costs'
import { getCostSettings, computeGatewayFee, computeYampiFee, computeFreightCost } from '@/lib/admin/cost-settings'
import { getManualOrders } from '@/lib/admin/manual-orders'
import { getSupplierOrderItems } from '@/lib/admin/supplier-orders'
import { CostManager } from './_components/cost-manager'
import { PurchaseManager } from './_components/purchase-manager'
import { OrdersCostTable, type OrderCostRow } from './_components/orders-cost-table'
import { IntegrationsManager } from './_components/integrations-manager'
import { SupplierOrderManager } from './_components/supplier-order-manager'

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
      .select('id, external_id, status, total, shipping_amount, payment_method, created_at')
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
  const { data: items } = orderIds.length > 0
    ? await db.from('order_items').select('order_id, product_title, quantity').in('order_id', orderIds)
    : { data: [] as { order_id: string; product_title: string; quantity: number }[] }

  const rows: OrderCostRow[] = (orders ?? []).map(o => {
    const orderItems = items?.filter(i => i.order_id === o.id) ?? []
    let autoCusto = 0
    let unmatchedCount = 0
    for (const it of orderItems) {
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
      items: orderItems.map(i => ({ title: i.product_title.replace(/^\[JR\]\s*/, ''), qty: i.quantity })),
      autoCusto: unmatchedCount === orderItems.length ? null : autoCusto,
      unmatchedCount,
      overrideCusto: overrideByOrderId.get(o.id) ?? null,
      gatewayFee: computeGatewayFee(total, o.payment_method, settings),
      yampiFee: computeYampiFee(total, settings),
      freightCost: computeFreightCost(shippingAmount, settings),
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
      items: orderItems.map(i => ({ title: i.product_title, qty: i.quantity, supplierName: i.supplier_id ? supplierNameById.get(i.supplier_id) : null })),
      autoCusto,
      unmatchedCount: 0,
      overrideCusto: null,
      gatewayFee: computeGatewayFee(o.total, o.payment_method, settings, o.installments),
      yampiFee: 0, // pedido manual via link não passa pelo checkout da Yampi
      freightCost: computeFreightCost(o.shipping_amount, settings),
      paymentMethod: o.payment_method,
      isManual: true as const,
      customerName: o.customer_name,
    }
  })

  return [...rows, ...manualRows].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
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
  searchParams: Promise<{ view?: string; range?: string; from?: string; to?: string }>
}) {
  const sp    = await searchParams
  const view  = sp.view === 'compras' ? 'compras' : sp.view === 'pedidos' ? 'pedidos'
    : sp.view === 'integracoes' ? 'integracoes' : sp.view === 'fornecedor-pedidos' ? 'fornecedor-pedidos' : 'custos'
  const range = getDateRangeFromSearchParams(sp)

  // Preserva o período (from/to/range) atual ao trocar de aba
  function tabHref(v: 'custos' | 'compras' | 'pedidos' | 'integracoes' | 'fornecedor-pedidos') {
    const params = new URLSearchParams()
    if (sp.from) params.set('from', sp.from)
    if (sp.to)   params.set('to', sp.to)
    if (sp.range) params.set('range', sp.range)
    if (v !== 'custos') params.set('view', v)
    const qs = params.toString()
    return qs ? `?${qs}` : '?'
  }

  const [suppliers, costs, purchases, settings, supplierOrderItems] = await Promise.all([
    getSuppliers(), getProductCosts(), getStockPurchases(), getCostSettings(), getSupplierOrderItems(),
  ])
  const stockSummary = summarizeStock(purchases)
  const orders = view === 'pedidos' ? await getOrdersCostData(range, costs, settings, suppliers) : []

  const fmtBrl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
  const totalInvested = purchases.reduce((s, p) => s + p.total_cost, 0)
  const totalUnits    = purchases.reduce((s, p) => s + p.quantity, 0)

  return (
    <div className="px-4 py-6 md:p-8" style={{ maxWidth: '1100px' }}>
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
        <TabLink href={tabHref('integracoes')} label="Integrações" active={view === 'integracoes'} />
      </div>

      {view === 'pedidos' && (
        <p style={{ fontSize: '12px', color: 'var(--admin-text-muted)', marginTop: '-12px', marginBottom: '16px' }}>
          Período: {range.label} — use o filtro &quot;Período&quot; no topo da página pra mudar.
        </p>
      )}

      {view === 'custos' && <CostManager suppliers={suppliers} costs={costs} />}
      {view === 'compras' && <PurchaseManager suppliers={suppliers} costs={costs} purchases={purchases} stockSummary={stockSummary} />}
      {view === 'pedidos' && <OrdersCostTable orders={orders} suppliers={suppliers} />}
      {view === 'fornecedor-pedidos' && <SupplierOrderManager suppliers={suppliers} costs={costs} items={supplierOrderItems} />}
      {view === 'integracoes' && <IntegrationsManager settings={settings} />}
    </div>
  )
}
