import Image from 'next/image'
import { getCollections, getProductsByCollection } from '@/lib/queries'
import { ProductsGrid } from '@/components/store/products-grid'


export const revalidate = 0

export async function generateMetadata() {
  return {
    title: `Todas as Coleções — Just Have Fun`,
    description: `Explore todas as nossas coleções exclusivas na Just Have Fun Store.`,
  }
}

export default async function AllCollectionsPage() {
  const allCollections = await getCollections()
  
  const allProductsArrays = await Promise.all(
    allCollections.map(c => getProductsByCollection(c.id))
  )
  
  // Pega exatamente 1 produto de cada categoria
  const products = allProductsArrays.map(arr => arr[0]).filter((p): p is NonNullable<typeof p> => p !== undefined)

  return (
    <>

      {/* Banner */}
      {/* Banner */}
      <div style={{ width: '100%' }}>
        <picture>
          <source media="(max-width: 767px)" srcSet="/BANNERS%20297/categoria_mobile.jpg" />
          <img
            src="/BANNERS%20297/categoria_pc.jpg"
            alt="Todas as Coleções"
            style={{ width: '100%', height: 'auto', display: 'block' }}
          />
        </picture>
      </div>

      {/* Products */}
      <div style={{ padding: '48px 0 80px' }}>
        <div className="page-width">
          <p
            style={{
              fontSize: '13px',
              color: 'var(--color-muted)',
              fontFamily: 'var(--font-montserrat), sans-serif',
              marginBottom: '32px',
            }}
          >
            {products.length} coleção{products.length !== 1 ? 'ões' : ''} encontradas
          </p>

          <ProductsGrid products={products} unroll={false} />
        </div>
      </div>
    </>
  )
}
