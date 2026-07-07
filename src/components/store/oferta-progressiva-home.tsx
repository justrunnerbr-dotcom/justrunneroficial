import { getProductsByCollection } from '@/lib/queries'
import { resolveOfertaProgressivaOrder } from '@/lib/oferta-progressiva'
import {
  buildOrderedCards,
  C1L2_ORDER,
  MAIS_VENDIDOS_ORDER,
  EDICAO_LIMITADA_ORDER,
  SINGLE_CATEGORY_SECTIONS,
  type CollectionWithProducts,
} from '@/app/(store)/page'
import { Hero } from './hero'
import { BenefitsBar } from './benefits-bar'
import { ProductCarousel } from './product-carousel'
import { CategoryBanner } from './category-banner'
import { WhatsAppButton } from './whatsapp-button'

// Espelha a Home principal (mesma ordem de seções, mesmos banners), só
// trocando a fonte dos produtos pro catálogo da JHF Oferta Progressiva
// (R$175, SKUs JHFOP-). Ver [[project_jhf]]/oferta-progressiva.

export async function OfertaProgressivaHome({ collectionId }: { collectionId: string }) {
  const opProducts = await getProductsByCollection(collectionId)
  const collectionsWithProducts: CollectionWithProducts[] = [
    { id: collectionId, slug: 'oferta-progressiva', name: 'Oferta Progressiva', products: opProducts },
  ]

  const [c1l2Order, maisVendidosOrder, edicaoLimitadaOrder, singleCategoryOrders] = await Promise.all([
    resolveOfertaProgressivaOrder(C1L2_ORDER),
    resolveOfertaProgressivaOrder(MAIS_VENDIDOS_ORDER),
    resolveOfertaProgressivaOrder(EDICAO_LIMITADA_ORDER),
    Promise.all(SINGLE_CATEGORY_SECTIONS.map((s) => resolveOfertaProgressivaOrder(s.order))),
  ])

  const c1l2Products = buildOrderedCards(c1l2Order, collectionsWithProducts, 'op-c1l2')
  const maisVendidosProducts = buildOrderedCards(maisVendidosOrder, collectionsWithProducts, 'op-bestseller')
  const edicaoLimitadaProducts = buildOrderedCards(edicaoLimitadaOrder, collectionsWithProducts, 'op-edicao-limitada')
  const singleSections = SINGLE_CATEGORY_SECTIONS.map((section, i) => ({
    ...section,
    products: buildOrderedCards(singleCategoryOrders[i], collectionsWithProducts, `op-${section.title.toLowerCase()}`),
  }))

  return (
    <>
      <Hero
        title="JHF Oferta Progressiva"
        subtitle="Quanto mais óculos você leva, menor o preço — e ainda ganha brindes."
        cta="Ver Ofertas"
        desktopBanner="/banners-categorias/BANNER%20CATEGORIA/banner_09.jpg"
        mobileBanner="/banners-categorias/BANNER%20CATEGORIA/banner_09_mobile.jpg"
        alt="JHF Oferta Progressiva"
        href="/colecao/oferta-progressiva"
      />

      <BenefitsBar />

      {c1l2Products.length > 0 && (
        <ProductCarousel
          title="COMPRE 1 ÓCULOS"
          products={c1l2Products}
          unroll={false}
          fixedGrid
        />
      )}

      {singleSections.slice(0, 2).map((section) =>
        section.products.length === 0 ? null : (
          <div key={section.title}>
            {section.banner && (
              <CategoryBanner desktopSrc={section.banner.desktop} mobileSrc={section.banner.mobile} alt={`Banner ${section.title}`} />
            )}
            <ProductCarousel title={section.title} products={section.products} unroll={false} mobileScroll />
          </div>
        )
      )}

      {maisVendidosProducts.length > 0 && (
        <>
          <CategoryBanner
            desktopSrc="/BANNERS%20297/mais%20vendidos_pc.jpg"
            mobileSrc="/BANNERS%20297/maisvendidos_mobile.jpg"
            alt="Mais Vendidos"
          />
          <ProductCarousel title="Mais Vendidos" products={maisVendidosProducts} unroll={false} fixedGrid />
        </>
      )}

      {singleSections.slice(2, 4).map((section) =>
        section.products.length === 0 ? null : (
          <div key={section.title}>
            {section.banner && (
              <CategoryBanner desktopSrc={section.banner.desktop} mobileSrc={section.banner.mobile} alt={`Banner ${section.title}`} />
            )}
            <ProductCarousel title={section.title} products={section.products} unroll={false} mobileScroll />
          </div>
        )
      )}

      {edicaoLimitadaProducts.length > 0 && (
        <>
          <CategoryBanner
            desktopSrc="/BANNERS%20297/categoria_pc.jpg"
            mobileSrc="/BANNERS%20297/categoria_mobile.jpg"
            alt="Edição Limitada"
          />
          <ProductCarousel title="Edição Limitada" products={edicaoLimitadaProducts} unroll={false} fixedGrid />
        </>
      )}

      {singleSections.slice(4).map((section) =>
        section.products.length === 0 ? null : (
          <div key={section.title}>
            {section.banner && (
              <CategoryBanner desktopSrc={section.banner.desktop} mobileSrc={section.banner.mobile} alt={`Banner ${section.title}`} />
            )}
            <ProductCarousel title={section.title} products={section.products} unroll={false} mobileScroll />
          </div>
        )
      )}

      <WhatsAppButton />
    </>
  )
}
