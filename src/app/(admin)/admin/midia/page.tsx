import { getAdminSupabase } from '@/lib/admin-client'
import { Search, AlertCircle, CheckCircle2 } from 'lucide-react'
import { MediaImage } from './_components/media-image'

interface SearchProps { searchParams: Promise<{ q?: string }> }

async function getMediaDiagnostic() {
  const db = getAdminSupabase()
  const [allProductsRes, withImagesRes, withoutVariantRes] = await Promise.all([
    db.from('products').select('id, name, slug, status').eq('status', 'active'),
    db.from('images').select('product_id').limit(5000),
    db.from('products')
      .select('id, name, slug')
      .eq('status', 'active')
      .not('id', 'in', db.from('variants').select('product_id')),
  ])
  const allProducts   = allProductsRes.data ?? []
  const imageProducts = new Set((withImagesRes.data ?? []).map(i => i.product_id))
  const noImageSlugs  = allProducts.filter(p => !imageProducts.has(p.id)).map(p => p.name)
  const noVariant     = (withoutVariantRes.data ?? []).map(p => p.name)
  return {
    total:       allProducts.length,
    withImages:  imageProducts.size,
    noImage:     noImageSlugs,
    noVariant,
  }
}

async function getImages(q?: string) {
  const db = getAdminSupabase()
  let query = db
    .from('images')
    .select('id, url, alt, position, variant_id, product:products(id, name, slug)')
    .order('position', { ascending: true })
    .limit(120)

  if (q) {
    query = query.ilike('url', `%${q}%`)
  }

  const { data } = await query
  return (data ?? []) as unknown as Array<{
    id: string; url: string; alt: string | null; position: number; variant_id: string | null;
    product: { id: string; name: string; slug: string } | null;
  }>
}

async function getImageCount() {
  const db = getAdminSupabase()
  const { count } = await db.from('images').select('*', { count: 'exact', head: true })
  return count ?? 0
}

export default async function MediaPage({ searchParams }: SearchProps) {
  const { q } = await searchParams
  const [images, total, diag] = await Promise.all([getImages(q), getImageCount(), getMediaDiagnostic()])

  return (
    <div style={{ padding: '32px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--admin-text-main)', marginBottom: '4px' }}>Biblioteca de Mídia</h1>
        <p style={{ fontSize: '14px', color: 'var(--admin-text-muted)' }}>{total} imagens no total • {images.length} exibidas</p>
      </div>

      {/* Diagnóstico de mídia */}
      <div style={{ background: 'var(--admin-card)', border: '1px solid var(--admin-border)', borderRadius: '12px', padding: '16px 20px', marginBottom: '20px' }}>
        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
          Diagnóstico de Mídia
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '12px' }}>
          {[
            { label: 'Produtos ativos', value: diag.total },
            { label: 'Com imagem',      value: diag.withImages },
            { label: 'Sem imagem',      value: diag.noImage.length },
          ].map(({ label, value }) => (
            <div key={label} style={{ background: 'var(--admin-bg)', borderRadius: '8px', padding: '10px 12px', textAlign: 'center' }}>
              <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--admin-text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>{label}</div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--admin-text-main)', fontFamily: 'monospace' }}>{value}</div>
            </div>
          ))}
        </div>
        {diag.noImage.length > 0 && (
          <div style={{ display: 'flex', gap: '8px', background: '#fef2f2', border: '1px solid #fecdd3', borderRadius: '8px', padding: '10px 12px', marginBottom: '8px', fontSize: '12px', color: '#dc2626', flexWrap: 'wrap' }}>
            <AlertCircle size={13} style={{ flexShrink: 0, marginTop: '1px' }} />
            <span><strong>{diag.noImage.length} sem foto:</strong> {diag.noImage.slice(0, 5).join(', ')}{diag.noImage.length > 5 ? ` +${diag.noImage.length - 5}` : ''}</span>
          </div>
        )}
        {diag.noVariant.length > 0 && (
          <div style={{ display: 'flex', gap: '8px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '10px 12px', marginBottom: '8px', fontSize: '12px', color: '#d97706', flexWrap: 'wrap' }}>
            <AlertCircle size={13} style={{ flexShrink: 0, marginTop: '1px' }} />
            <span><strong>{diag.noVariant.length} sem variante:</strong> {diag.noVariant.slice(0, 5).join(', ')}</span>
          </div>
        )}
        {diag.noImage.length === 0 && diag.noVariant.length === 0 && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '12px', color: '#16a34a' }}>
            <CheckCircle2 size={13} />
            Todos os produtos ativos têm foto e variante configurados.
          </div>
        )}
      </div>

      {/* Note */}
      <div style={{ background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: '10px', padding: '12px 16px', marginBottom: '20px', fontSize: '13px', color: '#3730a3' }}>
        As imagens são armazenadas no <strong>Supabase Storage</strong>. Para upload de novas imagens,
        acesse o painel Supabase → Storage → products.
      </div>

      {/* Search */}
      <div style={{ background: 'var(--admin-card)', borderRadius: '12px', border: '1px solid var(--admin-border)', padding: '16px 20px', marginBottom: '20px' }}>
        <form style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--admin-text-muted)' }} />
            <input
              name="q"
              defaultValue={q}
              placeholder="Buscar por URL ou nome do arquivo..."
              style={{
                width: '100%', height: '36px', paddingLeft: '32px', paddingRight: '12px',
                border: '1px solid var(--admin-border)', borderRadius: '8px', fontSize: '13px',
                outline: 'none', color: 'var(--admin-text-main)', boxSizing: 'border-box',
              }}
            />
          </div>
          <button type="submit" style={{ height: '36px', padding: '0 16px', background: 'var(--admin-card-hover)', border: '1px solid var(--admin-border)', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', fontWeight: 500, color: 'var(--admin-text-sec)' }}>
            Buscar
          </button>
        </form>
      </div>

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '12px' }}>
        {images.map(img => (
          <div key={img.id} style={{ background: 'var(--admin-card)', borderRadius: '10px', border: '1px solid var(--admin-border)', overflow: 'hidden' }}>
            <div style={{ position: 'relative', width: '100%', aspectRatio: '1', background: '#ffffff', overflow: 'hidden' }}>
              <MediaImage src={img.url} alt={img.alt ?? 'Imagem do produto'} />
              {img.variant_id && (
                <div style={{ position: 'absolute', top: '6px', right: '6px', background: 'var(--admin-accent)', borderRadius: '4px', padding: '1px 5px', fontSize: '9px', color: '#ffffff', fontWeight: 600, zIndex: 1 }}>
                  VAR
                </div>
              )}
            </div>
            <div style={{ padding: '8px 10px' }}>
              <div style={{ fontSize: '11px', color: 'var(--admin-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {img.product?.name ?? '—'}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--admin-text-muted)', marginTop: '2px' }}>
                pos. {img.position}
              </div>
            </div>
          </div>
        ))}
        {images.length === 0 && (
          <div style={{ gridColumn: '1/-1', padding: '48px', textAlign: 'center', color: 'var(--admin-text-muted)', fontSize: '14px' }}>
            Nenhuma imagem encontrada.
          </div>
        )}
      </div>
    </div>
  )
}
