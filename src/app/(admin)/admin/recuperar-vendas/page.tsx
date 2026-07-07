import { ShoppingCart, DollarSign, CheckCircle2, Flame } from 'lucide-react'
import { getDateRangeFromSearchParams, rangeToUrlParams, type DateRange } from '@/lib/admin/date-range'
import { getAdminSupabase } from '@/lib/admin-client'
import { getAbandonedCarts, getRecoveredOrders, buildWhatsappUrl, type AbandonedCart } from '@/lib/yampi/carts'
import { JHF_STORE_ID } from '@/lib/yampi/sync'
import { RecoveryList } from './_components/recovery-list'
import { RefreshButton } from './_components/refresh-button'

export const metadata = { title: 'Recuperar Vendas · JHF Admin' }

// Cruza pelo yampi_product_id (id numérico do SKU na Yampi) — o texto do SKU da Yampi
// (ex: "JHFSO-...") não bate com o nosso variants.sku (ex: "JHF-..."), são convenções diferentes.
async function getImagesByYampiProductId(db: ReturnType<typeof getAdminSupabase>, carts: AbandonedCart[]): Promise<Record<string, string>> {
  const ids = Array.from(new Set(carts.flatMap(c => c.items.map(i => i.yampiProductId).filter((s): s is string => !!s))))
  if (ids.length === 0) return {}

  const { data: variants } = await db.from('variants').select('id, yampi_product_id, product_id').in('yampi_product_id', ids)
  if (!variants?.length) return {}

  const productIds = Array.from(new Set(variants.map(v => v.product_id)))
  const { data: images } = await db
    .from('images')
    .select('product_id, variant_id, url, position')
    .in('product_id', productIds)
    .order('position', { ascending: true })

  const byIdUrl: Record<string, string> = {}
  for (const v of variants) {
    const variantImg = images?.find(i => i.variant_id === v.id)
    const productImg = images?.find(i => i.product_id === v.product_id && !i.variant_id)
    const url = variantImg?.url ?? productImg?.url ?? images?.find(i => i.product_id === v.product_id)?.url
    if (url && v.yampi_product_id) byIdUrl[v.yampi_product_id] = url
  }
  return byIdUrl
}

// Prioridade de contato — baseado no tempo desde o abandono. A Yampi dispara o primeiro
// e-mail automático dela aos 30min (config/carts.email_hours_delay), então usamos a mesma
// janela como referência: antes disso o cliente pode ainda estar comprando; depois, é a
// hora ideal de agir; muito tempo depois, esfria.
export type ContactPriority = 'ideal' | 'ainda_vale' | 'esfriando' | 'aguardando'

const PRIORITY_RANK: Record<ContactPriority, number> = { ideal: 0, ainda_vale: 1, esfriando: 2, aguardando: 3 }

