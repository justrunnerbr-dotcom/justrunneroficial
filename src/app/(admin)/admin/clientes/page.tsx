import { createClient } from '@supabase/supabase-js'
import { getDateRangeFromSearchParams, type DateRange } from '@/lib/admin/date-range'

const JHF_STORE_ID = 'b0000000-0000-0000-0000-000000000001'

function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  )
}

function fmt(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
}

async function getCustomers(range: DateRange) {
  const db = getDb()
  const { data } = await db
    .from('customers')
    .select('id, name, email, phone, total_orders, total_spent, created_at, source')
    .eq('store_id', JHF_STORE_ID)
    .gte('created_at', range.startISO)
    .lt('created_at', range.endISO)
    .order('created_at', { ascending: false })
    .limit(100)
  return data ?? []
}

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>
}) {
  const sp        = await searchParams
  const range     = getDateRangeFromSearchParams(sp)
  const customers = await getCustomers(range)

  const totalSpent = customers.reduce((s, c) => s + parseFloat(String(c.total_spent ?? 0)), 0)
  const withOrders = customers.filter(c => (c.total_orders ?? 0) > 0).length

  return (
    <div style={{ padding: '32px', maxWidth: '900px' }}>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--admin-text-main)', marginBottom: '4px' }}>Clientes</h1>
        <p style={{ fontSize: '14px', color: 'var(--admin-text-muted)' }}>
          {customers.length > 0
            ? `${customers.length} cliente${customers.length > 1 ? 's' : ''} — ${range.label}`
            : `Base de clientes — ${range.label}`}
        </p>
      </div>

      {customers.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
          {[
            { label: 'Novos clientes', value: String(customers.length) },
            { label: 'Com pedido',     value: String(withOrders) },
            { label: 'Receita total',  value: fmt(totalSpent) },
          ].map(m => (
            <div key={m.label} style={{ background: 'var(--admin-card)', borderRadius: '12px', border: '1px solid var(--admin-border)', padding: '18px' }}>
              <div style={{ fontSize: '12px', color: 'var(--admin-text-muted)', marginBottom: '6px' }}>{m.label}</div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--admin-text-main)' }}>{m.value}</div>
            </div>
          ))}
        </div>
      )}

      {customers.length > 0 ? (
        <div style={{ background: 'var(--admin-card)', borderRadius: '12px', border: '1px solid var(--admin-border)', overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1fr 0.8fr', gap: '12px', padding: '10px 20px', borderBottom: '1px solid var(--admin-border)', background: 'var(--admin-bg)' }}>
            {['Nome / E-mail', 'Telefone', 'Pedidos', 'Total gasto', 'Desde'].map(h => (
              <div key={h} style={{ fontSize: '11px', fontWeight: 600, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{h}</div>
            ))}
          </div>

          {customers.map((c, i) => (
            <div
              key={c.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1.5fr 1fr 1fr 0.8fr',
                gap: '12px',
                padding: '14px 20px',
                borderBottom: i < customers.length - 1 ? '1px solid #f8fafc' : 'none',
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--admin-text-main)' }}>{c.name ?? '—'}</div>
                <div style={{ fontSize: '11px', color: 'var(--admin-text-muted)' }}>{c.email}</div>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--admin-text-muted)' }}>{c.phone ?? '—'}</div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--admin-text-main)' }}>{c.total_orders ?? 0}</div>
              <div style={{ fontSize: '13px', color: '#16a34a', fontWeight: 600 }}>
                {c.total_spent ? fmt(parseFloat(String(c.total_spent))) : '—'}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--admin-text-muted)' }}>
                {c.created_at ? fmtDate(c.created_at) : '—'}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ background: 'var(--admin-card)', borderRadius: '12px', border: '1px solid var(--admin-border)', padding: '48px', textAlign: 'center' }}>
          <div style={{ fontSize: '32px', marginBottom: '16px' }}>👤</div>
          <h2 style={{ fontSize: '17px', fontWeight: 600, color: 'var(--admin-text-main)', marginBottom: '8px' }}>
            Nenhum cliente neste período
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--admin-text-muted)', maxWidth: '360px', margin: '0 auto', lineHeight: 1.6 }}>
            Nenhum cliente novo em <strong>{range.label}</strong>. Tente um período maior.
          </p>
        </div>
      )}
    </div>
  )
}
