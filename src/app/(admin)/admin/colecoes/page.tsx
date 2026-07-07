import Link from 'next/link'
import Image from 'next/image'
import { getAdminSupabase } from '@/lib/admin-client'
import { CollectionStatusToggle } from './collection-status-toggle'

async function getCollections() {
  const db = getAdminSupabase()
  const { data: collections } = await db
    .from('collections')
    .select('*, products:products(id)')
    .order('position', { ascending: true })

  return (collections ?? []) as Array<{
    id: string; name: string; slug: string; description: string | null;
    image_url: string | null; position: number; status?: string;
    products: Array<{ id: string }>;
  }>
}

export default async function CollectionsPage() {
  const collections = await getCollections()

  return (
    <div style={{ padding: '32px' }}>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--admin-text-main)', marginBottom: '4px' }}>Coleções</h1>
        <p style={{ fontSize: '14px', color: 'var(--admin-text-muted)' }}>{collections.length} coleção/coleções</p>
      </div>

      {/* Concept explanation */}
      <div style={{
        background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: '12px',
        padding: '16px 20px', marginBottom: '24px', fontSize: '13px', color: '#3730a3',
      }}>
        <strong>Shopify Collections</strong> — cada produto pertence a uma coleção. Coleções virtuais
        (Mais Vendidos, Compre 1 Leve 2) são geradas dinamicamente pelo sistema sem alterar o banco de dados.
      </div>

      <div style={{ background: 'var(--admin-card)', borderRadius: '12px', border: '1px solid var(--admin-border)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--admin-bg)' }}>
              {['Imagem', 'Nome', 'Slug', 'Produtos', 'Posição', 'Status', 'Ações'].map(h => (
                <th key={h} style={{ padding: '12px 20px', fontSize: '11px', fontWeight: 600, color: 'var(--admin-text-muted)', textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {collections.map((c) => (
              <tr key={c.id} style={{ borderTop: '1px solid var(--admin-border)' }}>
                <td style={{ padding: '14px 20px' }}>
                  <div style={{ width: '48px', height: '32px', borderRadius: '6px', background: 'var(--admin-bg)', position: 'relative', overflow: 'hidden' }}>
                    {c.image_url && (
                      <Image src={c.image_url} alt={c.name} fill style={{ objectFit: 'cover' }} sizes="48px" />
                    )}
                  </div>
                </td>
                <td style={{ padding: '14px 20px', fontSize: '13px', fontWeight: 500, color: 'var(--admin-text-main)' }}>
                  {c.name}
                </td>
                <td style={{ padding: '14px 20px', fontSize: '12px', color: 'var(--admin-text-muted)', fontFamily: 'monospace' }}>
                  {c.slug}
                </td>
                <td style={{ padding: '14px 20px', fontSize: '13px', color: 'var(--admin-text-sec)', textAlign: 'center' }}>
                  {c.products.length}
                </td>
                <td style={{ padding: '14px 20px', fontSize: '13px', color: 'var(--admin-text-sec)', textAlign: 'center' }}>
                  {c.position}
                </td>
                <td style={{ padding: '14px 20px' }}>
                  <CollectionStatusToggle id={c.id} status={c.status ?? 'active'} />
                </td>
                <td style={{ padding: '14px 20px' }}>
                  <Link
                    href={`/admin/colecoes/${c.id}`}
                    style={{ fontSize: '13px', color: 'var(--admin-accent)', textDecoration: 'none', fontWeight: 500 }}
                  >
                    Editar
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Virtual collections */}
      <div style={{ marginTop: '24px', background: 'var(--admin-card)', borderRadius: '12px', border: '1px solid var(--admin-border)', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--admin-border)' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--admin-text-main)' }}>Coleções Virtuais (sistema)</h3>
          <p style={{ fontSize: '12px', color: 'var(--admin-text-muted)', marginTop: '4px' }}>Geradas dinamicamente — não editar via banco de dados</p>
        </div>
        {[
          { name: 'Mais Vendidos', slug: 'mais-vendidos', desc: 'Top 10 produtos com mais vendas (baseado em palavras-chave no slug)' },
          { name: 'Compre 1 Leve 2', slug: 'compre-1-leve-2', desc: 'Todos os produtos elegíveis para promoção 2x R$297' },
        ].map(v => (
          <div key={v.slug} style={{ padding: '14px 20px', borderTop: '1px solid var(--admin-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--admin-text-main)' }}>{v.name}</div>
              <div style={{ fontSize: '12px', color: 'var(--admin-text-muted)', marginTop: '2px' }}>{v.desc}</div>
            </div>
            <a
              href={`https://justhavefun.com.br/colecao/${v.slug}`}
              target="_blank"
              style={{ fontSize: '12px', color: 'var(--admin-accent)', textDecoration: 'none' }}
            >
              ↗ Ver
            </a>
          </div>
        ))}
      </div>
    </div>
  )
}
