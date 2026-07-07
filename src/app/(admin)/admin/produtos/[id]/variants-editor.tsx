'use client'
import { useState } from 'react'
import Image from 'next/image'
import { Save, CheckCircle, AlertCircle, GripVertical } from 'lucide-react'

interface VariantRow {
  id: string
  name: string
  sku: string
  price: number
  compare_price: number | null
  position: number
  yampi_product_id: string | null
}

interface ImageRow {
  id: string
  url: string
  variant_id: string | null
  position: number
  alt: string | null
}

interface RowState extends VariantRow {
  dirty:   boolean
  saving:  boolean
  status:  'ok' | 'err' | null
  error:   string
  yampi:   { ok: boolean; error?: string } | null
}

export function VariantsEditor({ variants, images }: { variants: VariantRow[]; images: ImageRow[] }) {
  const [rows, setRows] = useState<RowState[]>(() =>
    variants.map(v => ({ ...v, dirty: false, saving: false, status: null, error: '', yampi: null })),
  )

  function imageFor(variantId: string) {
    return images
      .filter(i => i.variant_id === variantId)
      .sort((a, b) => a.position - b.position)[0]
  }

  function update(id: string, patch: Partial<Pick<RowState, 'name' | 'position'>>) {
    setRows(rs => rs.map(r => (r.id === id ? { ...r, ...patch, dirty: true, status: null, yampi: null } : r)))
  }

  async function save(id: string) {
    const row = rows.find(r => r.id === id)
    if (!row) return

    if (!row.name.trim()) {
      setRows(rs => rs.map(r => (r.id === id ? { ...r, status: 'err', error: 'Nome não pode ser vazio.' } : r)))
      return
    }

    setRows(rs => rs.map(r => (r.id === id ? { ...r, saving: true, status: null, yampi: null } : r)))

    try {
      const res = await fetch(`/api/admin/variants/${id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ name: row.name.trim(), position: row.position }),
      })

      if (res.ok) {
        const body  = await res.json().catch(() => null)
        const yampi = body?.yampi?.attempted ? { ok: !!body.yampi.ok, error: body.yampi.error } : null

        setRows(rs => rs.map(r => (r.id === id ? { ...r, saving: false, dirty: false, status: 'ok', yampi } : r)))
        // Yampi failures stay visible past the 2.5s window — a drifted
        // catalog shouldn't disappear just because "Salvo" would have.
        setTimeout(() => setRows(rs => rs.map(r => (
          r.id === id ? { ...r, status: null, yampi: r.yampi?.ok ? null : r.yampi } : r
        ))), 2500)
      } else {
        const body = await res.json().catch(() => ({}))
        setRows(rs => rs.map(r => (r.id === id ? { ...r, saving: false, status: 'err', error: body.error ?? 'Erro ao salvar.' } : r)))
      }
    } catch {
      setRows(rs => rs.map(r => (r.id === id ? { ...r, saving: false, status: 'err', error: 'Falha de rede ao salvar.' } : r)))
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', height: '34px', padding: '0 10px',
    border: '1px solid var(--admin-border)', borderRadius: '7px', fontSize: '13px',
    color: 'var(--admin-text-main)', outline: 'none', background: 'var(--admin-bg)', boxSizing: 'border-box',
  }

  return (
    <div style={{ background: 'var(--admin-card)', borderRadius: '12px', border: '1px solid var(--admin-border)', overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--admin-border)' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--admin-text-main)', marginBottom: '6px' }}>
          Variações ({rows.length})
        </h3>
        <p style={{ fontSize: '11px', color: 'var(--admin-text-muted)', lineHeight: 1.5 }}>
          ⚠️ IDs da Yampi, SKU, preço e estoque não são alterados aqui. Alterações no nome atualizam o site público
          (PDP, seletor de variação, carrinho) e sincronizam automaticamente com a Yampi após salvar.
        </p>
      </div>

      <div>
        {rows.map(row => {
          const img = imageFor(row.id)
          return (
            <div
              key={row.id}
              style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '14px 20px', borderTop: '1px solid var(--admin-border)',
              }}
            >
              {/* Thumbnail */}
              <div style={{
                width: '48px', height: '48px', borderRadius: '8px', flexShrink: 0,
                background: 'var(--admin-bg)', position: 'relative', overflow: 'hidden',
                border: '1px solid var(--admin-border)',
              }}>
                {img
                  ? <Image src={img.url} alt={img.alt ?? row.name} fill style={{ objectFit: 'contain', padding: '4px' }} sizes="48px" />
                  : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: '9px', color: 'var(--admin-text-muted)', textAlign: 'center' }}>
                      sem foto
                    </div>
                  )}
              </div>

              {/* Name input */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <input
                  style={inputStyle}
                  value={row.name}
                  onChange={e => update(row.id, { name: e.target.value })}
                  placeholder="Nome da variação"
                />
                <div style={{ fontSize: '10px', color: 'var(--admin-text-muted)', fontFamily: 'monospace', marginTop: '4px' }}>
                  {row.sku}{row.yampi_product_id ? ` · yampi:${row.yampi_product_id}` : ''}
                </div>
              </div>

              {/* Position */}
              <div style={{ width: '64px', flexShrink: 0 }}>
                <label style={{ fontSize: '9px', color: 'var(--admin-text-muted)', display: 'flex', alignItems: 'center', gap: '2px', marginBottom: '4px' }}>
                  <GripVertical size={10} /> Ordem
                </label>
                <input
                  type="number"
                  style={{ ...inputStyle, textAlign: 'center' }}
                  value={row.position}
                  onChange={e => update(row.id, { position: Number(e.target.value) })}
                />
              </div>

              {/* Price (read-only) */}
              <div style={{ width: '90px', flexShrink: 0, textAlign: 'right' }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--admin-text-main)' }}>
                  R$ {row.price.toFixed(2).replace('.', ',')}
                </div>
                {row.compare_price && (
                  <div style={{ fontSize: '10px', color: 'var(--admin-text-muted)', textDecoration: 'line-through' }}>
                    R$ {row.compare_price.toFixed(2).replace('.', ',')}
                  </div>
                )}
              </div>

              {/* Save button + feedback */}
              <div style={{ width: '96px', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                <button
                  onClick={() => save(row.id)}
                  disabled={!row.dirty || row.saving}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '5px',
                    background: !row.dirty ? 'var(--admin-bg)' : row.saving ? '#818cf8' : '#4f46e5',
                    color: !row.dirty ? 'var(--admin-text-muted)' : '#ffffff',
                    border: !row.dirty ? '1px solid var(--admin-border)' : 'none',
                    padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 600,
                    cursor: (!row.dirty || row.saving) ? 'not-allowed' : 'pointer',
                  }}
                >
                  <Save size={11} />
                  {row.saving ? 'Salvando...' : 'Salvar'}
                </button>
                {row.status === 'ok' && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '10px', color: '#16a34a' }}>
                    <CheckCircle size={10} /> Salvo
                  </span>
                )}
                {row.status === 'err' && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '10px', color: '#dc2626', textAlign: 'right' }}>
                    <AlertCircle size={10} /> {row.error}
                  </span>
                )}
                {row.yampi && (
                  <span style={{
                    display: 'flex', alignItems: 'center', gap: '3px', fontSize: '10px', textAlign: 'right',
                    color: row.yampi.ok ? '#16a34a' : '#dc2626',
                  }}>
                    {row.yampi.ok ? <CheckCircle size={10} /> : <AlertCircle size={10} />}
                    {row.yampi.ok ? 'Yampi: sincronizado' : `Yampi: falhou${row.yampi.error ? ` — ${row.yampi.error}` : ''}`}
                  </span>
                )}
              </div>
            </div>
          )
        })}

        {rows.length === 0 && (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--admin-text-muted)', fontSize: '13px' }}>
            Nenhuma variante
          </div>
        )}
      </div>
    </div>
  )
}
