'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2 } from 'lucide-react'
import type { Supplier, ProductCost, StockPurchase, StockSummaryRow } from '@/lib/admin/product-costs'

const fmtBrl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtDate = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString('pt-BR')

const inputStyle: React.CSSProperties = {
  background: 'var(--admin-bg)', border: '1px solid var(--admin-border)', borderRadius: '8px',
  padding: '8px 10px', fontSize: '13px', color: 'var(--admin-text-main)',
}
const btnStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: '6px',
  background: 'var(--admin-accent)', color: '#fff', border: 'none', borderRadius: '8px',
  padding: '8px 14px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
}

export function PurchaseManager({
  suppliers, costs, purchases, stockSummary,
}: {
  suppliers: Supplier[]; costs: ProductCost[]; purchases: StockPurchase[]; stockSummary: StockSummaryRow[]
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const today = new Date().toISOString().slice(0, 10)
  const [purchasedAt, setPurchasedAt] = useState(today)
  const [supplierId, setSupplierId] = useState('')
  const [modelName, setModelName] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [unitCost, setUnitCost] = useState('')

  // Só os modelos que já têm custo cadastrado PRO fornecedor escolhido —
  // garante que só dá pra selecionar produto+fornecedor que a gente conhece.
  const modelOptionsForSupplier = useMemo(
    () => [...new Set(costs.filter(c => c.supplier_id === supplierId).map(c => c.model_name))].sort(),
    [costs, supplierId],
  )

  function handleSupplierChange(id: string) {
    setSupplierId(id)
    setModelName('')
    setUnitCost('')
  }

  function handleModelChange(name: string) {
    setModelName(name)
    const match = costs.find(c => c.model_name === name && c.supplier_id === supplierId)
    if (match) setUnitCost(String(match.cost))
  }

  async function handleAddPurchase() {
    if (!modelName.trim() || !quantity || !unitCost) return
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/admin/stock-purchases', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purchasedAt, supplierId: supplierId || null, modelName: modelName.trim(),
          quantity: parseInt(quantity, 10), unitCost: parseFloat(unitCost.replace(',', '.')),
        }),
      })
      const data = await res.json()
      if (!data.ok) { setError(data.error ?? 'Erro ao registrar compra.'); return }
      setModelName(''); setQuantity('1'); setUnitCost('')
      router.refresh()
    } finally { setLoading(false) }
  }

  async function handleDelete(id: string) {
    setLoading(true)
    try {
      await fetch('/api/admin/stock-purchases', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      router.refresh()
    } finally { setLoading(false) }
  }

  const supplierName = (id: string | null) => suppliers.find(s => s.id === id)?.name ?? '—'
  const total = parseInt(quantity || '0', 10) * parseFloat((unitCost || '0').replace(',', '.'))

  return (
    <div>
      {/* Registrar compra */}
      <div style={{
        display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap', alignItems: 'center',
        background: 'var(--admin-card)', border: '1px solid var(--admin-border)', borderRadius: '12px', padding: '16px',
      }}>
        <input type="date" style={inputStyle} value={purchasedAt} onChange={e => setPurchasedAt(e.target.value)} />
        <select style={inputStyle} value={supplierId} onChange={e => handleSupplierChange(e.target.value)}>
          <option value="">Fornecedor…</option>
          {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select
          style={{ ...inputStyle, minWidth: '260px', flex: 1 }}
          value={modelName}
          disabled={!supplierId}
          onChange={e => handleModelChange(e.target.value)}
        >
          <option value="">{supplierId ? 'Produto…' : 'Escolha o fornecedor primeiro'}</option>
          {modelOptionsForSupplier.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <input style={{ ...inputStyle, width: '70px' }} placeholder="Qtd" inputMode="numeric"
          value={quantity} onChange={e => setQuantity(e.target.value)} />
        <input style={{ ...inputStyle, width: '100px' }} placeholder="Custo unit." inputMode="decimal"
          value={unitCost} onChange={e => setUnitCost(e.target.value)} />
        <span style={{ fontSize: '12px', color: 'var(--admin-text-muted)', minWidth: '90px' }}>
          Total: <strong style={{ color: 'var(--admin-text-main)' }}>{fmtBrl.format(isNaN(total) ? 0 : total)}</strong>
        </span>
        <button style={btnStyle} disabled={loading} onClick={handleAddPurchase}>
          <Plus size={14} /> Registrar compra
        </button>
      </div>

      {error && <div style={{ color: 'var(--admin-red)', fontSize: '13px', marginBottom: '12px' }}>{error}</div>}

      {/* Estoque (resumo por modelo) */}
      <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--admin-text-main)', marginBottom: '8px' }}>Estoque (total comprado por modelo)</h3>
      <div style={{ background: 'var(--admin-card)', border: '1px solid var(--admin-border)', borderRadius: '12px', overflow: 'hidden', marginBottom: '28px' }}>
        <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--admin-border)' }}>
              <th style={{ textAlign: 'left', padding: '10px 14px', color: 'var(--admin-text-muted)', fontWeight: 600 }}>Modelo</th>
              <th style={{ textAlign: 'right', padding: '10px 14px', color: 'var(--admin-text-muted)', fontWeight: 600 }}>Qtd. comprada</th>
              <th style={{ textAlign: 'right', padding: '10px 14px', color: 'var(--admin-text-muted)', fontWeight: 600 }}>Investido</th>
              <th style={{ textAlign: 'right', padding: '10px 14px', color: 'var(--admin-text-muted)', fontWeight: 600 }}>Última compra</th>
            </tr>
          </thead>
          <tbody>
            {stockSummary.length === 0 ? (
              <tr><td colSpan={4} style={{ padding: '24px', textAlign: 'center', color: 'var(--admin-text-muted)' }}>Nenhuma compra registrada ainda.</td></tr>
            ) : stockSummary.map(row => (
              <tr key={row.modelName} style={{ borderBottom: '1px solid var(--admin-border)' }}>
                <td style={{ padding: '8px 14px', color: 'var(--admin-text-main)' }}>{row.modelName}</td>
                <td style={{ padding: '8px 14px', textAlign: 'right', fontFamily: 'monospace', color: 'var(--admin-text-main)' }}>{row.totalQuantity}</td>
                <td style={{ padding: '8px 14px', textAlign: 'right', fontFamily: 'monospace', color: 'var(--admin-text-main)' }}>{fmtBrl.format(row.totalSpent)}</td>
                <td style={{ padding: '8px 14px', textAlign: 'right', color: 'var(--admin-text-muted)' }}>{fmtDate(row.lastPurchaseAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      {/* Histórico de compras */}
      <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--admin-text-main)', marginBottom: '8px' }}>Histórico de compras</h3>
      <div style={{ background: 'var(--admin-card)', border: '1px solid var(--admin-border)', borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--admin-border)' }}>
              <th style={{ textAlign: 'left', padding: '10px 14px', color: 'var(--admin-text-muted)', fontWeight: 600 }}>Data</th>
              <th style={{ textAlign: 'left', padding: '10px 14px', color: 'var(--admin-text-muted)', fontWeight: 600 }}>Modelo</th>
              <th style={{ textAlign: 'left', padding: '10px 14px', color: 'var(--admin-text-muted)', fontWeight: 600 }}>Fornecedor</th>
              <th style={{ textAlign: 'right', padding: '10px 14px', color: 'var(--admin-text-muted)', fontWeight: 600 }}>Qtd.</th>
              <th style={{ textAlign: 'right', padding: '10px 14px', color: 'var(--admin-text-muted)', fontWeight: 600 }}>Total</th>
              <th style={{ width: '40px' }} />
            </tr>
          </thead>
          <tbody>
            {purchases.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: 'var(--admin-text-muted)' }}>Nenhuma compra registrada ainda.</td></tr>
            ) : purchases.map(p => (
              <tr key={p.id} style={{ borderBottom: '1px solid var(--admin-border)' }}>
                <td style={{ padding: '8px 14px', color: 'var(--admin-text-muted)' }}>{fmtDate(p.purchased_at)}</td>
                <td style={{ padding: '8px 14px', color: 'var(--admin-text-main)' }}>{p.model_name}</td>
                <td style={{ padding: '8px 14px', color: 'var(--admin-text-main)' }}>{supplierName(p.supplier_id)}</td>
                <td style={{ padding: '8px 14px', textAlign: 'right', fontFamily: 'monospace', color: 'var(--admin-text-main)' }}>{p.quantity}</td>
                <td style={{ padding: '8px 14px', textAlign: 'right', fontFamily: 'monospace', color: 'var(--admin-text-main)' }}>{fmtBrl.format(p.total_cost)}</td>
                <td style={{ padding: '8px 14px' }}>
                  <button onClick={() => handleDelete(p.id)} disabled={loading}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--admin-text-muted)' }}>
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  )
}