export function classifyPriority(minutesSince: number): ContactPriority {
  if (minutesSince < 30)   return 'aguardando'
  if (minutesSince < 360)  return 'ideal'       // 30min–6h
  if (minutesSince < 1440) return 'ainda_vale'  // 6h–24h
  return 'esfriando'
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

export default async function RecuperarVendasPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>
}) {
  const sp    = await searchParams
  const range: DateRange = getDateRangeFromSearchParams(sp)
  const { to: untilInclusive } = rangeToUrlParams(range)

  const db = getAdminSupabase()

  const carts = await getAbandonedCarts(range.start, untilInclusive)

  const [{ data: actionsData }, imagesByYampiId, recoveredOrders] = await Promise.all([
    db.from('recovery_actions').select('yampi_cart_id, status, contacted_at').eq('store_id', JHF_STORE_ID),
    getImagesByYampiProductId(db, carts),
    getRecoveredOrders(range.start, untilInclusive),
  ])

  // Sinal de recuperação = pedido aprovado com a tag utm_campaign "carrinho_abandonado"
  // que a própria Yampi/link de retomada do carrinho carrega — muito mais confiável que
  // cruzar por e-mail/telefone/CPF contra a lista atual (carrinho recuperado SAI da lista
  // de abandonados, então cruzar contra ela sozinha perde a maioria dos casos reais).
  const paidEmails = new Set(recoveredOrders.map(o => o.email))

  const actionsMap = new Map((actionsData ?? []).map(a => [a.yampi_cart_id, a]))

  const now = Date.now()
  const enrichedCarts = carts.map(cart => {
    const action         = actionsMap.get(cart.id)
    const autoRecovered  = !!cart.customerEmail && paidEmails.has(cart.customerEmail.toLowerCase())
    const recovered      = autoRecovered || action?.status === 'recovered_manual'
    const firstYampiId   = cart.items[0]?.yampiProductId
    const minutesSince   = (now - new Date(cart.createdAt).getTime()) / 60000
    return {
      ...cart,
      whatsappUrl:    buildWhatsappUrl(cart),
      recovered,
      autoRecovered,
      operatorStatus: action?.status ?? null,
      imageUrl:       (firstYampiId && imagesByYampiId[firstYampiId]) ?? null,
      priority:       classifyPriority(minutesSince),
    }
  }).sort((a, b) => {
    if (a.recovered !== b.recovered) return a.recovered ? 1 : -1
    const rankDiff = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]
    if (rankDiff !== 0) return rankDiff
    return b.totalValue - a.totalValue
  })

  const notRecovered = enrichedCarts.filter(c => !c.recovered)

  // Manual-only: marcado como recuperado na mão, mas sem pedido com a tag (evita contar 2x).
  const manualOnlyRecovered = enrichedCarts.filter(c => c.recovered && !c.autoRecovered)

  const totalAbandonedValue = notRecovered.reduce((s, c) => s + c.totalValue, 0)
  const totalRecoveredValue = recoveredOrders.reduce((s, o) => s + o.totalValue, 0) + manualOnlyRecovered.reduce((s, c) => s + c.totalValue, 0)
  const totalRecoveredCount = recoveredOrders.length + manualOnlyRecovered.length
  const readyNowCount       = notRecovered.filter(c => c.priority === 'ideal').length

  const fmtBrl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
  const statusLabels: Record<string, string> = {
    paid: 'Pago', invoiced: 'Faturado', on_carriage: 'Em transporte',
    preparing_shipping: 'Preparando', in_separation: 'Em separação',
    partially_separated: 'Parcialmente separado', in_transit: 'Em trânsito', delivered: 'Entregue',
  }

  return (
    <div style={{ padding: '32px', maxWidth: '1000px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--admin-text-main)', marginBottom: '4px' }}>Recuperar Vendas</h1>
          <p style={{ fontSize: '14px', color: 'var(--admin-text-muted)' }}>
            Carrinhos abandonados no checkout Yampi — chame o cliente no WhatsApp
          </p>
        </div>
        <RefreshButton />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
        <KpiCard icon={Flame}        label="Prontos pra contato agora" value={String(readyNowCount)}              sub="30min–6h desde o abandono" color={readyNowCount > 0 ? '#f97316' : undefined} />
        <KpiCard icon={DollarSign}    label="Em carrinhos abandonados" value={fmtBrl.format(totalAbandonedValue)} sub={`${notRecovered.length} carrinho(s)`} />
        <KpiCard icon={ShoppingCart}  label="Carrinhos abandonados"    value={String(enrichedCarts.length)}       sub={range.label} />
        <KpiCard icon={CheckCircle2} label="Recuperados"              value={fmtBrl.format(totalRecoveredValue)} sub={`${totalRecoveredCount} recuperado(s)`} color="#16a34a" />
      </div>

      <RecoveryList carts={enrichedCarts} />

      {recoveredOrders.length > 0 && (
        <div style={{ marginTop: '24px' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--admin-text-main)', marginBottom: '4px' }}>Pedidos recuperados no período</div>
          <div style={{ fontSize: '12px', color: 'var(--admin-text-muted)', marginBottom: '10px' }}>
            Pedidos aprovados com a tag de recuperação de carrinho abandonado da Yampi — inclui clientes que já saíram da lista de abandonados acima.
          </div>
          <div style={{ background: 'var(--admin-card)', border: '1px solid var(--admin-border)', borderRadius: '16px', overflow: 'hidden' }}>
            {recoveredOrders.map((o, idx) => (
              <div
                key={o.orderId}
                style={{
                  display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 20px',
                  borderBottom: idx < recoveredOrders.length - 1 ? '1px solid var(--admin-border)' : 'none',
                }}
              >
                <div style={{ flex: 1, minWidth: '160px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--admin-text-main)' }}>{o.name ?? 'Cliente'}</div>
                  <div style={{ fontSize: '11px', color: 'var(--admin-text-muted)' }}>{o.email}</div>
                </div>
                <span style={{ fontSize: '10px', fontWeight: 700, color: '#16a34a', background: 'rgba(22,163,74,0.1)', padding: '4px 10px', borderRadius: '20px', whiteSpace: 'nowrap' }}>
                  {statusLabels[o.status] ?? o.status}
                </span>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--admin-text-main)', fontFamily: 'monospace', minWidth: '90px', textAlign: 'right' }}>
                  {fmtBrl.format(o.totalValue)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
