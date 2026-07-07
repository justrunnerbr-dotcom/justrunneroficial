import Link from 'next/link'
import { Users, DollarSign } from 'lucide-react'
import { getAdminSupabase } from '@/lib/admin-client'
import { JHF_STORE_ID } from '@/lib/yampi/sync'
import { buildWinbackWhatsappUrl } from '@/lib/yampi/customer-stats'
import { DormantList } from './_components/dormant-list'
import { SyncCustomersButton } from './_components/sync-customers-button'
import { KanbanBoard, type KanbanCustomer } from './_components/kanban-board'

export const metadata = { title: 'Clientes Sumidos · JHF Admin' }

const DORMANT_THRESHOLD_DAYS = 45
const PER_PAGE = 50

type BucketKey = '45-60' | '60-90' | '90-180' | '180+'

const BUCKET_DEFS: { key: BucketKey; label: string; color: string; test: (d: number) => boolean }[] = [
  { key: '45-60',  label: '45-60 dias',  color: '#22c55e', test: d => d >= 45  && d < 60 },
  { key: '60-90',  label: '60-90 dias',  color: '#eab308', test: d => d >= 60  && d < 90 },
  { key: '90-180', label: '90-180 dias', color: '#f97316', test: d => d >= 90  && d < 180 },
  { key: '180+',   label: '+180 dias',   color: '#ef4444', test: d => d >= 180 },
]

function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
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

function BucketFilter({ href, color, label, count, active }: { href: string; color: string; label: string; count: number; active: boolean }) {
  return (
    <Link
      href={href}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px',
        color: active ? 'var(--admin-text-main)' : 'var(--admin-text-sec)',
        textDecoration: 'none', padding: '6px 12px', borderRadius: '20px',
        background: active ? 'var(--admin-bg)' : 'transparent',
        border: active ? '1px solid var(--admin-border)' : '1px solid transparent',
        fontWeight: active ? 700 : 400,
      }}
    >
      {color && <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, display: 'inline-block' }} />}
      {label}: <strong style={{ color: 'var(--admin-text-main)' }}>{count}</strong>
    </Link>
  )
}

function ViewToggle({ view, bucket }: { view: 'lista' | 'kanban'; bucket?: string }) {
  function hrefFor(v: 'lista' | 'kanban') {
    const params = new URLSearchParams()
    if (v === 'kanban') params.set('view', 'kanban')
    if (bucket && v === 'lista') params.set('bucket', bucket)
    const qs = params.toString()
    return qs ? `?${qs}` : '?'
  }
  const btnStyle = (active: boolean): React.CSSProperties => ({
    padding: '7px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 600,
    textDecoration: 'none',
    background: active ? 'var(--admin-accent)' : 'var(--admin-card)',
    color: active ? '#fff' : 'var(--admin-text-sec)',
    border: '1px solid var(--admin-border)',
  })
  return (
    <div style={{ display: 'flex', gap: '6px' }}>
      <Link href={hrefFor('lista')} style={btnStyle(view === 'lista')}>Lista</Link>
      <Link href={hrefFor('kanban')} style={btnStyle(view === 'kanban')}>Kanban</Link>
    </div>
  )
}

function Pagination({ totalPages, currentPage, bucket }: { totalPages: number; currentPage: number; bucket?: string }) {
  if (totalPages <= 1) return null

  function hrefFor(page: number) {
    const params = new URLSearchParams()
    if (bucket) params.set('bucket', bucket)
    if (page > 1) params.set('page', String(page))
    const qs = params.toString()
    return qs ? `?${qs}` : '?'
  }

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1)

  return (
    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '16px' }}>
      {pages.map(p => (
        <Link
          key={p}
          href={hrefFor(p)}
          style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            minWidth: '32px', height: '32px', borderRadius: '8px', fontSize: '12px', fontWeight: 600,
            textDecoration: 'none', padding: '0 8px',
            background: p === currentPage ? 'var(--admin-accent)' : 'var(--admin-card)',
            color: p === currentPage ? '#fff' : 'var(--admin-text-sec)',
            border: '1px solid var(--admin-border)',
          }}
        >
          {p}
        </Link>
      ))}
    </div>
  )
}

