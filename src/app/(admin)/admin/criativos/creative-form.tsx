'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Save, AlertCircle } from 'lucide-react'

const ANGLES = ['Oferta', 'Status', 'Dor', 'Identidade', 'Comparação', 'Escassez', 'UGC']

interface Opt { id: string; name: string }

export function CreativeForm({
  products, collections,
  initial,
}: {
  products: Opt[]; collections: Opt[];
  initial?: {
    id: string; name: string; angle: string | null; copy: string | null;
    headline: string | null; cta: string | null; status: string;
    product_id: string | null; collection_id: string | null; notes: string | null;
    cpm: number | null; ctr: number | null; cpc: number | null;
    atc_rate: number | null; ic_rate: number | null; cpa: number | null; roas: number | null;
  }
}) {
  const router = useRouter()
  const editing = !!initial

  const [form, setForm] = useState({
    name:          initial?.name ?? '',
    angle:         initial?.angle ?? '',
    headline:      initial?.headline ?? '',
    copy:          initial?.copy ?? '',
    cta:           initial?.cta ?? '',
    status:        initial?.status ?? 'active',
    product_id:    initial?.product_id ?? '',
    collection_id: initial?.collection_id ?? '',
    notes:         initial?.notes ?? '',
    cpm:           initial?.cpm?.toString() ?? '',
    ctr:           initial?.ctr?.toString() ?? '',
    cpc:           initial?.cpc?.toString() ?? '',
    atc_rate:      initial?.atc_rate?.toString() ?? '',
    ic_rate:       initial?.ic_rate?.toString() ?? '',
    cpa:           initial?.cpa?.toString() ?? '',
    roas:          initial?.roas?.toString() ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  function f(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(p => ({ ...p, [key]: e.target.value }))
  }

  function numOrNull(v: string) { const n = parseFloat(v); return isNaN(n) ? null : n }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setError('Nome é obrigatório.'); return }
    setSaving(true)
    setError('')

    const payload = {
      name:          form.name,
      angle:         form.angle || null,
      headline:      form.headline || null,
      copy:          form.copy || null,
      cta:           form.cta || null,
      status:        form.status,
      product_id:    form.product_id || null,
      collection_id: form.collection_id || null,
      notes:         form.notes || null,
      cpm:           numOrNull(form.cpm),
      ctr:           numOrNull(form.ctr),
      cpc:           numOrNull(form.cpc),
      atc_rate:      numOrNull(form.atc_rate),
      ic_rate:       numOrNull(form.ic_rate),
      cpa:           numOrNull(form.cpa),
      roas:          numOrNull(form.roas),
    }

    const url    = editing ? `/api/admin/creatives/${initial!.id}` : '/api/admin/creatives'
    const method = editing ? 'PATCH' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (res.ok) {
      router.push('/admin/criativos')
    } else {
      const body = await res.json()
      setError(body.error ?? 'Erro ao salvar.')
      setSaving(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', height: '40px', padding: '0 12px',
    border: '1px solid var(--admin-border)', borderRadius: '8px', fontSize: '14px',
    color: 'var(--admin-text-main)', outline: 'none', background: 'var(--admin-card)', boxSizing: 'border-box',
  }

  const lbl = (text: string) => (
    <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--admin-text-sec)', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{text}</label>
  )

  return (
    <form onSubmit={handleSubmit}>
      {/* Identidade */}
      <div style={{ background: 'var(--admin-card)', borderRadius: '12px', border: '1px solid var(--admin-border)', padding: '24px', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--admin-text-main)', marginBottom: '16px' }}>Identidade</h2>

        <div style={{ marginBottom: '14px' }}>
          {lbl('Nome do criativo *')}
          <input style={inputStyle} value={form.name} onChange={f('name')} placeholder="Ex: Juliet Gold — Angle Dor v1" autoFocus />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
          <div>
            {lbl('Ângulo')}
            <select value={form.angle} onChange={f('angle')} style={{ ...inputStyle, cursor: 'pointer' }}>
              <option value="">— Selecionar —</option>
              {ANGLES.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div>
            {lbl('Status')}
            <select value={form.status} onChange={f('status')} style={{ ...inputStyle, cursor: 'pointer' }}>
              <option value="active">Ativo</option>
              <option value="paused">Pausado</option>
              <option value="draft">Rascunho</option>
              <option value="archived">Arquivado</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          <div>
            {lbl('Produto vinculado')}
            <select value={form.product_id} onChange={f('product_id')} style={{ ...inputStyle, cursor: 'pointer' }}>
              <option value="">— Nenhum —</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            {lbl('Coleção vinculada')}
            <select value={form.collection_id} onChange={f('collection_id')} style={{ ...inputStyle, cursor: 'pointer' }}>
              <option value="">— Nenhuma —</option>
              {collections.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Copy */}
      <div style={{ background: 'var(--admin-card)', borderRadius: '12px', border: '1px solid var(--admin-border)', padding: '24px', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--admin-text-main)', marginBottom: '16px' }}>Copy</h2>

        <div style={{ marginBottom: '14px' }}>
          {lbl('Headline')}
          <input style={inputStyle} value={form.headline} onChange={f('headline')} placeholder="Headline principal do anúncio" />
        </div>

        <div style={{ marginBottom: '14px' }}>
          {lbl('Copy (texto do anúncio)')}
          <textarea value={form.copy} onChange={f('copy')} rows={5} placeholder="Texto completo do criativo..."
            style={{ ...inputStyle, height: 'auto', padding: '10px 12px', resize: 'vertical', lineHeight: 1.6 }} />
        </div>

        <div>
          {lbl('CTA')}
          <input style={inputStyle} value={form.cta} onChange={f('cta')} placeholder="Ex: Comprar agora · Garanta o seu · Ver oferta" />
        </div>
      </div>

      {/* Métricas */}
      <div style={{ background: 'var(--admin-card)', borderRadius: '12px', border: '1px solid var(--admin-border)', padding: '24px', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--admin-text-main)', marginBottom: '4px' }}>Métricas (manual)</h2>
        <p style={{ fontSize: '12px', color: 'var(--admin-text-muted)', marginBottom: '16px' }}>Insira os dados da campanha Meta manualmente.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
          {[
            { key: 'cpm', label: 'CPM (R$)', placeholder: '25.00' },
            { key: 'ctr', label: 'CTR (%)', placeholder: '1.8' },
            { key: 'cpc', label: 'CPC (R$)', placeholder: '1.40' },
            { key: 'atc_rate', label: 'ATC (%)', placeholder: '3.2' },
            { key: 'ic_rate',  label: 'IC (%)',  placeholder: '1.5' },
            { key: 'cpa',      label: 'CPA (R$)', placeholder: '97.00' },
            { key: 'roas',     label: 'ROAS (x)', placeholder: '3.0' },
          ].map(m => (
            <div key={m.key}>
              {lbl(m.label)}
              <input
                type="number" step="0.01"
                style={{ ...inputStyle, fontSize: '13px' }}
                value={form[m.key as keyof typeof form]}
                onChange={f(m.key as keyof typeof form)}
                placeholder={m.placeholder}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div style={{ background: 'var(--admin-card)', borderRadius: '12px', border: '1px solid var(--admin-border)', padding: '24px', marginBottom: '16px' }}>
        {lbl('Notas internas')}
        <textarea value={form.notes} onChange={f('notes')} rows={3} placeholder="Observações, links, referências..."
          style={{ ...inputStyle, height: 'auto', padding: '10px 12px', resize: 'vertical', lineHeight: 1.6 }} />
      </div>

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#dc2626', fontSize: '13px', background: '#fee2e2', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px' }}>
          <AlertCircle size={14} /> {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: '12px' }}>
        <button type="submit" disabled={saving} style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          background: saving ? '#818cf8' : '#4f46e5', color: '#ffffff',
          border: 'none', padding: '11px 24px', borderRadius: '8px',
          fontSize: '14px', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer',
        }}>
          <Save size={14} /> {saving ? 'Salvando...' : editing ? 'Salvar alterações' : 'Criar criativo'}
        </button>
        <a href="/admin/criativos" style={{ display: 'flex', alignItems: 'center', padding: '11px 24px', borderRadius: '8px', border: '1px solid var(--admin-border)', fontSize: '14px', color: 'var(--admin-text-muted)', textDecoration: 'none' }}>
          Cancelar
        </a>
      </div>
    </form>
  )
}
