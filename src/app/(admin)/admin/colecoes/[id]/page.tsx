import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getAdminSupabase } from '@/lib/admin-client'
import { CollectionEditor } from './collection-editor'

interface PageProps { params: Promise<{ id: string }> }

async function getCollection(id: string) {
  const db = getAdminSupabase()
  const { data } = await db
    .from('collections')
    .select('*, products:products(id, name, slug, status)')
    .eq('id', id)
    .single()
  return data
}

export default async function CollectionDetailPage({ params }: PageProps) {
  const { id } = await params
  const collection = await getCollection(id)
  if (!collection) notFound()

  return (
    <div style={{ padding: '32px', maxWidth: '800px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px', fontSize: '13px', color: 'var(--admin-text-muted)' }}>
        <Link href="/admin/colecoes" style={{ color: 'var(--admin-text-muted)', textDecoration: 'none' }}>Coleções</Link>
        <span>/</span>
        <span style={{ color: 'var(--admin-text-main)', fontWeight: 500 }}>{collection.name}</span>
      </div>

      <CollectionEditor collection={collection} />

      {/* Products in collection */}
      <div style={{ marginTop: '24px', background: 'var(--admin-card)', borderRadius: '12px', border: '1px solid var(--admin-border)', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--admin-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--admin-text-main)' }}>
            Produtos ({collection.products?.length ?? 0})
          </h3>
          <Link href={`/admin/produtos?collection=${id}`} style={{ fontSize: '13px', color: 'var(--admin-accent)', textDecoration: 'none' }}>
            Gerenciar →
          </Link>
        </div>
        {(collection.products ?? []).slice(0, 8).map((p: { id: string; name: string; slug: string; status: string }) => (
          <div key={p.id} style={{ padding: '10px 20px', borderTop: '1px solid var(--admin-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '13px', color: 'var(--admin-text-main)' }}>{p.name}</div>
            <span style={{
              fontSize: '11px', fontWeight: 600, padding: '2px 7px', borderRadius: '20px',
              background: p.status === 'active' ? '#dcfce7' : '#fef3c7',
              color: p.status === 'active' ? '#16a34a' : '#d97706',
            }}>
              {p.status === 'active' ? 'Ativo' : 'Rascunho'}
            </span>
          </div>
        ))}
        {(collection.products?.length ?? 0) === 0 && (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--admin-text-muted)', fontSize: '13px' }}>Nenhum produto</div>
        )}
      </div>
    </div>
  )
}
