import { getCollections, getSettings, getProductsBatchByCollections } from '@/lib/queries'
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

// ── Seção 1: Compre 1 Leve 2 (grid, todos os produtos) ────────────────────────
// Coleção virtual (não é uma linha em `collections`) — mostra todo o catálogo
// ativo. Mesma lógica de /colecao/compre-1-leve-2. Não filtra por categoria.
// Mantido vazio (em vez de removido) só porque oferta-progressiva-home.tsx
// ainda importa este símbolo — feature JHF sem coleção correspondente aqui.
export const C1L2_ORDER: OrderEntry[] = []

// Primeiros 6 cards da grade "Leve 2 pelo preço de 1" — curadoria manual pedida
// pelo usuário (2026-07-08). Variante/foto de capa escolhida por padronização
// visual (ângulo ¾, já que Flak/Plantaris/Minute só têm foto nesse ângulo).
const C1L2_FEATURED_FIRST: OrderEntry[] = [
  { collectionSlug: 'radar', productSlug: 'radar-ev-preta', variantId: 'e72555e9-6f81-4034-b9ba-65c44ee5c428' }, // Lente Preta
  { collectionSlug: 'flak', productSlug: 'flak-preta', variantId: 'd3d36a7c-2eb0-4286-ae73-c03757b1767f' }, // Lente Preta
  { collectionSlug: 'plantaris', productSlug: 'plantaris-preta', variantId: '4b9813f4-20bf-498a-b2a6-8157329c5ab3' }, // Único
  { collectionSlug: 'eye-jacket', productSlug: 'eye-jacket-brain-dead', variantId: '30cbf368-2983-4cfa-8f66-1b46a86b61a1' }, // Lente Preta
  { collectionSlug: 'minute', productSlug: 'minute-preta', variantId: '11079fce-96bf-4c79-b1b9-094c1cf45239' }, // Lente Ruby
  { collectionSlug: 'half-jacket', productSlug: 'half-jacket', variantId: 'ae7916a9-6cdc-48e0-b04b-70a2e09ca2ee' }, // Cooper
]

// ── Seção 4: Mais Vendidos (grid, até 10 produtos) ────────────────────────────
export const MAIS_VENDIDOS_ORDER: OrderEntry[] = [
  { collectionSlug: 'plantaris', productSlug: 'plantaris', variantId: '33348bc9-1f9e-4085-b7cc-a8207bd561f8' }, // Plantaris Premium
  { collectionSlug: 'radar', productSlug: 'radar', variantId: '23b8b854-0eaf-470e-8200-f223066ab274' }, // Radar Preta Metalic (aprox.)
  { collectionSlug: 'eye-jacket', productSlug: 'eye-jacket-redux', variantId: '170bf09b-6a7a-48fc-af08-5a69fb5c036f' }, // Eye Jacket Redux Metalic (aprox. Preta Lente Metalic)
  { collectionSlug: 'juliet', productSlug: 'juliet', variantId: '2589379a-29c6-4d54-aaae-3a8eaefaf31c' }, // Juliet 24k Gold
  { collectionSlug: 'splice', productSlug: 'splice', variantId: 'b5a7456f-7703-4a07-ae02-e761f7983865' }, // Splice Cooper VR28
  { collectionSlug: 'penny', productSlug: 'penny', variantId: 'a63c5bca-62f6-457a-ae70-e3be0466f7e8' }, // Penny X-Metal Ruby
  { collectionSlug: 'dartboard', productSlug: 'dartboard', variantId: '50983bd6-32bf-40c7-b3b2-fd5d7536e953' }, // Dartboard Rosa (aprox. Rosa Haste Branca)
  { collectionSlug: 'hstn', productSlug: 'hstn', variantId: '80aa86dc-0296-4f2b-9415-0f11a3dc92ba' }, // HSTN Matte (aprox. Preta Mattê Metalic)
  { collectionSlug: 'eye-jacket', productSlug: 'eye-jacket', variantId: '76525081-4e88-40b7-8772-bb7300264ff3' }, // Eye Jacket Laranja Preta (aprox. "Piet Laranja Preto")
  // "Minute Cooper bronze" não existe no catálogo — sem substituto seguro, entrada pulada.
]

