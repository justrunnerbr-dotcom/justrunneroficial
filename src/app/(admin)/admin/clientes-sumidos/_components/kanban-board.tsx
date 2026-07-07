'use client'

import { useState } from 'react'
import { MessageCircle } from 'lucide-react'

export type BucketKey = '45-60' | '60-90' | '90-180' | '180+'

export interface KanbanCustomer {
  email:          string
  name:           string | null
  totalSpent:     number
  ordersCount:    number
  daysSinceOrder: number
  whatsappUrl:    string | null
  bucket:         BucketKey
  contacted:      boolean
}

const BUCKET_META: { key: BucketKey; label: string; color: string }[] = [
  { key: '45-60',  label: '45-60 dias',  color: '#22c55e' },
  { key: '60-90',  label: '60-90 dias',  color: '#eab308' },
  { key: '90-180', label: '90-180 dias', color: '#f97316' },
  { key: '180+',   label: '+180 dias',   color: '#ef4444' },
]

function CustomerCard({ customer, onCall }: { customer: KanbanCustomer; onCall: (c: KanbanCustomer) => void }) {
  const fmtBrl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
  return (
    <div style={{ background: 'var(--admin-bg)', border: '1px solid var(--admin-border)', borderRadius: '10px', padding: '12px', marginBottom: '10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', marginBottom: '4px' }}>
        <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--admin-text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {customer.name ?? customer.email}
        </span>
        <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--admin-text-main)', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
          {fmtBrl.format(customer.totalSpent)}
        </span>
      </div>
      <div style={{ fontSize: '11px', color: 'var(--admin-text-muted)', marginBottom: '8px' }}>
        {customer.ordersCount} {customer.ordersCount === 1 ? 'compra' : 'compras'} · sumiu há {customer.daysSinceOrder} dias
      </div>
      <button
        onClick={() => onCall(customer)}
        disabled={!customer.whatsappUrl}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', width: '100%',
          background: customer.whatsappUrl ? '#16a34a' : 'var(--admin-card)',
          color: customer.whatsappUrl ? '#fff' : 'var(--admin-text-muted)',
          border: 'none', borderRadius: '20px', padding: '7px 0',
          fontSize: '11px', fontWeight: 600,
          cursor: customer.whatsappUrl ? 'pointer' : 'not-allowed',
        }}
      >
        <MessageCircle size={12} /> Chamar no WhatsApp
      </button>
    </div>
  )
}

export function KanbanBoard({ customers: initial }: { customers: KanbanCustomer[] }) {
  const [customers, setCustomers] = useState(initial)

  function handleCall(customer: KanbanCustomer) {
    if (!customer.whatsappUrl) return
    window.open(customer.whatsappUrl, '_blank')

    setCustomers(prev => prev.map(c => c.email === customer.email ? { ...c, contacted: true } : c))

    fetch('/api/admin/recovery/contact-customer', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email: customer.email, bucket: customer.bucket }),
    }).catch(() => { /* best-effort, não bloqueia a UI */ })
  }

  const columns = BUCKET_META.flatMap(b => {
    const base      = customers.filter(c => c.bucket === b.key && !c.contacted)
    const contacted = customers.filter(c => c.bucket === b.key && c.contacted)
    const cols: { key: string; label: string; color: string; list: KanbanCustomer[] }[] =
      [{ key: b.key, label: b.label, color: b.color, list: base }]
    if (contacted.length > 0) {
      cols.push({ key: `${b.key}-contacted`, label: `${b.label} chamado`, color: b.color, list: contacted })
    }
    return cols
  })

  return (
    <div style={{ display: 'flex', gap: '14px', overflowX: 'auto', paddingBottom: '8px' }}>
      {columns.map(col => (
        <div key={col.key} style={{ flex: '0 0 260px', width: '260px', background: 'var(--admin-card)', border: '1px solid var(--admin-border)', borderRadius: '12px', overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '75vh' }}>
          <div style={{ borderTop: `3px solid ${col.color}`, padding: '12px 14px', borderBottom: '1px solid var(--admin-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: 'var(--admin-text-main)' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: col.color, display: 'inline-block' }} />
              {col.label}
            </span>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--admin-accent)' }}>{col.list.length}</span>
          </div>
          <div style={{ padding: '12px', overflowY: 'auto', flex: 1 }}>
            {col.list.length === 0
              ? <div style={{ fontSize: '11px', color: 'var(--admin-text-muted)', textAlign: 'center', padding: '20px 0' }}>Vazio</div>
              : col.list.map(c => <CustomerCard key={c.email} customer={c} onCall={handleCall} />)}
          </div>
        </div>
      ))}
    </div>
  )
}
