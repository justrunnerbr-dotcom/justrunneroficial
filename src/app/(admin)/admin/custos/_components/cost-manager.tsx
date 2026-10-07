'use client'

import { useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Pencil, Check, X, Search, AlertTriangle } from 'lucide-react'
import type { Supplier, ProductCost } from '@/lib/admin/product-costs'

export type MissingCostItem = {
  title: string
  legacy: boolean
  quantity: number
  orders: string[]
  suggestedSupplierId: string | null
  nearestModel: { name: string; cost: number } | null
}

const fmtBrl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

const inputStyle: React.CSSProperties = {
  background: 'var(--admin-bg)', border: '1px solid var(--admin-border)', borderRadius: '8px',
  padding: '8px 10px', fontSize: '13px', color: 'var(--admin-text-main)',
}
const btnStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: '6px',
  background: 'var(--admin-accent)', color: '#fff', border: 'none', borderRadius: '8px',
  padding: '8px 14px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
}
const iconBtnStyle: React.CSSProperties = {
  background: 'none', border: 'none', cursor: 'pointer', color: 'var(--admin-text-muted)', padding: '4px',
}

function EditableCostRow({
  row, onSave, onDelete, loading,
}: {
  row: ProductCost
  onSave: (id: string, newCost: number) => Promise<void>
  onDelete: (id: string) => void
  loading: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(String(row.cost))

  async function handleSave() {
    const parsed = parseFloat(value.replace(',', '.'))
    if (isNaN(parsed) || parsed < 0) return
    await onSave(row.id, parsed)
    setEditing(false)
  }

  return (
    <tr style={{ borderBottom: '1px solid var(--admin-border)' }}>
      <td style={{ padding: '8px 14px', color: 'var(--admin-text-main)' }}>{row.model_name}</td>
      <td style={{ padding: '8px 14px', textAlign: 'right' }}>
        {editing ? (
          <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end', alignItems: 'center' }}>
            <input
              autoFocus
              style={{ ...inputStyle, width: '90px', textAlign: 'right', padding: '4px 8px' }}
              value={value}
              inputMode="decimal"
              onChange={e => setValue(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false) }}
            />
            <button style={iconBtnStyle} onClick={handleSave} disabled={loading} title="Salvar">
              <Check size={14} color="#16a34a" />
            </button>
            <button style={iconBtnStyle} onClick={() => { setEditing(false); setValue(String(row.cost)) }} title="Cancelar">
              <X size={14} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setEditing(true)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--admin-text-main)', fontFamily: 'monospace', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            {fmtBrl.format(row.cost)}
            <Pencil size={11} color="var(--admin-text-muted)" />
          </button>
        )}
      </td>
      <td style={{ padding: '8px 14px' }}>
        <button onClick={() => onDelete(row.id)} disabled={loading} style={iconBtnStyle} title="Excluir">
          <Trash2 size={14} />
        </button>
      </td>
    </tr>
  )
}

