'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Check, X, RotateCcw, Trash2 } from 'lucide-react'
import { ManualOrderForm } from './manual-order-form'
import type { Supplier } from '@/lib/admin/product-costs'

const fmtBrl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtDate = (iso: string) => new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' })

const STATUS_LABEL: Record<string, { label: string; color: string; bg: string }> = {
  paid:               { label: 'Aprovado',  color: '#16a34a', bg: 'rgba(22,163,74,0.1)' },
  payment_confirmed:  { label: 'Aprovado',  color: '#16a34a', bg: 'rgba(22,163,74,0.1)' },
  invoiced:           { label: 'Faturado',  color: '#2563eb', bg: 'rgba(37,99,235,0.1)' },
  delivered:          { label: 'Entregue',  color: '#16a34a', bg: 'rgba(22,163,74,0.1)' },
  pending:            { label: 'Pendente',  color: '#d97706', bg: 'rgba(217,119,6,0.1)' },
  cancelled:          { label: 'Cancelado', color: '#dc2626', bg: 'rgba(220,38,38,0.1)' },
  refunded:           { label: 'Reembolsado', color: '#dc2626', bg: 'rgba(220,38,38,0.1)' },
}
function statusInfo(status: string) {
  return STATUS_LABEL[status] ?? { label: status, color: 'var(--admin-text-muted)', bg: 'var(--admin-card-hover)' }
}

const PAYMENT_LABEL: Record<string, string> = { pix: 'Pix', credit_card: 'Cartão', boleto: 'Boleto' }

export type OrderCostRow = {
  id: string
  externalId: string
  status: string
  createdAt: string
  total: number
  items: { title: string; qty: number; supplierName?: string | null }[]
  autoCusto: number | null
  unmatchedCount: number
  overrideCusto: number | null
  gatewayFee: number
  yampiFee: number
  freightCost: number
  paymentMethod: string | null
  isManual: boolean
  customerName?: string | null
}

function EditableCusto({ row, onSave, onClear, loading }: {
  row: OrderCostRow
  onSave: (orderId: string, value: number) => Promise<void>
  onClear: (orderId: string) => Promise<void>
  loading: boolean
}) {
  const [editing, setEditing] = useState(false)
  const current = row.overrideCusto ?? row.autoCusto
  const [value, setValue] = useState(String(current ?? ''))

  async function handleSave() {
    const parsed = parseFloat(value.replace(',', '.'))
    if (isNaN(parsed) || parsed < 0) return
    await onSave(row.id, parsed)
    setEditing(false)
  }

  if (editing) {
    return (
      <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end', alignItems: 'center' }}>
        <input
          autoFocus
          style={{ width: '80px', textAlign: 'right', padding: '4px 8px', background: 'var(--admin-bg)', border: '1px solid var(--admin-border)', borderRadius: '8px', fontSize: '12px', color: 'var(--admin-text-main)' }}
          value={value}
          inputMode="decimal"
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false) }}
        />
        <button onClick={handleSave} disabled={loading} style={{ background: 'none', border: 'none', cursor: 'pointer' }} title="Salvar">
          <Check size={13} color="#16a34a" />
        </button>
        <button onClick={() => setEditing(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }} title="Cancelar">
          <X size={13} color="var(--admin-text-muted)" />
        </button>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center' }}>
      {row.overrideCusto !== null && (
        <button onClick={() => onClear(row.id)} disabled={loading} title="Voltar pro cálculo automático" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
          <RotateCcw size={11} color="var(--admin-text-muted)" />
        </button>
      )}
      <button
        onClick={() => setEditing(true)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: current === null ? 'var(--admin-red)' : 'var(--admin-text-main)', fontFamily: 'monospace', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
      >
        {current === null ? 'sem custo' : fmtBrl.format(current)}
        <Pencil size={10} color="var(--admin-text-muted)" />
      </button>
      {row.overrideCusto !== null && <span style={{ fontSize: '9px', color: 'var(--admin-text-muted)' }}>manual</span>}
    </div>
  )
}

