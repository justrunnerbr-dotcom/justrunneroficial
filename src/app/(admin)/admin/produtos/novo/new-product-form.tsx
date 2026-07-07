'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Save, AlertCircle } from 'lucide-react'

interface Collection { id: string; name: string }

export function NewProductForm({ collections }: { collections: Collection[] }) {
  const router = useRouter()
  const [form, setForm] = useState({
    name:          '',
    slug:          '',
    description:   '',
    status:        'draft',
    featured:      false,
    collection_id: '',
  })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  function slugify(text: string) {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
  }

  function onNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    const name = e.target.value
    setForm(f => ({
      ...f,
      name,
      slug: f.slug || slugify(name), // auto-fill slug only if empty
    }))
  }

  function field(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const value = e.target.type === 'checkbox'
        ? (e.target as HTMLInputElement).checked
        : e.target.value
      setForm(f => ({ ...f, [key]: value }))
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setError('Nome é obrigatório.'); return }
    setSaving(true)
    setError('')

    const res = await fetch('/api/admin/products', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(form),
    })

    if (res.ok) {
      const product = await res.json()
      router.push(`/admin/produtos/${product.id}`)
    } else {
      const body = await res.json()
      setError(body.error ?? 'Erro ao criar produto.')
      setSaving(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', height: '40px', padding: '0 12px',
    border: '1px solid var(--admin-border)', borderRadius: '8px', fontSize: '14px',
    color: 'var(--admin-text-main)', outline: 'none', background: 'var(--admin-card)', boxSizing: 'border-box',
  }

  const label = (text: string, required = false) => (
    <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--admin-text-sec)', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
      {text}{required && <span style={{ color: '#ef4444', marginLeft: '4px' }}>*</span>}
    </label>
  )

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ background: 'var(--admin-card)', borderRadius: '12px', border: '1px solid var(--admin-border)', padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>

        <div>
          {label('Nome do produto', true)}
          <input
            style={inputStyle}
            value={form.name}
            onChange={onNameChange}
            placeholder="Ex: Óculos Juliet XL Dourado"
            autoFocus
            required
          />
        </div>

        <div>
          {label('Slug (URL)')}
          <input
            style={{ ...inputStyle, fontFamily: 'monospace', color: 'var(--admin-accent)' }}
            value={form.slug}
            onChange={field('slug')}
            placeholder="oculos-juliet-xl-dourado"
          />
          <p style={{ fontSize: '11px', color: 'var(--admin-text-muted)', marginTop: '4px' }}>
            Gerado automaticamente a partir do nome. Pode editar manualmente.
          </p>
        </div>

        <div>
          {label('Descrição')}
          <textarea
            value={form.description}
            onChange={field('description')}
            rows={5}
            placeholder="Descrição do produto (HTML permitido)..."
            style={{ ...inputStyle, height: 'auto', padding: '10px 12px', resize: 'vertical', lineHeight: 1.6 }}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            {label('Status')}
            <select value={form.status} onChange={field('status')} style={{ ...inputStyle, cursor: 'pointer' }}>
              <option value="draft">Rascunho</option>
              <option value="active">Ativo</option>
            </select>
            <p style={{ fontSize: '11px', color: 'var(--admin-text-muted)', marginTop: '4px' }}>
              Rascunho = oculto na loja.
            </p>
          </div>
          <div>
            {label('Coleção')}
            <select value={form.collection_id} onChange={field('collection_id')} style={{ ...inputStyle, cursor: 'pointer' }}>
              <option value="">— Sem coleção —</option>
              {collections.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <input
            type="checkbox"
            id="featured"
            checked={form.featured}
            onChange={field('featured')}
            style={{ width: '16px', height: '16px', cursor: 'pointer' }}
          />
          <label htmlFor="featured" style={{ fontSize: '13px', color: 'var(--admin-text-sec)', cursor: 'pointer' }}>
            Produto em destaque na home
          </label>
        </div>

        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#dc2626', fontSize: '13px', background: '#fee2e2', padding: '10px 14px', borderRadius: '8px' }}>
            <AlertCircle size={14} /> {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            type="submit"
            disabled={saving}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              background: saving ? '#818cf8' : '#4f46e5',
              color: '#ffffff', border: 'none', padding: '11px 24px',
              borderRadius: '8px', fontSize: '14px', fontWeight: 600,
              cursor: saving ? 'not-allowed' : 'pointer',
            }}
          >
            <Save size={14} />
            {saving ? 'Criando...' : 'Criar produto'}
          </button>
          <a
            href="/admin/produtos"
            style={{ display: 'flex', alignItems: 'center', padding: '11px 24px', borderRadius: '8px', border: '1px solid var(--admin-border)', fontSize: '14px', color: 'var(--admin-text-muted)', textDecoration: 'none' }}
          >
            Cancelar
          </a>
        </div>
      </div>

      <div style={{ marginTop: '16px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '14px 16px', fontSize: '13px', color: '#15803d' }}>
        Após criar, você será redirecionado para o editor do produto para adicionar <strong>variantes e imagens</strong>.
      </div>
    </form>
  )
}
