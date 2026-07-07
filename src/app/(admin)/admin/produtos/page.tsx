import Link from 'next/link'
import Image from 'next/image'
import { getAdminSupabase } from '@/lib/admin-client'
import { Plus, Search } from 'lucide-react'
import { getProductBrainBadges } from '@/lib/admin/commerce-brain'
import { getDateRangePreset } from '@/lib/admin/date-range'

interface PageProps {
  searchParams: Promise<{ q?: string; status?: string; filter?: string; collection?: string }>
}

async function getProducts(q?: string, status?: string, filter?: string, collection?: string) {
  const db = getAdminSupabase()
  let query = db
    .from('products')
    .select('*, variants(id, price, compare_price, sku), images(id, url, position, variant_id), collection:collections(id, name)')
    .order('name', { ascending: true })

  if (status)     query = query.eq('status', status)
  if (q)          query = query.ilike('name', `%${q}%`)
  if (collection) query = query.eq('collection_id', collection)

  const { data } = await query
  let products = (data ?? []) as Array<{
    id: string; name: string; slug: string; status: string; created_at: string;
    variants: Array<{ id: string; price: number; compare_price: number | null; sku: string }>;
    images: Array<{ id: string; url: string; position: number; variant_id: string | null }>;
    collection: { id: string; name: string } | null;
  }>

  if (filter === 'no-image') {
    products = products.filter(p => p.images.length === 0)
  }

  return products
}

function priceRange(variants: Array<{ price: number }>) {
  if (!variants.length) return '—'
  const prices = variants.map(v => v.price).filter(Boolean)
  if (!prices.length) return '—'
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  const fmt = (n: number) => `R$ ${n.toFixed(2).replace('.', ',')}`
  return min === max ? fmt(min) : `${fmt(min)} – ${fmt(max)}`
}

async function getCollectionName(id?: string) {
  if (!id) return null
  const db = getAdminSupabase()
  const { data } = await db.from('collections').select('name').eq('id', id).single()
  return data?.name ?? null
}