// ── Seção 7: Edição Limitada (grid, até 10 produtos) ──────────────────────────
export const EDICAO_LIMITADA_ORDER: OrderEntry[] = [
  { collectionSlug: 'juliet', productSlug: 'juliet', variantId: '2589379a-29c6-4d54-aaae-3a8eaefaf31c' }, // Juliet 24k Gold
  { collectionSlug: 'dartboard', productSlug: 'dartboard', variantId: '50983bd6-32bf-40c7-b3b2-fd5d7536e953' }, // Dartboard Rosa (aprox.)
  { collectionSlug: 'eye-jacket', productSlug: 'eye-jacket', variantId: '76525081-4e88-40b7-8772-bb7300264ff3' }, // Eye Jacket Laranja Preta (aprox. "Piet Laranja Preto")
  { collectionSlug: 'romeo-1', productSlug: 'romeo-1', variantId: '4d0ed3a4-71c4-4afd-8dcf-15c684b1a2ce' }, // Romeo 1 Xmetal Espelhada (aprox. "X-Metal Metalic")
  { collectionSlug: 'plate', productSlug: 'plate', variantId: 'c78ef0ec-3331-4f32-9401-57c23080ded7' }, // Plate Xmetal Lente Preta
  { collectionSlug: 'splice', productSlug: 'splice', variantId: 'b5a7456f-7703-4a07-ae02-e761f7983865' }, // Splice Cooper VR28
  { collectionSlug: 'radar', productSlug: 'radar', variantId: 'dea258cb-3d9e-4923-b6c4-9a0dd78fadfc' }, // Radar Premium Piet Torch
  // "Romeo 1 X-Metal Metalic" (variação alternativa) e "Pitboss X-Metal Gold Café"
  // não existem no catálogo — sem substituto seguro, entradas puladas.
]

