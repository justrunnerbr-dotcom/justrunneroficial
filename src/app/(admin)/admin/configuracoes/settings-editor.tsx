'use client'
import { useState } from 'react'
import { Save, CheckCircle } from 'lucide-react'

interface KnownSetting { key: string; label: string; desc: string }

export function SettingsEditor({
  settings,
  knownSettings,
}: {
  settings: Array<{ key: string; value: string | null }>
  knownSettings: KnownSetting[]
}) {
  const map = Object.fromEntries(settings.map(s => [s.key, s.value ?? '']))
  const [values, setValues] = useState<Record<string, string>>(map)
  const [saving, setSaving] = useState<string | null>(null)
  const [saved,  setSaved]  = useState<string | null>(null)

  async function saveField(key: string) {
    setSaving(key)
    await fetch('/api/admin/settings', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ key, value: values[key] ?? '' }),
    })
    setSaving(null)
    setSaved(key)
    setTimeout(() => setSaved(null), 2500)
  }

  return (
    <div style={{ background: 'var(--admin-card)', borderRadius: '12px', border: '1px solid var(--admin-border)', padding: '24px' }}>
      <h2 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--admin-text-main)', marginBottom: '20px' }}>
        Settings da Loja
      </h2>
      {knownSettings.map(ks => (
        <div key={ks.key} style={{ marginBottom: '20px' }}>
          <div style={{ marginBottom: '6px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--admin-text-sec)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              {ks.label}
            </label>
            <p style={{ fontSize: '11px', color: 'var(--admin-text-muted)', marginTop: '2px' }}>{ks.desc}</p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input
              value={values[ks.key] ?? ''}
              onChange={e => setValues(v => ({ ...v, [ks.key]: e.target.value }))}
              style={{
                flex: 1, height: '40px', padding: '0 12px',
                border: '1px solid var(--admin-border)', borderRadius: '8px', fontSize: '14px',
                color: 'var(--admin-text-main)', outline: 'none', background: 'var(--admin-card)',
              }}
            />
            <button
              onClick={() => saveField(ks.key)}
              disabled={saving === ks.key}
              style={{
                display: 'flex', alignItems: 'center', gap: '5px',
                background: saved === ks.key ? '#dcfce7' : '#4f46e5',
                color: saved === ks.key ? '#16a34a' : '#ffffff',
                border: 'none', borderRadius: '8px', padding: '0 14px',
                fontSize: '13px', fontWeight: 600, cursor: 'pointer', flexShrink: 0,
              }}
            >
              {saved === ks.key ? <><CheckCircle size={13} /> Salvo</> : <><Save size={13} /> Salvar</>}
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
