import { getAdminSupabase } from '@/lib/admin-client'
import { SettingsEditor } from './settings-editor'

async function getAllSettings() {
  const db = getAdminSupabase()
  const { data } = await db.from('settings').select('key, value').order('key')
  return (data ?? []) as Array<{ key: string; value: string | null }>
}

export default async function ConfigPage() {
  const settings = await getAllSettings()

  const KNOWN_SETTINGS = [
    { key: 'announcement_bar',       label: 'Texto do announcement bar',  desc: 'Mensagens separadas por " · "' },
    { key: 'logo_url',               label: 'URL do logotipo (padrão)',    desc: 'Ex: /LOGO/logo.png' },
    { key: 'logo_transparent_url',   label: 'URL do logotipo (transparente)', desc: 'Usado no header transparente (homepage)' },
    { key: 'whatsapp_number',        label: 'Número WhatsApp',            desc: 'Ex: 5511950514943' },
    { key: 'free_shipping_threshold',label: 'Frete grátis acima de (R$)', desc: 'Ex: 200' },
  ]

  return (
    <div style={{ padding: '32px', maxWidth: '800px' }}>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--admin-text-main)', marginBottom: '4px' }}>Configurações</h1>
        <p style={{ fontSize: '14px', color: 'var(--admin-text-muted)' }}>Settings gerais da loja armazenados no Supabase.</p>
      </div>

      {/* Auth info */}
      <div style={{ background: 'var(--admin-card)', borderRadius: '12px', border: '1px solid var(--admin-border)', padding: '24px', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--admin-text-main)', marginBottom: '16px' }}>Variáveis de Ambiente (Vercel)</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {[
            { key: 'ADMIN_PASSWORD',           desc: 'Senha de acesso ao painel admin' },
            { key: 'ADMIN_SECRET',             desc: 'Token aleatório para cookie de sessão (qualquer string longa)' },
            { key: 'SUPABASE_SERVICE_ROLE_KEY',desc: 'Chave service role do Supabase (permite writes com bypass de RLS)' },
            { key: 'NEXT_PUBLIC_SITE_URL',     desc: 'URL da loja (padrão: https://justhavefun.com.br)' },
          ].map(v => (
            <div key={v.key} style={{ display: 'flex', gap: '12px', padding: '10px 12px', background: 'var(--admin-bg)', borderRadius: '8px' }}>
              <code style={{ fontSize: '12px', color: 'var(--admin-accent)', minWidth: '240px', flexShrink: 0 }}>{v.key}</code>
              <span style={{ fontSize: '12px', color: 'var(--admin-text-muted)' }}>{v.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Known settings */}
      <SettingsEditor settings={settings} knownSettings={KNOWN_SETTINGS} />

      {/* Raw settings table */}
      <div style={{ marginTop: '24px', background: 'var(--admin-card)', borderRadius: '12px', border: '1px solid var(--admin-border)', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--admin-border)' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--admin-text-main)' }}>Todas as Settings ({settings.length})</h3>
        </div>
        <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
          {settings.map(s => (
            <div key={s.key} style={{ padding: '10px 20px', borderTop: '1px solid var(--admin-border)', display: 'flex', gap: '12px' }}>
              <code style={{ fontSize: '12px', color: 'var(--admin-accent)', minWidth: '200px', flexShrink: 0 }}>{s.key}</code>
              <span style={{ fontSize: '12px', color: 'var(--admin-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {s.value ?? <em style={{ color: '#d1d5db' }}>null</em>}
              </span>
            </div>
          ))}
          {settings.length === 0 && (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--admin-text-muted)' }}>Nenhuma setting encontrada.</div>
          )}
        </div>
      </div>
    </div>
  )
}
