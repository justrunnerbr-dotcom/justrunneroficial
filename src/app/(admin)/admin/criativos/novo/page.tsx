import { getAdminSupabase } from '@/lib/admin-client'
import { CreativeForm } from '../creative-form'
import Link from 'next/link'

async function getOptions() {
  const db = getAdminSupabase()
  const [{ data: products }, { data: collections }] = await Promise.all([
    db.from('products').select('id, name').eq('status', 'active').order('name').limit(100),
    db.from('collections').select('id, name').order('name'),
  ])
  return { products: products ?? [], collections: collections ?? [] }
}

export default async function NovoCreativoPage() {
  const { products, collections } = await getOptions()

  return (
    <div style={{ padding: '32px', maxWidth: '720px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px', fontSize: '13px', color: 'var(--admin-text-muted)' }}>
        <Link href="/admin/criativos" style={{ color: 'var(--admin-text-muted)', textDecoration: 'none' }}>Criativos</Link>
        <span>/</span>
        <span style={{ color: 'var(--admin-text-main)', fontWeight: 500 }}>Novo</span>
      </div>
      <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--admin-text-main)', marginBottom: '24px' }}>Novo criativo</h1>
      <CreativeForm products={products} collections={collections} />
    </div>
  )
}