export default async function ClientesSumidosPage({
  searchParams,
}: {
  searchParams: Promise<{ bucket?: string; page?: string; view?: string }>
}) {
  const sp     = await searchParams
  const bucket = (sp.bucket as BucketKey | undefined)
  const page   = Math.max(1, parseInt(sp.page ?? '1', 10) || 1)
  const view   = sp.view === 'kanban' ? 'kanban' : 'lista'

  const db = getAdminSupabase()
  const [{ data }, { data: contactLog }] = await Promise.all([
    db.from('customer_purchase_stats')
      .select('email, name, phone_whatsapp_link, total_spent, orders_count, last_order_at, synced_at')
      .eq('store_id', JHF_STORE_ID)
      .not('last_order_at', 'is', null),
    db.from('customer_contact_log')
      .select('email, bucket')
      .eq('store_id', JHF_STORE_ID),
  ])

  const rows = data ?? []
  const lastSync = rows.length > 0
    ? rows.reduce((max, r) => (r.synced_at > max ? r.synced_at : max), rows[0].synced_at)
    : null

  const contactedMap = new Map((contactLog ?? []).map(c => [c.email, c.bucket as BucketKey]))

  const dormant = rows
    .map(r => {
      const daysSinceOrder = daysSince(r.last_order_at as string)
      const liveBucket     = BUCKET_DEFS.find(b => b.test(daysSinceOrder))?.key ?? '180+'
      const frozenBucket   = contactedMap.get(r.email)
      return {
        email:          r.email,
        name:           r.name,
        totalSpent:     r.total_spent,
        ordersCount:    r.orders_count,
        daysSinceOrder,
        whatsappUrl:    buildWinbackWhatsappUrl({ name: r.name, phoneWhatsappLink: r.phone_whatsapp_link, daysSinceOrder }),
        contacted:      !!frozenBucket,
        bucketKey:      frozenBucket ?? liveBucket,
      }
    })
    .filter(c => c.daysSinceOrder >= DORMANT_THRESHOLD_DAYS)
    .sort((a, b) => b.totalSpent - a.totalSpent)

  const bucketCounts = Object.fromEntries(
    BUCKET_DEFS.map(b => [b.key, dormant.filter(c => b.test(c.daysSinceOrder)).length]),
  ) as Record<BucketKey, number>

  const activeBucketDef = BUCKET_DEFS.find(b => b.key === bucket)
  const filtered = activeBucketDef ? dormant.filter(c => activeBucketDef.test(c.daysSinceOrder)) : dormant

  const totalPages   = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const currentPage  = Math.min(page, totalPages)
  const pageItems    = filtered.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE)

  const totalValue = dormant.reduce((s, c) => s + c.totalSpent, 0)
  const fmtBrl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

  const kanbanCustomers: KanbanCustomer[] = dormant.map(c => ({
    email:          c.email,
    name:           c.name,
    totalSpent:     c.totalSpent,
    ordersCount:    c.ordersCount,
    daysSinceOrder: c.daysSinceOrder,
    whatsappUrl:    c.whatsappUrl,
    bucket:         c.bucketKey,
    contacted:      c.contacted,
  }))

  return (
    <div style={{ padding: '32px', maxWidth: view === 'kanban' ? '100%' : '1000px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--admin-text-main)', marginBottom: '4px' }}>Clientes Sumidos</h1>
          <p style={{ fontSize: '14px', color: 'var(--admin-text-muted)' }}>
            Clientes sem comprar há mais de {DORMANT_THRESHOLD_DAYS} dias — chame de volta no WhatsApp
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <ViewToggle view={view} bucket={bucket} />
          <SyncCustomersButton lastSync={lastSync} />
        </div>
      </div>

      {rows.length === 0 ? (
        <div style={{ background: 'var(--admin-card)', border: '1px solid var(--admin-border)', borderRadius: '16px', padding: '48px', textAlign: 'center' }}>
          <div style={{ fontSize: '15px', color: 'var(--admin-text-muted)', marginBottom: '6px' }}>Nenhum dado sincronizado ainda</div>
          <div style={{ fontSize: '13px', color: 'var(--admin-text-muted)' }}>Clique em &quot;Sincronizar clientes&quot; pra puxar o histórico de compras da Yampi.</div>
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '14px' }}>
            <KpiCard icon={Users}       label="Clientes sumidos"     value={String(dormant.length)}      sub={`sem comprar há +${DORMANT_THRESHOLD_DAYS} dias`} />
            <KpiCard icon={DollarSign}  label="Já gastaram com você" value={fmtBrl.format(totalValue)}   sub="valor a reconquistar" color="#16a34a" />
          </div>

          {view === 'kanban' ? (
            <>
              <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: '16px' }}>
                {BUCKET_DEFS.map(b => (
                  <span key={b.key} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--admin-text-sec)' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: b.color, display: 'inline-block' }} />
                    {b.label}: <strong style={{ color: 'var(--admin-text-main)' }}>{bucketCounts[b.key]}</strong>
                  </span>
                ))}
              </div>
              <KanbanBoard customers={kanbanCustomers} />
            </>
          ) : (
            <>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
                <BucketFilter href="?" color="" label="Todos" count={dormant.length} active={!bucket} />
                {BUCKET_DEFS.map(b => (
                  <BucketFilter key={b.key} href={`?bucket=${b.key}`} color={b.color} label={b.label} count={bucketCounts[b.key]} active={bucket === b.key} />
                ))}
              </div>

              <div style={{ fontSize: '12px', color: 'var(--admin-text-muted)', marginBottom: '10px' }}>
                {filtered.length} cliente(s) {activeBucketDef ? `em ${activeBucketDef.label}` : 'no total'} · página {currentPage} de {totalPages}
              </div>

              <DormantList customers={pageItems} />

              <Pagination totalPages={totalPages} currentPage={currentPage} bucket={bucket} />
            </>
          )}
        </>
      )}
    </div>
  )
}
