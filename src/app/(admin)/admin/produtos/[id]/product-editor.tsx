'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Save, CheckCircle, AlertCircle, Trash2 } from 'lucide-react'

interface Collection { id: string; name: string; slug: string }
interface Product {
  id: string; name: string; slug: string; description: string | null;
  status: string; featured: boolean; collection_id: string;
  collection?: Collection | null;
}

export function ProductEditor({
  product,
  collections,
}: {
  product: Product
  collections: Collection[]
}) {
  const router = useRouter()
  const [form, setForm] = useState({
    name:          product.name,
    slug:          product.slug,
    description:   product.description ?? '',
    status:        product.status,
    featured:      product.featured ?? false,
    collection_id: product.collection_id,
  })
  const [saving,   setSaving]   = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [toast,    setToast]    = useState<{ type: 'ok' | 'err'; msg: string } | null>(null)

  function field(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const value = e.target.type === 'checkbox'
        ? (e.target as HTMLInputElement).checked
        : e.target.value
      setForm(f => ({ ...f, [key]: value }))
    }
  }

  async function deleteProduct() {
    if (!window.confirm(`Deletar "${form.name}" permanentemente? Esta ação não pode ser desfeita.`)) return
    setDeleting(true)
    const res = await fetch(`/api/admin/products/${product.id}`, { method: 'DELETE' })
    if (res.ok) {
      router.push('/admin/produtos')
    } else {
      const body = await res.json()
      setToast({ type: 'err', msg: body.error ?? 'Erro ao deletar.' })
      setDeleting(false)
    }
  }

  async function save() {
    setSaving(true)
    setToast(null)
    let yampiFailed = false
    try {
      const res = await fetch(`/api/admin/products/${product.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(form),
      })
      if (res.ok) {
        const body  = await res.json().catch(() => null)
        const yampi = body?.yampi
        let msg = 'Salvo com sucesso!'
        if (yampi?.attempted) {
          yampiFailed = yampi.failed > 0
          msg += yampiFailed
            ? ` Yampi: ${yampi.synced} sincronizada(s), ${yampi.failed} falhou(aram).`
            : ` Yampi: ${yampi.synced} sincronizada(s).`
        }
        setToast({ type: yampiFailed ? 'err' : 'ok', msg })
        router.refresh()
      } else {
        const body = await res.json()
        setToast({ type: 'err', msg: body.error ?? 'Erro ao salvar.' })
      }
    } catch {
      setToast({ type: 'err', msg: 'Falha de rede ao salvar.' })
    }
    setSaving(false)
    // A Yampi sync failure stays on screen past the usual 3s window — a
    // drifted catalog shouldn't disappear just because the toast would have.
    if (!yampiFailed) setTimeout(() => setToast(null), 3000)
  }

  const label = (text: string) => (
    <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--admin-text-sec)', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
      {text}
    </label>
  )

  const inputStyle: React.CSSProperties = {
    width: '100%', height: '40px', padding: '0 12px',
    border: '1px solid var(--admin-border)', borderRadius: '8px', fontSize: '14px',
    color: 'var(--admin-text-main)', outline: 'none', background: 'var(--admin-card)', boxSizing: 'border-box',
  }

  return (
    <>
      {/* Info card */}
      <div style={{ background: 'var(--admin-card)', borderRadius: '12px', border: '1px solid var(--admin-border)', padding: '24px' }}>
        <h2 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--admin-text-main)', marginBottom: '20px' }}>
          Informações do produto
        </h2>

        <div style={{ marginBottom: '16px' }}>
          {label('Nome do produto')}
          <input style={inputStyle} value={form.name} onChange={field('name')} />
        </div>

        <div style={{ marginBottom: '16px' }}>
          {label('Slug')}
          <input
            style={{ ...inputStyle, fontFamily: 'monospace', color: 'var(--admin-text-muted)', cursor: 'not-allowed', background: 'var(--admin-bg)' }}
            value={form.slug}
            readOnly
            disabled
          />
          <p style={{ fontSize: '11px', color: 'var(--admin-text-muted)', marginTop: '4px' }}>
            Somente leitura — alterar o slug quebraria links de anúncios/SEO já publicados.
          </p>
        </div>

        <div style={{ marginBottom: '16px' }}>
          {label('Descrição')}
          <textarea
            value={form.description}
            onChange={field('description')}
            rows={6}
            style={{ ...inputStyle, height: 'auto', padding: '10px 12px', resize: 'vertical', lineHeight: 1.6 }}
          />
          <p style={{ fontSize: '11px', color: 'var(--admin-text-muted)', marginTop: '4px' }}>HTML permitido. Max 5000 chars.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          <div>
            {label('Status')}
            <select value={form.status} onChange={field('status')} style={{ ...inputStyle, cursor: 'pointer' }}>
              <option value="active">Ativo</option>
              <option value="draft">Rascunho</option>
            </select>
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
          <input
            type="checkbox"
            id="featured"
            checked={form.featured}
            onChange={field('featured')}
            style={{ width: '16px', height: '16px', cursor: 'pointer' }}
          />
          <label htmlFor="featured" style={{ fontSize: '13px', color: 'var(--admin-text-sec)', cursor: 'pointer' }}>
            Produto em destaque
          </label>
        </div>

        {/* Save + Delete row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={save}
              disabled={saving || deleting}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                background: saving ? '#818cf8' : '#4f46e5',
                color: '#ffffff', border: 'none', padding: '10px 20px',
                borderRadius: '8px', fontSize: '14px', fontWeight: 600,
                cursor: (saving || deleting) ? 'not-allowed' : 'pointer',
              }}
            >
              <Save size={14} />
              {saving ? 'Salvando...' : 'Salvar alterações'}
            </button>

            {toast && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: toast.type === 'ok' ? '#16a34a' : '#dc2626' }}>
                {toast.type === 'ok' ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                {toast.msg}
              </div>
            )}
          </div>

          <button
            onClick={deleteProduct}
            disabled={saving || deleting}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              background: 'transparent', color: '#dc2626',
              border: '1px solid #fecaca', padding: '9px 16px',
              borderRadius: '8px', fontSize: '13px', fontWeight: 500,
              cursor: (saving || deleting) ? 'not-allowed' : 'pointer',
            }}
          >
            <Trash2 size={13} />
            {deleting ? 'Deletando...' : 'Deletar produto'}
          </button>
        </div>
      </div>

      {/* SEO card */}
      <div style={{ background: 'var(--admin-card)', borderRadius: '12px', border: '1px solid var(--admin-border)', padding: '24px' }}>
        <h2 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--admin-text-main)', marginBottom: '8px' }}>SEO</h2>
        <p style={{ fontSize: '13px', color: 'var(--admin-text-muted)', marginBottom: '16px' }}>
          Título e meta description são gerados automaticamente a partir do nome e descrição.
        </p>
        <div style={{ background: 'var(--admin-bg)', borderRadius: '8px', padding: '16px', border: '1px solid var(--admin-border)' }}>
          <div style={{ fontSize: '16px', color: '#1a0dab', marginBottom: '4px', fontWeight: 500 }}>
            {form.name} — Just Have Fun
          </div>
          <div style={{ fontSize: '13px', color: '#006621', marginBottom: '4px' }}>
            justhavefun.com.br/produto/{form.slug}
          </div>
          <div style={{ fontSize: '13px', color: '#545454', lineHeight: 1.4 }}>
            {form.description
              ? form.description.replace(/<[^>]+>/g, '').slice(0, 160)
              : `Compre ${form.name} na Just Have Fun Store.`}
          </div>
        </div>
      </div>
    </>
  )
}
