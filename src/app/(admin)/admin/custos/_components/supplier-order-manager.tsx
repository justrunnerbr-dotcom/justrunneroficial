'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, ClipboardPaste } from 'lucide-react'
import type { Supplier, ProductCost } from '@/lib/admin/product-costs'
import {
  type SupplierOrderItem, parseSupplierOrderPaste, deriveOrderStatus, suggestUnitCost, summarizeSupplierOrders,
} from '@/lib/admin/supplier-orders'

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

const STATUS_LABEL: Record<string, string> = {
  pendente: 'Pendente', completo: 'Completo', divergencia: 'Divergência', excesso: 'Excesso',
}
const STATUS_COLOR: Record<string, string> = {
  pendente: 'var(--admin-text-muted)', completo: '#16a34a', divergencia: '#dc2626', excesso: '#d97706',
}

type DraftRow = { modelName: string; quantity: string; unitCost: string }

function KpiMini({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ background: 'var(--admin-card)', border: '1px solid var(--admin-border)', borderRadius: '12px', padding: '14px 16px' }}>
      <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '6px' }}>{label}</div>
      <div style={{ fontSize: '20px', fontWeight: 700, color: color ?? 'var(--admin-text-main)', fontFamily: 'monospace' }}>{value}</div>
    </div>
  )
}

