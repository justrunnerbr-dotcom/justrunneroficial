'use client'
import { useState } from 'react'
import { Save, CheckCircle } from 'lucide-react'

const FIELDS = [
  { key: 'site_title',        label: 'Título do site',           placeholder: 'Just Runner Store', maxlen: 60, type: 'input' },
  { key: 'site_description',  label: 'Meta description',         placeholder: 'Óculos de alta performance...', maxlen: 160, type: 'textarea' },
  { key: 'og_title',          label: 'OG Title (redes sociais)', placeholder: 'Just Runner — Óculos Premium', maxlen: 60, type: 'input' },
  { key: 'og_description',    label: 'OG Description',           placeholder: 'A melhor seleção de óculos...', maxlen: 200, type: 'textarea' },
  { key: 'og_image',          label: 'OG Image (URL)',           placeholder: 'https://justrunner.com.br/og-image.jpg', maxlen: 500, type: 'input' },
  { key: 'twitter_card',      label: 'Twitter Card',             placeholder: 'summary_large_image', maxlen: 30, type: 'input' },
]

export function SeoEditor({ initialSettings }: { initialSettings: Record<string, string> }) {
  const [values,  setValues]  = useState<Record<string, string>>(initialSettings)
  const [saving,  setSaving]  = useState<string | null>(null)
  const [saved,   setSaved]   = useState<string | null>(null)

  async function saveField(key: string) {
    setSaving(key)
    await fetch('/api/admin/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value: values[key] ?? '' }),
    })
    setSaving(null)
    setSaved(key)
    setTimeout(() => setSaved(null), 2000)
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px',
    border: '1px solid var(--admin-border)', borderRadius: '8px', fontSize: '14px',
    color: 'var(--admin-text-main)', outline: 'none', background: 'var(--admin-card)', boxSizing: 'border-box', lineHeight: 1.5,
  }

  return (
    <div style={{ background: 'var(--admin-card)', borderRadius: '12px', border: '1px solid var(--admin-border)', padding: '24px' }}>
      <h2 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--admin-text-main)', marginBottom: '20px' }}>Configurações SEO</h2>

      {FIELDS.map(f => (
        <div key={f.key} style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--admin-text-sec)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              {f.label}
            </label>
            <span style={{ fontSize: '11px', color: 'var(--admin-text-muted)' }}>
              {(values[f.key] ?? '').length}/{f.maxlen}
            </span>
          </div>
          {f.type === 'textarea' ? (
            <textarea
              value={values[f.key] ?? ''}
              onChange={e => setValues(v => ({ ...v, [f.key]: e.target.value }))}
              placeholder={f.placeholder}
              rows={2}
              maxLength={f.maxlen}
              style={{ ...inputStyle, height: 'auto', resize: 'vertical' }}
            />
          ) : (
            <input
              value={values[f.key] ?? ''}
              onChange={e => setValues(v => ({ ...v, [f.key]: e.target.value }))}
              placeholder={f.placeholder}
              maxLength={f.maxlen}
              style={{ ...inputStyle, height: '40px' }}
            />
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
            <button
              onClick={() => saveField(f.key)}
              disabled={saving === f.key}
              style={{
                display: 'flex', alignItems: 'center', gap: '5px',
                background: saved === f.key ? '#dcfce7' : '#f1f5f9',
                color: saved === f.key ? '#16a34a' : '#374151',
                border: '1px solid var(--admin-border)', borderRadius: '6px',
                padding: '5px 12px', fontSize: '12px', fontWeight: 500, cursor: 'pointer',
              }}
            >
              {saved === f.key ? <><CheckCircle size={12} /> Salvo</> : <><Save size={12} /> Salvar</>}
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
