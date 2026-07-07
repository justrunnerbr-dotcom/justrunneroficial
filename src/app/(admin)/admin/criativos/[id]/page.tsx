import { getAdminSupabase } from '@/lib/admin-client'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { CreativeForm } from '../creative-form'
import { DeleteCreativeButton } from './delete-creative-button'

async function getCreative(id: string) {
  const db = getAdminSupabase()
  const { data } = await db.from('admin_creatives').select('*').eq('id', id).single()
  return data
}

async function getOptions() {
  const db = getAdminSupabase()
  const [{ data: products }, { data: collections }] = await Promise.all([
    db.from('products').select('id, name').eq('status', 'active').order('name').limit(100),
    db.from('collections').select('id, name').order('name'),
  ])
  return { products: products ?? [], collections: collections ?? [] }
}

export default async function CreativoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [creative, { products, collections }] = await Promise.all([getCreative(id), getOptions()])
  if (!creative) notFound()

  return (
    <div style={{ padding: '32px', maxWidth: '720px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--admin-text-muted)' }}>
          <Link href="/admin/criativos" style={{ color: 'var(--admin-text-muted)', textDecoration: 'none' }}>Criativos</Link>
          <span>/</span>
          <span style={{ color: 'var(--admin-text-main)', fontWeight: 500 }}>{creative.name}</span>
        </div>
        <DeleteCreativeButton id={id} name={creative.name} />
      </div>

      <CreativeForm products={products} collections={collections} initial={creative} />
    </div>
  )
}