export function SupplierOrderManager({
  suppliers, costs, items,
}: {
  suppliers: Supplier[]; costs: ProductCost[]; items: SupplierOrderItem[]
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const today = new Date().toISOString().slice(0, 10)
  const [batchSupplierId, setBatchSupplierId] = useState('')
  const [batchDate, setBatchDate] = useState(today)
  const [pasteText, setPasteText] = useState('')
  const [draft, setDraft] = useState<DraftRow[]>([])
  const [filterSupplierId, setFilterSupplierId] = useState('')

  const modelOptionsForSupplier = useMemo(
    () => [...new Set(costs.filter(c => c.supplier_id === batchSupplierId).map(c => c.model_name))].sort(),
    [costs, batchSupplierId],
  )

  const summary = useMemo(
    () => summarizeSupplierOrders(filterSupplierId ? items.filter(i => i.supplier_id === filterSupplierId) : items),
    [items, filterSupplierId],
  )

  function handleProcessarPaste() {
    const parsed = parseSupplierOrderPaste(pasteText)
    const rows: DraftRow[] = parsed.map(p => {
      const cost = batchSupplierId ? suggestUnitCost(p.modelName, batchSupplierId, costs) : null
      return { modelName: p.modelName, quantity: String(p.quantity), unitCost: cost !== null ? String(cost) : '' }
    })
    setDraft(prev => [...prev, ...rows])
    setPasteText('')
  }

  function handleAddManualRow() {
    setDraft(prev => [...prev, { modelName: '', quantity: '1', unitCost: '' }])
  }

  function updateDraftRow(index: number, patch: Partial<DraftRow>) {
    setDraft(prev => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)))
  }

  function handleModelNameChange(index: number, name: string) {
    const cost = batchSupplierId ? suggestUnitCost(name, batchSupplierId, costs) : null
    updateDraftRow(index, { modelName: name, ...(cost !== null && !draft[index].unitCost ? { unitCost: String(cost) } : {}) })
  }

  function removeDraftRow(index: number) {
    setDraft(prev => prev.filter((_, i) => i !== index))
  }

  async function handleSaveDraft() {
    if (!batchSupplierId || !batchDate || draft.length === 0) return
    const validRows = draft.filter(r => r.modelName.trim() && parseInt(r.quantity, 10) > 0 && r.unitCost !== '')
    if (validRows.length === 0) { setError('Preencha modelo, quantidade e custo de pelo menos uma linha.'); return }

    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/admin/supplier-orders', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: validRows.map(r => ({
            supplierId: batchSupplierId, orderDate: batchDate, modelName: r.modelName.trim(),
            quantityOrdered: parseInt(r.quantity, 10), unitCost: parseFloat(r.unitCost.replace(',', '.')),
          })),
        }),
      })
      const data = await res.json()
      if (!data.ok) { setError(data.error ?? 'Erro ao salvar pedidos.'); return }
      setDraft([])
      router.refresh()
    } finally { setLoading(false) }
  }

  async function handleUpdateReceived(id: string, value: string) {
    const quantityReceived = value === '' ? null : parseInt(value, 10)
    setLoading(true)
    try {
      await fetch('/api/admin/supplier-orders', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, quantityReceived }),
      })
      router.refresh()
    } finally { setLoading(false) }
  }

  async function handleDelete(id: string) {
    setLoading(true)
    try {
      await fetch('/api/admin/supplier-orders', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      router.refresh()
    } finally { setLoading(false) }
  }

  const supplierName = (id: string) => suppliers.find(s => s.id === id)?.name ?? '—'
  const visibleItems = filterSupplierId ? items.filter(i => i.supplier_id === filterSupplierId) : items

  return (
    <div>
      {/* Lançar pedido do dia */}
      <div style={{
        background: 'var(--admin-card)', border: '1px solid var(--admin-border)', borderRadius: '12px',
        padding: '16px', marginBottom: '20px',
      }}>
        <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--admin-text-main)', marginBottom: '12px' }}>Lançar pedido do dia</h3>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <select style={inputStyle} value={batchSupplierId} onChange={e => setBatchSupplierId(e.target.value)}>
            <option value="">Fornecedor…</option>
            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <input type="date" style={inputStyle} value={batchDate} onChange={e => setBatchDate(e.target.value)} />
        </div>

        <textarea
          style={{ ...inputStyle, width: '100%', minHeight: '90px', fontFamily: 'monospace', resize: 'vertical', marginBottom: '8px' }}
          placeholder={'Cole a lista do fornecedor, ex:\nDartboard degrade = 1\nMinute cooper = 6'}
          value={pasteText}
          onChange={e => setPasteText(e.target.value)}
        />
        <div style={{ display: 'flex', gap: '8px', marginBottom: draft.length > 0 ? '16px' : 0 }}>
          <button style={btnStyle} disabled={!pasteText.trim()} onClick={handleProcessarPaste}>
            <ClipboardPaste size={14} /> Processar
          </button>
          <button
            style={{ ...btnStyle, background: 'var(--admin-card)', color: 'var(--admin-text-main)', border: '1px solid var(--admin-border)' }}
            onClick={handleAddManualRow}
          >
            <Plus size={14} /> Adicionar linha manual
          </button>
        </div>

        {draft.length > 0 && (
          <>
            <datalist id="supplier-order-model-options">
              {modelOptionsForSupplier.map(m => <option key={m} value={m} />)}
            </datalist>
            <div style={{ overflowX: 'auto', marginBottom: '12px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--admin-border)' }}>
                    <th style={{ textAlign: 'left', padding: '8px', color: 'var(--admin-text-muted)', fontWeight: 600 }}>Modelo</th>
                    <th style={{ textAlign: 'right', padding: '8px', color: 'var(--admin-text-muted)', fontWeight: 600 }}>Qtd.</th>
                    <th style={{ textAlign: 'right', padding: '8px', color: 'var(--admin-text-muted)', fontWeight: 600 }}>Custo unit.</th>
                    <th style={{ textAlign: 'right', padding: '8px', color: 'var(--admin-text-muted)', fontWeight: 600 }}>Subtotal</th>
                    <th style={{ width: '32px' }} />
                  </tr>
                </thead>
                <tbody>
                  {draft.map((row, i) => {
                    const qty = parseInt(row.quantity || '0', 10)
                    const cost = parseFloat((row.unitCost || '0').replace(',', '.'))
                    const subtotal = (isNaN(qty) ? 0 : qty) * (isNaN(cost) ? 0 : cost)
                    return (
                      <tr key={i} style={{ borderBottom: '1px solid var(--admin-border)' }}>
                        <td style={{ padding: '6px 8px' }}>
                          <input
                            style={{ ...inputStyle, width: '100%', minWidth: '220px' }}
                            list="supplier-order-model-options"
                            value={row.modelName}
                            onChange={e => handleModelNameChange(i, e.target.value)}
                          />
                        </td>
                        <td style={{ padding: '6px 8px' }}>
                          <input style={{ ...inputStyle, width: '60px', textAlign: 'right' }} inputMode="numeric"
                            value={row.quantity} onChange={e => updateDraftRow(i, { quantity: e.target.value })} />
                        </td>
                        <td style={{ padding: '6px 8px' }}>
                          <input style={{ ...inputStyle, width: '90px', textAlign: 'right' }} inputMode="decimal"
                            value={row.unitCost} onChange={e => updateDraftRow(i, { unitCost: e.target.value })} />
                        </td>
                        <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'monospace', color: 'var(--admin-text-main)' }}>
                          {fmtBrl.format(subtotal)}
                        </td>
                        <td style={{ padding: '6px 8px' }}>
                          <button onClick={() => removeDraftRow(i)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--admin-text-muted)' }}>
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <button style={btnStyle} disabled={loading || !batchSupplierId} onClick={handleSaveDraft}>
              <Plus size={14} /> Salvar {draft.length} pedido{draft.length > 1 ? 's' : ''}
            </button>
            {!batchSupplierId && (
              <span style={{ marginLeft: '10px', fontSize: '12px', color: 'var(--admin-red, #dc2626)' }}>Escolha o fornecedor antes de salvar.</span>
            )}
          </>
        )}

        {error && <div style={{ color: '#dc2626', fontSize: '13px', marginTop: '10px' }}>{error}</div>}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3" style={{ gap: '12px', marginBottom: '20px' }}>
        <KpiMini label="Total pedido" value={fmtBrl.format(summary.totalOrdered)} />
        <KpiMini label="Itens pendentes" value={String(summary.pendingCount)} />
        <KpiMini label="Itens em divergência" value={String(summary.divergenceCount)} color={summary.divergenceCount > 0 ? '#dc2626' : undefined} />
      </div>

      {/* Filtro + tabela */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', alignItems: 'center' }}>
        <select style={inputStyle} value={filterSupplierId} onChange={e => setFilterSupplierId(e.target.value)}>
          <option value="">Todos os fornecedores</option>
          {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      <div style={{ background: 'var(--admin-card)', border: '1px solid var(--admin-border)', borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--admin-border)' }}>
                <th style={{ textAlign: 'left', padding: '10px 14px', color: 'var(--admin-text-muted)', fontWeight: 600 }}>Data</th>
                <th style={{ textAlign: 'left', padding: '10px 14px', color: 'var(--admin-text-muted)', fontWeight: 600 }}>Fornecedor</th>
                <th style={{ textAlign: 'left', padding: '10px 14px', color: 'var(--admin-text-muted)', fontWeight: 600 }}>Modelo</th>
                <th style={{ textAlign: 'right', padding: '10px 14px', color: 'var(--admin-text-muted)', fontWeight: 600 }}>Pedida</th>
                <th style={{ textAlign: 'right', padding: '10px 14px', color: 'var(--admin-text-muted)', fontWeight: 600 }}>Recebida</th>
                <th style={{ textAlign: 'left', padding: '10px 14px', color: 'var(--admin-text-muted)', fontWeight: 600 }}>Status</th>
                <th style={{ textAlign: 'right', padding: '10px 14px', color: 'var(--admin-text-muted)', fontWeight: 600 }}>Subtotal</th>
                <th style={{ width: '40px' }} />
              </tr>
            </thead>
            <tbody>
              {visibleItems.length === 0 ? (
                <tr><td colSpan={8} style={{ padding: '24px', textAlign: 'center', color: 'var(--admin-text-muted)' }}>Nenhum pedido registrado ainda.</td></tr>
              ) : visibleItems.map(item => {
                const status = deriveOrderStatus(item.quantity_ordered, item.quantity_received)
                return (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--admin-border)' }}>
                    <td style={{ padding: '8px 14px', color: 'var(--admin-text-muted)' }}>{fmtDate(item.order_date)}</td>
                    <td style={{ padding: '8px 14px', color: 'var(--admin-text-main)' }}>{supplierName(item.supplier_id)}</td>
                    <td style={{ padding: '8px 14px', color: 'var(--admin-text-main)' }}>{item.model_name}</td>
                    <td style={{ padding: '8px 14px', textAlign: 'right', fontFamily: 'monospace', color: 'var(--admin-text-main)' }}>{item.quantity_ordered}</td>
                    <td style={{ padding: '8px 14px', textAlign: 'right' }}>
                      <input
                        type="number" inputMode="numeric" min={0}
                        style={{ ...inputStyle, width: '64px', textAlign: 'right' }}
                        defaultValue={item.quantity_received ?? ''}
                        placeholder="—"
                        onBlur={e => {
                          if (e.target.value === String(item.quantity_received ?? '')) return
                          handleUpdateReceived(item.id, e.target.value)
                        }}
                      />
                    </td>
                    <td style={{ padding: '8px 14px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: STATUS_COLOR[status] }}>{STATUS_LABEL[status]}</span>
                    </td>
                    <td style={{ padding: '8px 14px', textAlign: 'right', fontFamily: 'monospace', color: 'var(--admin-text-main)' }}>{fmtBrl.format(item.subtotal)}</td>
                    <td style={{ padding: '8px 14px' }}>
                      <button onClick={() => handleDelete(item.id)} disabled={loading}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--admin-text-muted)' }}>
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
