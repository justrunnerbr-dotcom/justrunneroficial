import { getAdminSupabase } from '@/lib/admin-client'
import { NewProductForm } from './new-product-form'
import Link from 'next/link'

async function getCollections() {
  const db = getAdminSupabase()
  const { data } = await db.from('collections').select('id, name').order('name')
  return (data ?? []) as Array<{ id: string; name: string }>
}

export default async function NewProductPage() {
  const collections = await getCollections()

  return (
    <div style={{ padding: '32px', maxWidth: '720px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px', fontSize: '13px', color: 'var(--admin-text-muted)' }}>
        <Link href="/admin/produtos" style={{ color: 'var(--admin-text-muted)', textDecoration: 'none' }}>Produtos</Link>
        <span>/</span>
        <span style={{ color: 'var(--admin-text-main)', fontWeight: 500 }}>Novo produto</span>
      </div>

      <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--admin-text-main)', marginBottom: '24px' }}>
        Criar produto
      </h1>

      <NewProductForm collections={collections} />
    </div>
  )
}
