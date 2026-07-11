import fs from 'fs'
import path from 'path'
import { getProductsByCollection } from '@/lib/queries'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { CATEGORY_SECTIONS_ORDER } from '@/app/(store)/page'
import { Hero } from './hero'
import { BenefitsBar } from './benefits-bar'
import { ProductCarousel } from './product-carousel'
import { CategoryBanner } from './category-banner'
import { SocialProof } from './social-proof'
import { WhatsAppButton } from './whatsapp-button'

// Mesmos 6 produtos em destaque da Home principal (ver C1L2_FEATURED_FIRST em
// src/app/(store)/page.tsx), só que aqui sem curadoria de variante/foto — a
// Oferta Progressiva usa o primeiro variante/foto de cada produto mesmo.
const FEATURED_FIRST_SLUGS = [
  'radar-ev-preta',
  'flak-preta',
  'plantaris-preta',
  'eye-jacket-brain-dead',
  'minute-preta',
  'eye-jacket-redux',
]

// Espelha a estrutura da Home principal (grade "Leve 2" + 1 seção por
// categoria, mesmos banners/layouts), só trocando a fonte dos produtos pro
// catálogo duplicado da Oferta Progressiva (produtos JROP-, R$175 cada — o
// desconto que forma "2 óculos por R$297" é calculado no carrinho, ver
// src/lib/cart-store.ts). Categoria de cada produto é derivada pelo slug
// original (sem o sufixo "-op"), já que todos os produtos OP vivem numa
// única coleção no Supabase.
export async function OfertaProgressivaHome({ collectionId }: { collectionId: string }) {
  const [opProducts, categorySlugByOriginalSlug] = await Promise.all([
    getProductsByCollection(collectionId),
    getOriginalCategoryMap(),
  ])

  const categoryOf = (opProductSlug: string) =>
    categorySlugByOriginalSlug.get(opProductSlug.replace(/-op$/, ''))

  const featuredFirst = opProducts.filter((p) => FEATURED_FIRST_SLUGS.includes(p.slug.replace(/-op$/, '')))
  const featuredSlugs = new Set(featuredFirst.map((p) => p.slug))
  const remaining = opProducts.filter((p) => !featuredSlugs.has(p.slug))
  const gridProducts = [...featuredFirst, ...remaining]

  const publicDir = path.join(process.cwd(), 'public')
  const categorySections = CATEGORY_SECTIONS_ORDER.map((section) => {
    const products = opProducts.filter((p) => categoryOf(p.slug) === section.slug)
    const finalProducts = section.layout === 'fixedGrid' ? products.slice(0, 6) : products

    const desktopPath = `banners-categorias/BANNER CATEGORIA/banner_categoria_${section.fileNameSlug}.jpg`
    const mobilePath = `banners-categorias/BANNER CATEGORIA/banner_categoria_${section.fileNameSlug}_mobile.jpg`
    const hasBanner = fs.existsSync(path.join(publicDir, desktopPath)) && fs.existsSync(path.join(publicDir, mobilePath))

    return {
      ...section,
      products: finalProducts,
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
      <Hero
        desktopBanner="/BANNER%20175/banner_03.jpg"
        mobileBanner="/BANNER%20175/banner_03_mobile.jpg"
        alt="Oferta Progressiva — 1 óculos por R$175, 2 por R$297"
        href="/colecao/oferta-progressiva"
      />

      <BenefitsBar />

      {gridProducts.length > 0 && (
        <ProductCarousel
          title="Oferta Progressiva"
          products={gridProducts}
          href="/colecao/oferta-progressiva"
          unroll={false}
          fixedGrid
        />
      )}

      {categorySections.map((section) => {
        if (section.products.length === 0) return null
        return (
          <div key={section.slug}>
            {section.banner && (
              <CategoryBanner desktopSrc={section.banner.desktop} mobileSrc={section.banner.mobile} alt={`Banner ${section.title}`} />
            )}
            <ProductCarousel
              title={section.title}
              products={section.products}
              unroll={false}
              mobileScroll={section.layout === 'carousel'}
              fullGrid={section.layout === 'grid'}
              fixedGrid={section.layout === 'fixedGrid'}
            />
          </div>
        )
      })}

      <SocialProof />

      <WhatsAppButton />
    </>
  )
}

async function getOriginalCategoryMap(): Promise<Map<string, string>> {
  const supabase = await createServerSupabaseClient()
  const { data } = await supabase
    .from('products')
    .select('slug, collection:collections(slug)')
    .eq('status', 'active')

  const map = new Map<string, string>()
  for (const row of (data ?? []) as { slug: string; collection: { slug: string } | { slug: string }[] | null }[]) {
    const collection = Array.isArray(row.collection) ? row.collection[0] : row.collection
    if (collection?.slug) map.set(row.slug, collection.slug)
  }
  return map
}
