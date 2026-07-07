'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Save, CheckCircle, AlertCircle } from 'lucide-react'

interface CollectionData {
  id: string; name: string; slug: string; description: string | null;
  image_url: string | null; position: number; status?: string;
}

export function CollectionEditor({ collection }: { collection: CollectionData }) {
  const router = useRouter()
  const [form, setForm] = useState({
    name:        collection.name,
    slug:        collection.slug,
    description: collection.description ?? '',
    image_url:   collection.image_url ?? '',
    position:    collection.position,
    status:      collection.status ?? 'active',
  })
  const [saving, setSaving] = useState(false)
  const [toast,  setToast]  = useState<{ type: 'ok' | 'err'; msg: string } | null>(null)

  function field(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [key]: key === 'position' ? Number(e.target.value) : e.target.value }))
  }

  async function save() {
    setSaving(true)
    setToast(null)
    const res = await fetch(`/api/admin/collections/${collection.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setSaving(false)
    if (res.ok) {
      setToast({ type: 'ok', msg: 'Coleção atualizada!' })
      router.refresh()
    } else {
      const body = await res.json()
      setToast({ type: 'err', msg: body.error ?? 'Erro ao salvar.' })
    }
    setTimeout(() => setToast(null), 3000)
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', height: '40px', padding: '0 12px',
    border: '1px solid var(--admin-border)', borderRadius: '8px', fontSize: '14px',
    color: 'var(--admin-text-main)', outline: 'none', background: 'var(--admin-card)', boxSizing: 'border-box',
  }
  const label = (t: string) => (
    <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--admin-text-sec)', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{t}</label>
  )

  return (
    <div style={{ background: 'var(--admin-card)', borderRadius: '12px', border: '1px solid var(--admin-border)', padding: '24px' }}>
      <h2 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--admin-text-main)', marginBottom: '20px' }}>Editar coleção</h2>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
        <div>
          {label('Nome')}
          <input style={inputStyle} value={form.name} onChange={field('name')} />
        </div>
        <div>
          {label('Slug')}
          <input style={{ ...inputStyle, fontFamily: 'monospace', color: 'var(--admin-accent)' }} value={form.slug} onChange={field('slug')} />
        </div>
      </div>

      <div style={{ marginBottom: '16px' }}>
        {label('Descrição')}
        <textarea
          value={form.description}
          onChange={field('description')}
          rows={3}
          style={{ ...inputStyle, height: 'auto', padding: '10px 12px', resize: 'vertical' }}
        />
      </div>

      <div style={{ marginBottom: '16px' }}>
        {label('URL da imagem (banner)')}
        <input style={inputStyle} value={form.image_url} onChange={field('image_url')} placeholder="/BANNERS 297/banner.jpg" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
        <div>
          {label('Posição')}
          <input type="number" style={inputStyle} value={form.position} onChange={field('position')} />
        </div>
        <div>
          {label('Status')}
          <select value={form.status} onChange={field('status')} style={{ ...inputStyle, cursor: 'pointer' }}>
            <option value="active">Ativo</option>
            <option value="draft">Rascunho</option>
          </select>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          onClick={save}
          disabled={saving}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            background: saving ? '#818cf8' : '#4f46e5',
            color: '#ffffff', border: 'none', padding: '10px 20px',
            borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer',
          }}
        >
          <Save size={14} /> {saving ? 'Salvando...' : 'Salvar'}
        </button>
        {toast && (
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: toast.type === 'ok' ? '#16a34a' : '#dc2626' }}>
            {toast.type === 'ok' ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
            {toast.msg}
          </span>
        )}
      </div>
    </div>
  )
}
