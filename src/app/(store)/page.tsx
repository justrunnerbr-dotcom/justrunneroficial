import fs from 'fs'
import path from 'path'
import { getCollections, getProductsBatchByCollections } from '@/lib/queries'
import { Hero } from '@/components/store/hero'
import { BenefitsBar } from '@/components/store/benefits-bar'
import { ProductCarousel } from '@/components/store/product-carousel'
import { CategoryBanner } from '@/components/store/category-banner'
import { WhatsAppButton } from '@/components/store/whatsapp-button'
import { SocialProof } from '@/components/store/social-proof'
import { resolveVariantImages } from '@/lib/product-image'

export const revalidate = 300

export type CollectionWithProducts = Awaited<ReturnType<typeof getProductsBatchByCollections>> extends Map<string, infer P>
  ? { id: string; slug: string; name: string; products: P }
  : never

export type OrderEntry = { collectionSlug: string; productSlug: string; variantId: string }

// Monta 1 card por entrada, na ORDEM exata da lista — usado por todas as vitrines
// manuais da Home (Compre 1 Leve 2, Mais Vendidos, Edição Limitada, categorias
// únicas). A variação referenciada vai primeiro no card (pro link levar direto
// nela); entradas cujo produto/variação não existir no catálogo são puladas
// silenciosamente (o chamador decide o que fazer com o resultado mais curto).
export function buildOrderedCards(
  order: OrderEntry[],
  collectionsWithProducts: CollectionWithProducts[],
  keyPrefix: string,
) {
  return order
    .map(({ collectionSlug, productSlug, variantId }, index) => {
      const collection = collectionsWithProducts.find((c) => c.slug === collectionSlug)
      const product = collection?.products.find((p) => p.slug === productSlug)
      if (!product) return undefined

      const { primary, secondary } = resolveVariantImages(product.images, product.variants, variantId)
      const cardImages = [primary, secondary]
        .filter((img): img is NonNullable<typeof img> => img !== null)
        .map((img, i) => ({ ...img, position: i }))

      const featuredVariant = product.variants.find((v) => v.id === variantId)
      const orderedVariants = featuredVariant
        ? [featuredVariant, ...product.variants.filter((v) => v.id !== variantId)]
        : product.variants

      return { ...product, id: `${product.id}-${keyPrefix}-${index}`, images: cardImages, variants: orderedVariants }
    })
    .filter((p): p is NonNullable<typeof p> => p !== undefined)
}

// Primeiros 6 cards da grade "Leve 2 pelo preço de 1" — curadoria manual pedida
// pelo usuário (2026-07-08). Variante/foto de capa escolhida por padronização
// visual (ângulo ¾, já que Flak/Plantaris/Minute só têm foto nesse ângulo).
const C1L2_FEATURED_FIRST: OrderEntry[] = [
  { collectionSlug: 'radar', productSlug: 'radar-ev-preta', variantId: 'e72555e9-6f81-4034-b9ba-65c44ee5c428' }, // Lente Preta
  { collectionSlug: 'flak', productSlug: 'flak-preta', variantId: 'd3d36a7c-2eb0-4286-ae73-c03757b1767f' }, // Lente Preta
  { collectionSlug: 'plantaris', productSlug: 'plantaris-preta', variantId: '4b9813f4-20bf-498a-b2a6-8157329c5ab3' }, // Único
  { collectionSlug: 'eye-jacket', productSlug: 'eye-jacket-brain-dead', variantId: '30cbf368-2983-4cfa-8f66-1b46a86b61a1' }, // Lente Preta
  { collectionSlug: 'minute', productSlug: 'minute-preta', variantId: '11079fce-96bf-4c79-b1b9-094c1cf45239' }, // Lente Ruby
  { collectionSlug: 'eye-jacket', productSlug: 'eye-jacket-redux', variantId: '1dc19f08-9672-48d8-a3e5-af6bc7c10861' }, // Lente Preta
]