function MissingCostPanel({ items, rangeLabel, legacyHref, onPick }: {
  items: MissingCostItem[]
  rangeLabel: string
  legacyHref: string
  onPick: (item: MissingCostItem) => void
}) {
  const orderCount = new Set(items.flatMap(i => i.orders)).size
  return (
    <div id="sem-custo" style={{
      marginBottom: '20px', background: 'var(--admin-card)', border: '1px solid var(--admin-alert)',
      borderRadius: '12px', overflow: 'hidden',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', borderBottom: '1px solid var(--admin-border)' }}>
        <AlertTriangle size={15} color="var(--admin-alert)" />
        <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--admin-text-main)' }}>
          Sem custo no período — {orderCount} pedido(s)
        </span>
        <span style={{ fontSize: '12px', color: 'var(--admin-text-muted)' }}>{rangeLabel}</span>
      </div>
      {items.map(it => (
        <div key={it.title} style={{
          display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap',
          padding: '10px 16px', borderBottom: '1px solid var(--admin-border)',
        }}>
          <div style={{ flex: 1, minWidth: '220px' }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--admin-text-main)' }}>{it.title}</div>
            <div style={{ fontSize: '11px', color: 'var(--admin-text-muted)', marginTop: '2px' }}>
              {it.quantity} un · pedido(s) {it.orders.map(o => `#${o}`).join(', ')}
              {it.nearestModel && <> · mais parecido: {it.nearestModel.name} ({fmtBrl.format(it.nearestModel.cost)})</>}
            </div>
          </div>
          {it.legacy ? (
            <Link href={legacyHref} style={{ ...btnStyle, textDecoration: 'none' }}>Mapear (catálogo antigo)</Link>
          ) : (
            <button style={btnStyle} onClick={() => onPick(it)}>
              <Plus size={14} /> Cadastrar custo
            </button>
          )}
        </div>
      ))}
    </div>
  )
}

export function CostManager({ suppliers, costs, missing = [], rangeLabel = '', legacyHref = '?view=legado' }: {
  suppliers: Supplier[]
  costs: ProductCost[]
  missing?: MissingCostItem[]
  rangeLabel?: string
  legacyHref?: string
}) {
  const router = useRouter()
  const formRef = useRef<HTMLDivElement>(null)
  const costInputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const [newSupplierName, setNewSupplierName] = useState('')
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id ?? '')
  const [modelName, setModelName] = useState('')
  const [cost, setCost] = useState('')

  const filteredCosts = useMemo(() => {
    const q = search.trim().toLowerCase()
    return q ? costs.filter(c => c.model_name.toLowerCase().includes(q)) : costs
  }, [costs, search])

  const bySupplier = useMemo(() => {
    const map = new Map<string, ProductCost[]>()
    for (const c of filteredCosts) {
      const list = map.get(c.supplier_id) ?? []
      list.push(c)
      map.set(c.supplier_id, list)
    }
    return map
  }, [filteredCosts])

  const totalBySupplier = useMemo(() => {
    const map = new Map<string, number>()
    for (const c of costs) map.set(c.supplier_id, (map.get(c.supplier_id) ?? 0) + 1)
    return map
  }, [costs])

  // Vem do quadro "Sem custo": preenche o modelo com o título do pedido (o
  // matcher casa exato) e o fornecedor do modelo mais parecido; o custo fica
  // vazio de propósito — o valor é ele quem diz.
  function pickMissing(item: MissingCostItem) {
    setModelName(item.title)
    if (item.suggestedSupplierId && suppliers.some(s => s.id === item.suggestedSupplierId)) setSupplierId(item.suggestedSupplierId)
    setCost('')
    setError(null)
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    setTimeout(() => costInputRef.current?.focus(), 300)
  }

  async function handleAddSupplier() {
    if (!newSupplierName.trim()) return
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/admin/suppliers', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newSupplierName.trim() }),
      })
      const data = await res.json()
      if (!data.ok) { setError(data.error ?? 'Erro ao criar fornecedor.'); return }
      setNewSupplierName('')
      setSupplierId(data.supplier.id)
      router.refresh()
    } finally { setLoading(false) }
  }

  async function handleAddCost() {
    if (!supplierId || !modelName.trim() || !cost) return
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/admin/product-costs', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ supplierId, modelName: modelName.trim(), cost: parseFloat(cost.replace(',', '.')) }),
      })
      const data = await res.json()
      if (!data.ok) { setError(data.error ?? 'Erro ao salvar custo.'); return }
      setModelName(''); setCost('')
      router.refresh()
    } finally { setLoading(false) }
  }

  async function handleUpdateCost(row: ProductCost, newCost: number) {
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/admin/product-costs', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ supplierId: row.supplier_id, modelName: row.model_name, cost: newCost }),
      })
      const data = await res.json()
      if (!data.ok) { setError(data.error ?? 'Erro ao atualizar custo.'); return }
      router.refresh()
    } finally { setLoading(false) }
  }

  async function handleDelete(id: string) {
    setLoading(true)
    try {
      await fetch('/api/admin/product-costs', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      router.refresh()
    } finally { setLoading(false) }
  }

  return (
    <div>
      {missing.length > 0 && (
        <MissingCostPanel items={missing} rangeLabel={rangeLabel} legacyHref={legacyHref} onPick={pickMissing} />
      )}

      {/* Novo fornecedor */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <input style={{ ...inputStyle, minWidth: '220px' }} placeholder="Novo fornecedor (ex: Zhang)"
          value={newSupplierName} onChange={e => setNewSupplierName(e.target.value)} />
        <button style={btnStyle} disabled={loading} onClick={handleAddSupplier}>
          <Plus size={14} /> Adicionar fornecedor
        </button>
      </div>

      {/* Fornecedor selecionado — governa tanto a visualização quanto onde o novo custo é adicionado */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '6px' }}>
          Fornecedor
        </label>
        <select style={{ ...inputStyle, minWidth: '220px', fontSize: '14px', fontWeight: 600 }} value={supplierId} onChange={e => setSupplierId(e.target.value)}>
          {suppliers.map(s => <option key={s.id} value={s.id}>{s.name} ({totalBySupplier.get(s.id) ?? 0} modelo(s))</option>)}
        </select>
      </div>

      {/* Novo custo */}
      <div ref={formRef} style={{
        display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center',
        background: 'var(--admin-card)', border: '1px solid var(--admin-border)', borderRadius: '12px', padding: '16px',
      }}>
        <input style={{ ...inputStyle, minWidth: '260px', flex: 1 }} placeholder="Modelo (ex: Dartboard Preta Lente Preta)"
          value={modelName} onChange={e => setModelName(e.target.value)} />
        <input ref={costInputRef} style={{ ...inputStyle, width: '110px' }} placeholder="Custo R$" inputMode="decimal"
          value={cost} onChange={e => setCost(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleAddCost() }} />
        <button style={btnStyle} disabled={loading} onClick={handleAddCost}>
          <Plus size={14} /> Adicionar custo pra {suppliers.find(s => s.id === supplierId)?.name ?? '—'}
        </button>
      </div>

      {/* Busca */}
      <div style={{ position: 'relative', marginBottom: '20px', maxWidth: '360px' }}>
        <Search size={14} color="var(--admin-text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
        <input
          style={{ ...inputStyle, width: '100%', paddingLeft: '34px' }}
          placeholder="Buscar modelo..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {error && <div style={{ color: 'var(--admin-red)', fontSize: '13px', marginBottom: '12px' }}>{error}</div>}

      {/* Tabela só do fornecedor selecionado */}
      {(() => {
        const rows = bySupplier.get(supplierId) ?? []
        if (rows.length === 0) {
          return (
            <div style={{ textAlign: 'center', padding: '48px', color: 'var(--admin-text-muted)', fontSize: '14px', background: 'var(--admin-card)', border: '1px solid var(--admin-border)', borderRadius: '12px' }}>
              {search ? 'Nenhum modelo encontrado pra essa busca.' : 'Nenhum custo cadastrado ainda pra esse fornecedor.'}
            </div>
          )
        }
        return (
          <div style={{ background: 'var(--admin-card)', border: '1px solid var(--admin-border)', borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--admin-border)' }}>
                  <th style={{ textAlign: 'left', padding: '10px 14px', color: 'var(--admin-text-muted)', fontWeight: 600 }}>Modelo</th>
                  <th style={{ textAlign: 'right', padding: '10px 14px', color: 'var(--admin-text-muted)', fontWeight: 600 }}>Custo</th>
                  <th style={{ width: '40px' }} />
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <EditableCostRow key={r.id} row={r} onSave={(id, newCost) => handleUpdateCost(r, newCost)} onDelete={handleDelete} loading={loading} />
                ))}
              </tbody>
            </table>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