export default async function ProductsPage({ searchParams }: PageProps) {
  const { q, status, filter, collection } = await searchParams
  const brainRange = getDateRangePreset('last_7_days')
  const [products, brainBadges, collectionName] = await Promise.all([
    getProducts(q, status, filter, collection),
    getProductBrainBadges(getAdminSupabase(), brainRange),
    getCollectionName(collection),
  ])

  return (
    <div style={{ padding: '32px 40px', maxWidth: '1400px', margin: '0 auto', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 700, color: 'var(--admin-text-main)', marginBottom: '4px' }}>Produtos</h1>
          <p style={{ fontSize: '14px', color: 'var(--admin-text-muted)' }}>
            {products.length} produto{products.length !== 1 ? 's' : ''} encontrado{products.length !== 1 ? 's' : ''}
            {collectionName && <> · filtrando por coleção <strong style={{ color: 'var(--admin-text-main)' }}>{collectionName}</strong></>}
          </p>
        </div>
        <Link
          href="/admin/produtos/novo"
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            background: 'var(--admin-accent)', color: '#ffffff', border: 'none',
            padding: '10px 20px', borderRadius: '8px', fontSize: '13px',
            fontWeight: 600, cursor: 'pointer', textDecoration: 'none',
            boxShadow: '0 4px 12px rgba(var(--admin-accent-rgb), 0.2)'
          }}
        >
          <Plus size={16} /> Novo produto
        </Link>
      </div>

      {/* Filters */}
      <div style={{ background: 'var(--admin-card)', borderRadius: '16px', border: '1px solid var(--admin-border)', padding: '20px', marginBottom: '24px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
        <form style={{ display: 'flex', gap: '12px', flex: 1, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
            <Search size={16} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--admin-text-muted)' }} />
            <input
              name="q"
              defaultValue={q}
              placeholder="Buscar por nome..."
              style={{
                width: '100%', height: '40px', paddingLeft: '44px', paddingRight: '16px',
                background: 'transparent', border: '1px solid var(--admin-border)', borderRadius: '8px', fontSize: '14px',
                outline: 'none', color: 'var(--admin-text-main)', boxSizing: 'border-box',
              }}
            />
          </div>
          <select
            name="status"
            defaultValue={status ?? ''}
            style={{ height: '40px', padding: '0 16px', background: 'transparent', border: '1px solid var(--admin-border)', borderRadius: '8px', fontSize: '14px', color: 'var(--admin-text-main)', outline: 'none' }}
          >
            <option value="" style={{ background: 'var(--admin-bg)', color: 'var(--admin-text-main)' }}>Todos os status</option>
            <option value="active" style={{ background: 'var(--admin-bg)', color: 'var(--admin-text-main)' }}>Ativo</option>
            <option value="draft" style={{ background: 'var(--admin-bg)', color: 'var(--admin-text-main)' }}>Rascunho</option>
          </select>
          <button
            type="submit"
            style={{ height: '40px', padding: '0 24px', background: 'var(--admin-card-hover)', border: '1px solid var(--admin-border)', borderRadius: '8px', fontSize: '14px', cursor: 'pointer', fontWeight: 600, color: 'var(--admin-text-main)' }}
          >
            Filtrar
          </button>
          {(q || status || filter || collection) && (
            <Link href="/admin/produtos" style={{ fontSize: '13px', color: 'var(--admin-red)', textDecoration: 'none', fontWeight: 500, marginLeft: '8px' }}>
              Limpar filtros
            </Link>
          )}
        </form>
      </div>

      {/* Table */}
      <div style={{ background: 'var(--admin-card)', borderRadius: '16px', border: '1px solid var(--admin-border)', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--admin-card-hover)', borderBottom: '1px solid var(--admin-border)' }}>
              {['Produto', 'Coleção', 'Variantes', 'Preço', 'Status', 'Brain 7d', 'Ações'].map(h => (
                <th key={h} style={{ padding: '16px 24px', fontSize: '11px', fontWeight: 600, color: 'var(--admin-text-muted)', textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {products.map((p) => {
              const thumb = p.images.sort((a, b) => a.position - b.position)[0]
              return (
                <tr key={p.id} style={{ borderBottom: '1px solid var(--admin-border)' }}>
                  <td style={{ padding: '16px 24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{
                        width: '48px', height: '48px', borderRadius: '12px',
                        background: 'var(--admin-bg)', flexShrink: 0, position: 'relative', overflow: 'hidden',
                        border: '1px solid var(--admin-border)'
                      }}>
                        {thumb && (
                          <Image src={thumb.url} alt={p.name} fill style={{ objectFit: 'contain', padding: '6px' }} sizes="48px" />
                        )}
                      </div>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--admin-text-main)', marginBottom: '4px' }}>{p.name}</div>
                        <div style={{ fontSize: '12px', color: 'var(--admin-text-muted)', fontFamily: 'monospace' }}>{p.slug}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '16px 24px', fontSize: '13px', color: 'var(--admin-text-sec)', fontWeight: 500 }}>
                    {p.collection?.name ?? <span style={{ color: 'var(--admin-text-muted)' }}>—</span>}
                  </td>
                  <td style={{ padding: '16px 24px', fontSize: '13px', color: 'var(--admin-text-sec)', textAlign: 'center', fontWeight: 500 }}>
                    {p.variants.length}
                  </td>
                  <td style={{ padding: '16px 24px', fontSize: '13px', color: 'var(--admin-text-main)', whiteSpace: 'nowrap', fontWeight: 600 }}>
                    {priceRange(p.variants)}
                  </td>
                  <td style={{ padding: '16px 24px' }}>
                    <span style={{
                      fontSize: '11px', fontWeight: 600, padding: '4px 10px', borderRadius: '6px',
                      background: p.status === 'active' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                      color: p.status === 'active' ? '#10B981' : '#F59E0B',
                      border: p.status === 'active' ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(245, 158, 11, 0.2)'
                    }}>
                      {p.status === 'active' ? 'Ativo' : 'Rascunho'}
                    </span>
                  </td>
                  <td style={{ padding: '16px 24px' }}>
                    {brainBadges[p.slug] ? (
                      <span style={{
                        fontSize: '11px', fontWeight: 600,
                        color: brainBadges[p.slug].color,
                        background: brainBadges[p.slug].bg,
                        padding: '3px 8px', borderRadius: '5px',
                        whiteSpace: 'nowrap',
                      }}>
                        {brainBadges[p.slug].label}
                      </span>
                    ) : (
                      <span style={{ fontSize: '11px', color: 'var(--admin-text-muted)' }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: '16px 24px' }}>
                    <Link
                      href={`/admin/produtos/${p.id}`}
                      style={{ fontSize: '13px', color: 'var(--admin-accent)', textDecoration: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      Editar
                    </Link>
                  </td>
                </tr>
              )
            })}
            {products.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: '64px 24px', textAlign: 'center', color: 'var(--admin-text-muted)', fontSize: '14px' }}>
                  Nenhum produto encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