// ── Seções 2,3,5,6,8-13: categorias únicas em carrossel ───────────────────────
export const SINGLE_CATEGORY_SECTIONS: {
  title: string
  banner?: { desktop: string; mobile: string }
  order: OrderEntry[]
}[] = [
  {
    title: 'Minute',
    banner: { desktop: '/banners-categorias/BANNER%20CATEGORIA/banner_categoria_minute.jpg', mobile: '/banners-categorias/BANNER%20CATEGORIA/banner_categoria_minute_mobile.jpg' },
    order: [
      { collectionSlug: 'minute', productSlug: 'minute', variantId: 'f96ff04a-584e-498f-84ea-f80f3a6f0b58' }, // Cooper VR28
      { collectionSlug: 'minute', productSlug: 'minute', variantId: '910d0ca1-a92f-4da2-8702-69ae24dc7e78' }, // Preta Preta
      { collectionSlug: 'minute', productSlug: 'minute', variantId: '40f1a529-2fe7-4a26-babe-3c243fc2aab8' }, // Preta Torch
      { collectionSlug: 'minute', productSlug: 'minute', variantId: '6e10aab4-99a6-4690-aa5d-662630dd1585' }, // Preta Metalic (aprox. Espelhada)
      // "Cooper Cooper" e "Cooper bronze" não existem no catálogo — puladas.
    ],
  },
  {
    title: 'Flak 2.0',
    banner: { desktop: '/banners-categorias/BANNER%20CATEGORIA/banner_categoria_flak2.0.jpg', mobile: '/banners-categorias/BANNER%20CATEGORIA/banner_categoria_flak2.0_mobile.jpg' },
    order: [
      { collectionSlug: 'flak-20', productSlug: 'flak-20', variantId: 'acda8bba-3762-4880-a91f-f3f69c20a8a7' }, // Preta Preta
      { collectionSlug: 'flak-20', productSlug: 'flak-20', variantId: 'f5773e85-657b-4093-a7bc-fff9fdeadfe2' }, // Preta Metalic (aprox. Espelhada)
      { collectionSlug: 'flak-20', productSlug: 'flak-20', variantId: '43ddc18b-6219-441a-9981-c2461f705dff' }, // Preta Tanzanite
      { collectionSlug: 'flak-20', productSlug: 'flak-20', variantId: '5633b4bc-6555-4b76-96a7-cc1c5ce03258' }, // Preta Ruby
      // "Preta Prizm" não existe no catálogo — pulada.
    ],
  },
  {
    title: 'Eye Jacket Redux',
    banner: { desktop: '/banners-categorias/BANNER%20CATEGORIA/banner_categoria_eyejacket.jpg', mobile: '/banners-categorias/BANNER%20CATEGORIA/banner_categoria_eyejacket_mobile.jpg' },
    order: [
      { collectionSlug: 'eye-jacket', productSlug: 'eye-jacket-redux', variantId: '09a0b695-9896-4339-bcfc-291e46fdf595' }, // Dark Ruby
      { collectionSlug: 'eye-jacket', productSlug: 'eye-jacket-redux', variantId: '22c264a6-eaf2-463d-b776-523b4849094d' }, // Preto
      { collectionSlug: 'eye-jacket', productSlug: 'eye-jacket-redux', variantId: '170bf09b-6a7a-48fc-af08-5a69fb5c036f' }, // Metalic (aprox. Preta Lente Metalic)
      { collectionSlug: 'eye-jacket', productSlug: 'eye-jacket-redux', variantId: '91d58ef5-2e94-4cc7-bf03-e03e827f0d6b' }, // Gold Café
      { collectionSlug: 'eye-jacket', productSlug: 'eye-jacket-redux', variantId: '4fcc4d53-ed62-4c3a-96ec-3ca290a344d4' }, // Areia Metalic
    ],
  },
  {
    title: 'Plantaris',
    banner: { desktop: '/banners-categorias/BANNER%20CATEGORIA/banner_categoria_plantaris.jpg', mobile: '/banners-categorias/BANNER%20CATEGORIA/banner_categoria_plantaris_mobile.jpg' },
    order: [
      { collectionSlug: 'plantaris', productSlug: 'plantaris', variantId: '33348bc9-1f9e-4085-b7cc-a8207bd561f8' }, // Premium
      { collectionSlug: 'plantaris', productSlug: 'plantaris', variantId: '5478ce7e-b8a2-4e13-9b3b-c7d72de9265c' }, // Preta Preto
      // "Premium Black Gray Preta", "Premium Matte Bone Vr28" e "Premium Stonewash"
      // não existem no catálogo — puladas.
    ],
  },
  {
    title: 'Radar Premium',
    banner: { desktop: '/banners-categorias/BANNER%20CATEGORIA/banner_categoria_radarev.jpg', mobile: '/banners-categorias/BANNER%20CATEGORIA/banner_categoria_radarev_mobile.jpg' },
    order: [
      { collectionSlug: 'radar', productSlug: 'radar', variantId: '23b8b854-0eaf-470e-8200-f223066ab274' }, // Preta Metalic (aprox.)
      { collectionSlug: 'radar', productSlug: 'radar', variantId: 'dea258cb-3d9e-4923-b6c4-9a0dd78fadfc' }, // Piet Torch
      { collectionSlug: 'radar', productSlug: 'radar', variantId: '21792c5d-01f7-4ad9-a989-3650e409f128' }, // Preta Preto
      { collectionSlug: 'radar', productSlug: 'radar', variantId: '0d0af0d8-dc62-4426-9690-360782a17fdd' }, // Piet Preto
      { collectionSlug: 'radar', productSlug: 'radar', variantId: '1d77f9fb-6b76-4178-ac8b-4e7a4e84783f' }, // Preta Dark Ruby
    ],
  },
  {
    title: 'Juliet',
    banner: { desktop: '/banners-categorias/BANNER%20CATEGORIA/banner_categoria_juliet.jpg', mobile: '/banners-categorias/BANNER%20CATEGORIA/banner_categoria_juliet_mobile.jpg' },
    order: [
      { collectionSlug: 'juliet', productSlug: 'juliet', variantId: '5987ff71-274f-4a74-b3b9-51069c4d2774' }, // X-Metal Preta
      { collectionSlug: 'juliet', productSlug: 'juliet', variantId: 'c1462259-140c-41dc-a35e-9f94bba16cb7' }, // Preta Preta
      { collectionSlug: 'juliet', productSlug: 'juliet', variantId: 'd40129d4-ca40-43fc-a65d-dc9ca1f9cb22' }, // Plasma Preto
      { collectionSlug: 'juliet', productSlug: 'juliet', variantId: '5c80874b-7b60-4728-97b6-87fb381e8720' }, // Plasma Metalic (aprox. Espelhada)
      { collectionSlug: 'juliet', productSlug: 'juliet', variantId: '2589379a-29c6-4d54-aaae-3a8eaefaf31c' }, // 24k Gold
      // "Corvette Corvette Aro X-Metal" não existe no catálogo (só há "Aro Cinza"
      // e "Aro Preto", nenhum "Aro Xmetal") — pulada.
    ],
  },
  {
    title: 'Dartboard',
    banner: { desktop: '/banners-categorias/BANNER%20CATEGORIA/banner_categoria_dartboard.jpg', mobile: '/banners-categorias/BANNER%20CATEGORIA/banner_categoria_dartboard_mobile.jpg' },
    order: [
      { collectionSlug: 'dartboard', productSlug: 'dartboard', variantId: 'bc7c831c-1a85-4a4c-a010-1ddfe4d85395' }, // Degradê
      { collectionSlug: 'dartboard', productSlug: 'dartboard', variantId: '93d5885a-8d9f-4df7-b74f-57ae3d6664a7' }, // VR28
      { collectionSlug: 'dartboard', productSlug: 'dartboard', variantId: '36a7331e-2a10-41ef-9657-f7b77d556f87' }, // Preta
      { collectionSlug: 'dartboard', productSlug: 'dartboard', variantId: '50983bd6-32bf-40c7-b3b2-fd5d7536e953' }, // Rosa (aprox. Rosa Haste Branca)
    ],
  },
  {
    title: 'Splice',
    banner: { desktop: '/banners-categorias/BANNER%20CATEGORIA/banner_categoria_splice.jpg', mobile: '/banners-categorias/BANNER%20CATEGORIA/banner_categoria_splice_mobile.jpg' },
    order: [
      { collectionSlug: 'splice', productSlug: 'splice', variantId: '4cc3c706-73ed-4617-b024-3ed2a62433b2' }, // Preta Preto
      { collectionSlug: 'splice', productSlug: 'splice', variantId: 'dc526a90-8ef3-4d05-a007-d476f91e9b8d' }, // Preta Torch
      { collectionSlug: 'splice', productSlug: 'splice', variantId: 'b5a7456f-7703-4a07-ae02-e761f7983865' }, // Cooper VR28
      { collectionSlug: 'splice', productSlug: 'splice', variantId: '4e0c4ca3-72d7-4f2e-bffc-a16969b72f57' }, // Cinza Preto
    ],
  },
  {
    title: 'Penny',
    banner: { desktop: '/banners-categorias/BANNER%20CATEGORIA/banner_categoria_penny.jpg', mobile: '/banners-categorias/BANNER%20CATEGORIA/banner_categoria_penny_mobile.jpg' },
    order: [
      { collectionSlug: 'penny', productSlug: 'penny', variantId: '0bed6b28-9c87-464c-8e08-7830162e3776' }, // Preta Preto
      { collectionSlug: 'penny', productSlug: 'penny', variantId: 'a63c5bca-62f6-457a-ae70-e3be0466f7e8' }, // X-Metal Ruby
      // "Plasma Torch" e "Plasma Metalic" não existem no catálogo (só há "Plasma"
      // simples e "Premium Plasma") — sem substituto seguro, puladas.
    ],
  },
  {
    title: 'HSTN',
    order: [
      { collectionSlug: 'hstn', productSlug: 'hstn', variantId: '4ae78b3b-549f-4ddc-a2d4-61c3c0985edd' }, // Preta Preto
      { collectionSlug: 'hstn', productSlug: 'hstn', variantId: '80aa86dc-0296-4f2b-9415-0f11a3dc92ba' }, // Matte (aprox. "Preta Mattê Metalic")
      // "Preta Metalic" não existe no catálogo — pulada.
    ],
  },
]

