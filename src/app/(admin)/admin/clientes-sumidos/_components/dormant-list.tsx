'use client'

import { MessageCircle } from 'lucide-react'

export interface DormantCustomer {
  email:          string
  name:           string | null
  totalSpent:     number
  ordersCount:    number
  daysSinceOrder: number
  whatsappUrl:    string | null
}

export function DormantList({ customers }: { customers: DormantCustomer[] }) {
  const fmtBrl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

  if (customers.length === 0) {
    return (
      <div style={{ background: 'var(--admin-card)', border: '1px solid var(--admin-border)', borderRadius: '16px', padding: '48px', textAlign: 'center' }}>
        <div style={{ fontSize: '15px', color: 'var(--admin-text-muted)' }}>Nenhum cliente sumido no momento 🎉</div>
      </div>
    )
  }

  return (
    <div style={{ background: 'var(--admin-card)', border: '1px solid var(--admin-border)', borderRadius: '16px', overflow: 'hidden' }}>
      {customers.map((c, idx) => (
        <div
          key={c.email}
          style={{
            display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 20px',
            borderBottom: idx < customers.length - 1 ? '1px solid var(--admin-border)' : 'none',
          }}
        >
          <div style={{ flex: 1, minWidth: '180px' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--admin-text-main)' }}>{c.name ?? c.email}</div>
            <div style={{ fontSize: '12px', color: 'var(--admin-text-sec)', marginTop: '1px' }}>
              {c.ordersCount} {c.ordersCount === 1 ? 'compra' : 'compras'} · sumiu há {c.daysSinceOrder} dias
            </div>
          </div>

          <div style={{ textAlign: 'right', minWidth: '110px' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--admin-text-main)', fontFamily: 'monospace' }}>{fmtBrl.format(c.totalSpent)}</div>
            <div style={{ fontSize: '11px', color: 'var(--admin-text-muted)', marginTop: '1px' }}>já gastou</div>
          </div>

          <button
            onClick={() => c.whatsappUrl && window.open(c.whatsappUrl, '_blank')}
            disabled={!c.whatsappUrl}
            title={c.whatsappUrl ? 'Abrir WhatsApp com mensagem pronta' : 'Cliente sem telefone'}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0,
              background: c.whatsappUrl ? '#16a34a' : 'var(--admin-bg)',
              color: c.whatsappUrl ? '#fff' : 'var(--admin-text-muted)',
              border: 'none', borderRadius: '20px', padding: '8px 16px',
              fontSize: '12px', fontWeight: 600,
              cursor: c.whatsappUrl ? 'pointer' : 'not-allowed',
              whiteSpace: 'nowrap',
            }}
          >
            <MessageCircle size={14} /> Chamar no WhatsApp
          </button>
        </div>
      ))}
    </div>
  )
}
