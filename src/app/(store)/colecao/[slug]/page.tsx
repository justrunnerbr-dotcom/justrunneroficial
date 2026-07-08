import { notFound } from 'next/navigation'
import Image from 'next/image'
import fs from 'fs'
import path from 'path'
import { getCollectionBySlug, getProductsByCollection, getAllCollectionSlugs, getCollections, getProductsBatchByCollections } from '@/lib/queries'
import { ProductsGrid } from '@/components/store/products-grid'
import { OfertaProgressivaHome } from '@/components/store/oferta-progressiva-home'


export const revalidate = 300

export async function generateStaticParams() {
  const slugs = await getAllCollectionSlugs()
  return slugs.map((slug) => ({ slug }))
}

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params
  const collection = await getCollectionBySlug(slug)
  if (!collection) return {}
  return {
    title: `${collection.name} — Just Runner`,
    description: collection.description ?? `Explore a coleção ${collection.name} na Just Runner Store.`,
  }
}

export default async function CollectionPage({ params }: PageProps) {
  const { slug } = await params
  let collection = await getCollectionBySlug(slug)
  let products = collection ? await getProductsByCollection(collection.id) : []

  // Home espelhada, catálogo da JHF Oferta Progressiva (teste A/B) — ver PROMPT
  // CLAUDE 55+ na sessão. Mesma ordem/banners da Home principal, produtos R$175.
  if (collection && slug === 'oferta-progressiva') {
    return <OfertaProgressivaHome collectionId={collection.id} />
  }

  // Virtual collection for "Compre 1 Leve 2"
  if (!collection && slug === 'compre-1-leve-2') {
    collection = {
      id: 'virtual-compre-1-leve-2',
      name: 'Compre 1 Leve 2',
      slug: 'compre-1-leve-2',
      description: 'Na compra de 2 óculos você paga apenas R$ 297,00. Adicione os seus 2 modelos favoritos no carrinho e o desconto será aplicado automaticamente!',
      image_url: '/BANNERS%20297/banner_01_c1l2_297.jpg',
      mobile_image_url: '/BANNERS%20297/banner_01_mobile_c1l2_297.jpg',
      position: 0,
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as any

    const allCollections = await getCollections()
    const productMap = await getProductsBatchByCollections(allCollections.map(c => c.id))
    const allProducts = allCollections.flatMap(c => productMap.get(c.id) ?? [])

    // Mesma curadoria dos 6 primeiros cards da Home (ver page.tsx raiz da store)
    const featuredOrder = ['radar-ev-preta', 'flak-preta', 'plantaris-preta', 'eye-jacket-brain-dead', 'minute-preta', 'eye-jacket-redux']
    const featured = featuredOrder
      .map((slug) => allProducts.find((p) => p.slug === slug))
      .filter((p): p is NonNullable<typeof p> => p !== undefined)
    const featuredSlugs = new Set(featuredOrder)
    products = [...featured, ...allProducts.filter((p) => !featuredSlugs.has(p.slug))]
  }

  // Virtual collection for "Mais Vendidos"
  if (!collection && slug === 'mais-vendidos') {
    collection = {
      id: 'virtual-mais-vendidos',
      name: 'Mais Vendidos',
      slug: 'mais-vendidos',
      description: 'Os modelos mais desejados da Just Runner. Escolhidos a dedo pela nossa comunidade.',
      image_url: '/BANNERS%20297/mais%20vendidos_pc.jpg',
      mobile_image_url: '/BANNERS%20297/maisvendidos_mobile.jpg',
      position: 0,
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as any

    const MAIS_VENDIDOS_KEYWORDS = [
      'minute', 'plantaris', 'flak', 'dartboard', 'eye-jacket',
      'plate', 'splice', 'juliet', 'radar', 'penny',
    ]

    const allCollections = await getCollections()
    const targetCollections = MAIS_VENDIDOS_KEYWORDS
      .map(kw => allCollections.find(c => c.slug.includes(kw)))
      .filter((c): c is NonNullable<typeof c> => c !== undefined)

    const productMap = await getProductsBatchByCollections(targetCollections.map(c => c.id))
    products = targetCollections
      .map(c => (productMap.get(c.id) ?? [])[0])
      .filter((p): p is NonNullable<typeof p> => p !== undefined)
  }

  if (!collection) notFound()

  // Dynamic Banners Logic
  const publicDir = path.join(process.cwd(), 'public')
  
  let fileNameSlug = slug.replace(/-/g, '')
  if (slug === 'flak-20') fileNameSlug = 'flak2.0'
  if (slug === 'radar') fileNameSlug = 'radarev'

  const desktopPath = `/banners-categorias/BANNER CATEGORIA/banner_categoria_${fileNameSlug}.jpg`
  const mobilePath = `/banners-categorias/BANNER CATEGORIA/banner_categoria_${fileNameSlug}_mobile.jpg`
  
  const desktopUrl = `/banners-categorias/BANNER%20CATEGORIA/banner_categoria_${fileNameSlug}.jpg`
  const mobileUrl = `/banners-categorias/BANNER%20CATEGORIA/banner_categoria_${fileNameSlug}_mobile.jpg`
  
  const hasDesktop = fs.existsSync(path.join(publicDir, desktopPath))
  const hasMobile = fs.existsSync(path.join(publicDir, mobilePath))

  const finalPcBanner = hasDesktop ? desktopUrl : (collection.image_url || '/BANNERS%20297/categoria_pc.jpg')
  const finalMobileBanner = hasMobile ? mobileUrl : ((collection as any).mobile_image_url || '/BANNERS%20297/categoria_mobile.jpg')

  return (
    <>

      {/* Banner */}
      <div style={{ width: '100%' }}>
        <picture>
          {finalMobileBanner && (
            <source 
              media="(max-width: 767px)" 
              srcSet={finalMobileBanner} 
            />
          )}
          <img
            src={finalPcBanner}
            alt={collection.name}
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
            {products.length} produto{products.length !== 1 ? 's' : ''}
          </p>

          <ProductsGrid products={products} unroll={slug !== 'compre-1-leve-2' && slug !== 'mais-vendidos'} />
        </div>
      </div>
    </>
  )
}
