import { getAdminSupabase } from '@/lib/admin-client'
import { HomeBlocksEditor } from './home-blocks-editor'

const DEFAULT_BLOCKS = [
  { id: 'announcement', type: 'announcement_bar', label: 'Barra de anúncio',    active: true,  order: 0 },
  { id: 'hero',         type: 'hero_banner',      label: 'Banner principal',     active: true,  order: 1 },
  { id: 'benefits',     type: 'benefits_bar',     label: 'Faixa de benefícios',  active: true,  order: 2 },
  { id: 'categories',  type: 'categories',        label: 'Carrossel de coleções',active: true,  order: 3 },
  { id: 'promo',        type: 'promo_banner',     label: 'Banner promoção',      active: true,  order: 4 },
  { id: 'reviews',      type: 'social_proof',     label: 'Avaliações / UGC',     active: true,  order: 5 },
  { id: 'faq',          type: 'faq',              label: 'FAQ rápido',           active: true,  order: 6 },
]

async function getHomeConfig() {
  const db = getAdminSupabase()
  const { data } = await db.from('settings').select('value').eq('key', 'home_blocks').single()
  if (data?.value) {
    try { return JSON.parse(data.value) } catch {}
  }
  return DEFAULT_BLOCKS
}

async function getSettings() {
  const db = getAdminSupabase()
  const { data } = await db
    .from('settings')
    .select('key, value')
    .in('key', ['announcement_bar', 'logo_url', 'logo_transparent_url'])
  const map: Record<string, string> = {}
  for (const row of data ?? []) map[row.key] = row.value
  return map
}

export default async function HomeBuilderPage() {
  const [blocks, settings] = await Promise.all([getHomeConfig(), getSettings()])

  return (
    <div style={{ padding: '32px', maxWidth: '900px' }}>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--admin-text-main)', marginBottom: '4px' }}>Home Builder</h1>
        <p style={{ fontSize: '14px', color: 'var(--admin-text-muted)' }}>
          Controle quais seções aparecem na homepage e configure textos e banners.
        </p>
      </div>

      <div style={{
        background: '#fef3c7', border: '1px solid #fde68a', borderRadius: '10px',
        padding: '14px 18px', marginBottom: '24px', fontSize: '13px', color: '#92400e',
      }}>
        ℹ️ As configurações abaixo são salvas no banco de dados. Para que a homepage reflita
        as alterações, a equipe dev deve integrar estas settings ao <code>page.tsx</code> público.
        O site atual permanece funcional e inalterado.
      </div>

      {/* Settings cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: 'var(--admin-card)', borderRadius: '12px', border: '1px solid var(--admin-border)', padding: '20px' }}>
          <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--admin-text-sec)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Announcement Bar</h3>
          <div style={{ fontSize: '13px', color: 'var(--admin-text-main)', background: 'var(--admin-card-hover)', padding: '10px 12px', borderRadius: '6px', fontFamily: 'monospace', wordBreak: 'break-all' }}>
            {settings['announcement_bar'] ?? '—'}
          </div>
          <p style={{ fontSize: '11px', color: 'var(--admin-text-muted)', marginTop: '8px' }}>Edite em: Configurações → Settings</p>
        </div>
        <div style={{ background: 'var(--admin-card)', borderRadius: '12px', border: '1px solid var(--admin-border)', padding: '20px' }}>
          <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--admin-text-sec)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Logo URL</h3>
          <div style={{ fontSize: '13px', color: 'var(--admin-text-main)', background: 'var(--admin-card-hover)', padding: '10px 12px', borderRadius: '6px', fontFamily: 'monospace', wordBreak: 'break-all' }}>
            {settings['logo_url'] ?? '—'}
          </div>
          <p style={{ fontSize: '11px', color: 'var(--admin-text-muted)', marginTop: '8px' }}>Edite em: Configurações → Settings</p>
        </div>
      </div>

      {/* Blocks editor */}
      <HomeBlocksEditor initialBlocks={blocks} />
    </div>
  )
}
