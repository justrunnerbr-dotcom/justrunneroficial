import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { getAdminSupabase } from '@/lib/admin-client'
import { ProductEditor } from './product-editor'
import { VariantsEditor } from './variants-editor'

interface PageProps {
  params: Promise<{ id: string }>
}

async function getProduct(id: string) {
  const db = getAdminSupabase()
  const { data } = await db
    .from('products')
    .select('*, variants(*), images(*), collection:collections(id, name, slug)')
    .eq('id', id)
    .single()
  return data
}

async function getCollections() {
  const db = getAdminSupabase()
  const { data } = await db.from('collections').select('id, name, slug').order('name')
  return data ?? []
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { id } = await params
  const [product, collections] = await Promise.all([getProduct(id), getCollections()])
  if (!product) notFound()

  const sortedImages   = [...(product.images ?? [])].sort((a: { position: number }, b: { position: number }) => a.position - b.position)
  const sortedVariants = [...(product.variants ?? [])].sort((a: { position: number }, b: { position: number }) => a.position - b.position)

  return (
    <div style={{ padding: '32px' }}>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px', fontSize: '13px', color: 'var(--admin-text-muted)' }}>
        <Link href="/admin/produtos" style={{ color: 'var(--admin-text-muted)', textDecoration: 'none' }}>Produtos</Link>
        <span>/</span>
        <span style={{ color: 'var(--admin-text-main)', fontWeight: 500 }}>{product.name}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px', marginBottom: '24px' }}>
        {/* Left — main editor */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <ProductEditor product={product} collections={collections} />
        </div>

        {/* Right — images preview + public link */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Images */}
          <div style={{ background: 'var(--admin-card)', borderRadius: '12px', border: '1px solid var(--admin-border)', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--admin-border)' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--admin-text-main)' }}>
                Imagens ({sortedImages.length})
              </h3>
            </div>
            <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {sortedImages.slice(0, 9).map((img: { id: string; url: string; position: number; variant_id: string | null; alt: string | null }) => (
                <div key={img.id} style={{ position: 'relative', aspectRatio: '1', background: 'var(--admin-bg)', borderRadius: '8px', overflow: 'hidden' }}>
                  <Image src={img.url} alt={img.alt ?? product.name} fill style={{ objectFit: 'contain', padding: '4px' }} sizes="100px" />
                  {img.variant_id && (
                    <div style={{ position: 'absolute', bottom: '2px', right: '2px', background: 'var(--admin-accent)', borderRadius: '4px', padding: '1px 4px', fontSize: '9px', color: '#ffffff' }}>V</div>
                  )}
                </div>
              ))}
              {sortedImages.length === 0 && (
                <div style={{ gridColumn: '1/-1', padding: '24px', textAlign: 'center', color: 'var(--admin-text-muted)', fontSize: '13px' }}>
                  Nenhuma imagem
                </div>
              )}
            </div>
          </div>

          {/* Public link */}
          <a
            href={`https://justrunner.com.br/produto/${product.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              background: 'var(--admin-bg)', border: '1px solid var(--admin-border)', borderRadius: '10px',
              padding: '12px', fontSize: '13px', color: 'var(--admin-accent)', textDecoration: 'none', fontWeight: 500,
            }}
          >
            ↗ Ver produto na loja
          </a>
        </div>
      </div>

      {/* Variants editor — full width */}
      <VariantsEditor variants={sortedVariants} images={sortedImages} />
    </div>
  )
}