// ── Seções de categoria única (Home) — 1 por categoria real da Just Runner ────
// Mostra a categoria inteira (todos os produtos, direto de `collectionsWithProducts`).
// 3 layouts possíveis: carrossel (scroll horizontal no mobile), grade (cresce em
// linhas de 2/4, sem cortar e sem scroll lateral) e vitrine fixa (2 colunas, 6 no
// total, igual Compre 1 Leve 2). `fileNameSlug` é o nome usado nos arquivos de
// banner enviados pelo usuário (mesma convenção de /colecao/[slug]).
export const CATEGORY_SECTIONS_ORDER: {
  slug: string
  title: string
  fileNameSlug: string
  layout: 'carousel' | 'grid' | 'fixedGrid'
}[] = [
  { slug: 'eye-jacket', title: 'Eye Jacket', fileNameSlug: 'eyejacket', layout: 'carousel' },
  { slug: 'flak', title: 'Flak', fileNameSlug: 'flak', layout: 'grid' },
  { slug: 'minute', title: 'Minute', fileNameSlug: 'minute', layout: 'fixedGrid' },
  { slug: 'hstn', title: 'HSTN', fileNameSlug: 'hstn', layout: 'carousel' },
  { slug: 'plantaris', title: 'Plantaris', fileNameSlug: 'plantaris', layout: 'fixedGrid' },
  { slug: 'radar', title: 'Radar', fileNameSlug: 'radarev', layout: 'carousel' },
  { slug: 'straight-jacket', title: 'Straight Jacket', fileNameSlug: 'straightjacket', layout: 'grid' },
]

export default async function HomePage() {
  // Oferta Progressiva é um catálogo duplicado à parte (produtos JROP-,
  // R$175) — não deve aparecer na Home principal, só na própria página dela.
  const collections = (await getCollections()).filter((c) => c.slug !== 'oferta-progressiva')

  // 1 batched query instead of N sequential getProductsByCollection calls
  const collectionIds = collections.map((c) => c.id)
  const productsByCollection = await getProductsBatchByCollections(collectionIds)

  const collectionsWithProducts = collections.map((c) => ({
    ...c,
    products: productsByCollection.get(c.id) ?? [],
  }))

  const featuredFirst = buildOrderedCards(C1L2_FEATURED_FIRST, collectionsWithProducts, 'c1l2-featured')
  const featuredSlugs = new Set(C1L2_FEATURED_FIRST.map((e) => e.productSlug))
  const remainingProducts = collectionsWithProducts.flatMap((c) => c.products).filter((p) => !featuredSlugs.has(p.slug))
  const c1l2Products = [...featuredFirst, ...remainingProducts]

  const publicDir = path.join(process.cwd(), 'public')
  const categorySections = CATEGORY_SECTIONS_ORDER.map((section) => {
    const collection = collectionsWithProducts.find((c) => c.slug === section.slug)
    // fixedGrid = vitrine fixa "2 colunas, 6 no total" (igual Leve 2 pelo preço de 1) — corta em 6.
    const products = section.layout === 'fixedGrid' ? (collection?.products ?? []).slice(0, 6) : (collection?.products ?? [])

    const desktopPath = `banners-categorias/BANNER CATEGORIA/banner_categoria_${section.fileNameSlug}.jpg`
    const mobilePath = `banners-categorias/BANNER CATEGORIA/banner_categoria_${section.fileNameSlug}_mobile.jpg`
    const hasBanner = fs.existsSync(path.join(publicDir, desktopPath)) && fs.existsSync(path.join(publicDir, mobilePath))

    return {
      ...section,
      products,
      banner: hasBanner
        ? {
            desktop: `/banners-categorias/BANNER%20CATEGORIA/banner_categoria_${section.fileNameSlug}.jpg`,
            mobile: `/banners-categorias/BANNER%20CATEGORIA/banner_categoria_${section.fileNameSlug}_mobile.jpg`,
          }
        : undefined,
    }
  })

  return (
    <>
      <Hero />

      <BenefitsBar />

      {/* 1. Compre 1 Leve 2 — grid 2 colunas */}
      {c1l2Products.length > 0 && (
        <ProductCarousel
          title="Leve 2 pelo preço de 1"
          products={c1l2Products}
          href="/colecao/compre-1-leve-2"
          unroll={false}
          fixedGrid
        />
      )}

      {/* 2. Uma seção por categoria — banner + carrossel/grade alternando */}
      {categorySections.map((section) => {
        if (section.products.length === 0) return null
        return (
          <div key={section.slug}>
            {section.banner && (
              <CategoryBanner desktopSrc={section.banner.desktop} mobileSrc={section.banner.mobile} alt={`Banner ${section.title}`} href={`/colecao/${section.slug}`} />
            )}
            <ProductCarousel
              title={section.title}
              products={section.products}
              href={`/colecao/${section.slug}`}
              unroll={false}
              mobileScroll={section.layout === 'carousel'}
              fullGrid={section.layout === 'grid'}
              fixedGrid={section.layout === 'fixedGrid'}
            />
          </div>
        )
      })}

      {/* ── Social Proof / Customer Gallery — mesmo bloco usado na página de produto ── */}
      <SocialProof />

      <WhatsAppButton />
    </>
  )
}