export function OrdersCostTable({ orders, suppliers }: { orders: OrderCostRow[]; suppliers: Supplier[] }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleSave(orderId: string, value: number) {
    setLoading(true)
    try {
      await fetch('/api/admin/order-cost-overrides', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, custoOverride: value }),
      })
      router.refresh()
    } finally { setLoading(false) }
  }

  async function handleClear(orderId: string) {
    setLoading(true)
    try {
      await fetch('/api/admin/order-cost-overrides', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      })
      router.refresh()
    } finally { setLoading(false) }
  }

  async function handleDeleteManual(id: string) {
    setLoading(true)
    try {
      await fetch('/api/admin/manual-orders', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      router.refresh()
    } finally { setLoading(false) }
  }

  const totals = orders.reduce((acc, o) => {
    const custo = o.overrideCusto ?? o.autoCusto ?? 0
    acc.valor += o.total
    acc.custo += custo
    acc.taxas += o.gatewayFee + o.yampiFee
    acc.frete += o.freightCost
    return acc
  }, { valor: 0, custo: 0, taxas: 0, frete: 0 })
  const margem = totals.valor - totals.custo - totals.taxas - totals.frete

  return (
    <div>
      <ManualOrderForm suppliers={suppliers} />

      {orders.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px', color: 'var(--admin-text-muted)', fontSize: '14px', background: 'var(--admin-card)', border: '1px solid var(--admin-border)', borderRadius: '12px' }}>
          Nenhum pedido aprovado nesse período.
        </div>
      ) : (
      <div style={{ background: 'var(--admin-card)', border: '1px solid var(--admin-border)', borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', minWidth: '960px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--admin-border)' }}>
                <th style={{ textAlign: 'left', padding: '10px 14px', color: 'var(--admin-text-muted)', fontWeight: 600 }}>Pedido</th>
                <th style={{ textAlign: 'left', padding: '10px 14px', color: 'var(--admin-text-muted)', fontWeight: 600 }}>Produtos</th>
                <th style={{ textAlign: 'left', padding: '10px 14px', color: 'var(--admin-text-muted)', fontWeight: 600 }}>Status</th>
                <th style={{ textAlign: 'left', padding: '10px 14px', color: 'var(--admin-text-muted)', fontWeight: 600 }}>Data/hora</th>
                <th style={{ textAlign: 'right', padding: '10px 14px', color: 'var(--admin-text-muted)', fontWeight: 600 }}>Valor</th>
                <th style={{ textAlign: 'right', padding: '10px 14px', color: 'var(--admin-text-muted)', fontWeight: 600 }}>Custo de Produto</th>
                <th style={{ textAlign: 'right', padding: '10px 14px', color: 'var(--admin-text-muted)', fontWeight: 600 }}>Taxas</th>
                <th style={{ textAlign: 'right', padding: '10px 14px', color: 'var(--admin-text-muted)', fontWeight: 600 }}>Frete</th>
                <th style={{ textAlign: 'right', padding: '10px 14px', color: 'var(--admin-text-muted)', fontWeight: 600 }}>Margem</th>
                <th style={{ width: '32px' }} />
              </tr>
            </thead>
            <tbody>
              {orders.map(o => {
                const s = statusInfo(o.status)
                const custo = o.overrideCusto ?? o.autoCusto
                const taxas = o.gatewayFee + o.yampiFee
                const margemLinha = custo !== null ? o.total - custo - taxas - o.freightCost : null
                return (
                  <tr key={o.id} style={{ borderBottom: '1px solid var(--admin-border)' }}>
                    <td style={{ padding: '8px 14px', color: 'var(--admin-text-main)', fontWeight: 600 }}>#{o.externalId}</td>
                    <td style={{ padding: '8px 14px', color: 'var(--admin-text-sec)', maxWidth: '220px' }}>
                      {o.items.map((it, idx) => (
                        <div key={idx} style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {it.qty}× {it.title}
                          {it.supplierName && <span style={{ color: 'var(--admin-text-muted)' }}> ({it.supplierName})</span>}
                        </div>
                      ))}
                    </td>
                    <td style={{ padding: '8px 14px' }}>
                      {o.isManual ? (
                        <span style={{ fontSize: '10px', fontWeight: 700, color: '#a855f7', background: 'rgba(168,85,247,0.12)', padding: '3px 8px', borderRadius: '20px' }}>Manual via link</span>
                      ) : (
                        <span style={{ fontSize: '10px', fontWeight: 600, color: s.color, background: s.bg, padding: '3px 8px', borderRadius: '20px' }}>{s.label}</span>
                      )}
                      {o.paymentMethod && (
                        <div style={{ fontSize: '10px', color: 'var(--admin-text-muted)', marginTop: '3px' }}>
                          {PAYMENT_LABEL[o.paymentMethod] ?? o.paymentMethod}{o.customerName ? ` · ${o.customerName}` : ''}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '8px 14px', color: 'var(--admin-text-muted)', whiteSpace: 'nowrap' }}>{fmtDate(o.createdAt)}</td>
                    <td style={{ padding: '8px 14px', textAlign: 'right', fontFamily: 'monospace', color: 'var(--admin-text-main)' }}>{fmtBrl.format(o.total)}</td>
                    <td style={{ padding: '8px 14px', textAlign: 'right' }}>
                      {o.isManual
                        ? <span style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--admin-text-main)' }}>{fmtBrl.format(o.autoCusto ?? 0)}</span>
                        : <EditableCusto row={o} onSave={handleSave} onClear={handleClear} loading={loading} />}
                    </td>
                    <td style={{ padding: '8px 14px', textAlign: 'right', fontFamily: 'monospace', color: 'var(--admin-text-muted)' }} title="AppMax + Yampi">
                      {fmtBrl.format(taxas)}
                    </td>
                    <td style={{ padding: '8px 14px', textAlign: 'right', fontFamily: 'monospace', color: 'var(--admin-text-muted)' }}>
                      {fmtBrl.format(o.freightCost)}
                    </td>
                    <td style={{ padding: '8px 14px', textAlign: 'right', fontFamily: 'monospace', color: margemLinha === null ? 'var(--admin-text-muted)' : margemLinha >= 0 ? '#16a34a' : 'var(--admin-red)' }}>
                      {margemLinha === null ? '—' : fmtBrl.format(margemLinha)}
                    </td>
                    <td style={{ padding: '8px 14px' }}>
                      {o.isManual && (
                        <button onClick={() => handleDeleteManual(o.id)} disabled={loading} title="Excluir pedido manual"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--admin-text-muted)' }}>
                          <Trash2 size={13} />
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: '2px solid var(--admin-border)', fontWeight: 700 }}>
                <td colSpan={4} style={{ padding: '10px 14px', color: 'var(--admin-text-main)' }}>Total ({orders.length} pedidos)</td>
                <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: 'monospace', color: 'var(--admin-text-main)' }}>{fmtBrl.format(totals.valor)}</td>
                <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: 'monospace', color: 'var(--admin-text-main)' }}>{fmtBrl.format(totals.custo)}</td>
                <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: 'monospace', color: 'var(--admin-text-main)' }}>{fmtBrl.format(totals.taxas)}</td>
                <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: 'monospace', color: 'var(--admin-text-main)' }}>{fmtBrl.format(totals.frete)}</td>
                <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: 'monospace', color: margem >= 0 ? '#16a34a' : 'var(--admin-red)' }}>{fmtBrl.format(margem)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
      )}
    </div>
  )
}