export default async function HomePage() {
  // 2 parallel queries instead of 14 sequential ones
  const [settings, collections] = await Promise.all([
    getSettings(['hero_title', 'hero_subtitle', 'hero_cta']),
    getCollections(),
  ])

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
  const maisVendidosProducts = buildOrderedCards(MAIS_VENDIDOS_ORDER, collectionsWithProducts, 'bestseller')
  const edicaoLimitadaProducts = buildOrderedCards(EDICAO_LIMITADA_ORDER, collectionsWithProducts, 'edicao-limitada')

  return (
    <>
      <Hero
        title={settings['hero_title'] ?? 'Just Runner'}
        subtitle={settings['hero_subtitle'] ?? 'Óculos de alta performance e estilo.'}
        cta={settings['hero_cta'] ?? 'Ver Coleções'}
      />

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

      {/* 2-3. Minute, Flak 2.0 — carrossel de categoria única */}
      {SINGLE_CATEGORY_SECTIONS.slice(0, 2).map((section) => {
        const products = buildOrderedCards(section.order, collectionsWithProducts, section.title.toLowerCase())
        if (products.length === 0) return null
        return (
          <div key={section.title}>
            {section.banner && (
              <CategoryBanner desktopSrc={section.banner.desktop} mobileSrc={section.banner.mobile} alt={`Banner ${section.title}`} />
            )}
            <ProductCarousel title={section.title} products={products} unroll={false} mobileScroll />
          </div>
        )
      })}

      {/* 4. Mais Vendidos — vitrine fixa, grid 2 colunas (sem scroll no mobile) */}
      {maisVendidosProducts.length > 0 && (
        <>
          <CategoryBanner
            desktopSrc="/BANNERS%20297/mais%20vendidos_pc.jpg"
            mobileSrc="/BANNERS%20297/maisvendidos_mobile.jpg"
            alt="Mais Vendidos"
            href="/colecao/mais-vendidos"
          />
          <ProductCarousel
            title="Mais Vendidos"
            products={maisVendidosProducts}
            href="/colecao/mais-vendidos"
            unroll={false}
            fixedGrid
          />
        </>
      )}

      {/* 5-6. Eye Jacket Redux, Plantaris — carrossel de categoria única */}
      {SINGLE_CATEGORY_SECTIONS.slice(2, 4).map((section) => {
        const products = buildOrderedCards(section.order, collectionsWithProducts, section.title.toLowerCase())
        if (products.length === 0) return null
        return (
          <div key={section.title}>
            {section.banner && (
              <CategoryBanner desktopSrc={section.banner.desktop} mobileSrc={section.banner.mobile} alt={`Banner ${section.title}`} />
            )}
            <ProductCarousel title={section.title} products={products} unroll={false} mobileScroll />
          </div>
        )
      })}

      {/* 7. Edição Limitada — grid 2 colunas */}
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

      {/* 8-13. Radar Premium, Juliet, Dartboard, Splice, Penny, HSTN — carrossel */}
      {SINGLE_CATEGORY_SECTIONS.slice(4).map((section) => {
        const products = buildOrderedCards(section.order, collectionsWithProducts, section.title.toLowerCase())
        if (products.length === 0) return null
        return (
          <div key={section.title}>
            {section.banner && (
              <CategoryBanner desktopSrc={section.banner.desktop} mobileSrc={section.banner.mobile} alt={`Banner ${section.title}`} />
            )}
            <ProductCarousel title={section.title} products={products} unroll={false} mobileScroll />
          </div>
        )
      })}

      {/* ── Social Proof / Customer Gallery — mesmo bloco usado na página de produto ── */}
      <SocialProof />

      <WhatsAppButton />
    </>
  )
}
