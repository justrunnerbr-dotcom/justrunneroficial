import { getAdminSupabase } from '@/lib/admin-client'
import { SeoEditor } from './seo-editor'

async function getSeoSettings() {
  const db = getAdminSupabase()
  const keys = ['site_title', 'site_description', 'og_image', 'og_title', 'og_description', 'twitter_card']
  const { data } = await db.from('settings').select('key, value').in('key', keys)
  const map: Record<string, string> = {}
  for (const row of data ?? []) map[row.key] = row.value
  return map
}

export default async function SeoPage() {
  const settings = await getSeoSettings()

  return (
    <div style={{ padding: '32px', maxWidth: '800px' }}>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--admin-text-main)', marginBottom: '4px' }}>SEO Global</h1>
        <p style={{ fontSize: '14px', color: 'var(--admin-text-muted)' }}>
          Título, meta description e Open Graph do site. SEO por produto é gerenciado na página do produto.
        </p>
      </div>

      <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: '10px', padding: '12px 16px', marginBottom: '24px', fontSize: '13px', color: '#92400e' }}>
        ℹ️ As settings SEO abaixo ficam salvas no Supabase. Para a integração com o <code>layout.tsx</code> público,
        a equipe dev deve criar um <code>generateMetadata</code> dinâmico lendo estas chaves.
      </div>

      <SeoEditor initialSettings={settings} />

      {/* Current SEO preview */}
      <div style={{ marginTop: '24px', background: 'var(--admin-card)', borderRadius: '12px', border: '1px solid var(--admin-border)', padding: '24px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--admin-text-main)', marginBottom: '16px' }}>
          Preview Google Search
        </h3>
        <div style={{ background: 'var(--admin-card)', borderRadius: '8px', padding: '16px', border: '1px solid var(--admin-border)' }}>
          <div style={{ fontSize: '18px', color: '#1a0dab', marginBottom: '4px', fontWeight: 500 }}>
            {settings['og_title'] || settings['site_title'] || 'Just Runner Store'}
          </div>
          <div style={{ fontSize: '13px', color: '#006621', marginBottom: '4px' }}>
            justrunner.com.br
          </div>
          <div style={{ fontSize: '13px', color: '#545454', lineHeight: 1.5 }}>
            {settings['og_description'] || settings['site_description'] || 'Óculos de alta performance e estilo.'}
          </div>
        </div>
      </div>
    </div>
  )
}
