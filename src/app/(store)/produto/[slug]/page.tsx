import { notFound } from 'next/navigation'
import { getProductBySlug, getAllProductSlugs, getRelatedProducts } from '@/lib/queries'
import { ProductClient } from '@/components/store/product-client'
import { ProductCarousel } from '@/components/store/product-carousel'
import { ProductFAQ } from '@/components/store/product-faq'
import { SocialProof } from '@/components/store/social-proof'
import { ProductBanner } from '@/components/store/product-banner'
import { isCombo as isComboSku } from '@/lib/sku'
import { ProductJsonLd } from '@/components/store/json-ld'

export const revalidate = 60

export async function generateStaticParams() {
  const slugs = await getAllProductSlugs()
  return slugs.map((slug) => ({ slug }))
}

interface PageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ v?: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params
  const product = await getProductBySlug(slug)
  if (!product) return {}

  const title = `${product.name} — Just Runner`
  const description = product.description
    ? product.description.replace(/<[^>]+>/g, '').trim().slice(0, 160)
    : `Compre ${product.name} na Just Runner.`

  // Foto de capa como imagem de compartilhamento, servida já redimensionada
  // pelo transformador do Supabase (ver image-loader.ts). As fotos do catálogo
  // são quadradas, daí o 1200x1200.
  const cover = [...(product.images ?? [])].sort((a, b) => a.position - b.position)[0]
  const ogImage = cover
    ? `${cover.url.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/')}?width=1200&quality=80&resize=contain`
    : '/og-image.jpg'

  return {
    title,
    description,
    openGraph: {
      type: 'website',
      title,
      description,
      images: [{ url: ogImage, width: 1200, height: 1200, alt: product.name }],
    },
    twitter: { card: 'summary_large_image' as const, title, description, images: [ogImage] },
  }
}

export default async function ProductPage({ params, searchParams }: PageProps) {
  const { slug } = await params
  const { v } = await searchParams
  const product = await getProductBySlug(slug)
  if (!product) notFound()

  // Buscar produtos relacionados de categorias diferentes (garantido no lib/queries)
  const relatedProducts = await getRelatedProducts(product.collection_id, product.id, 8)

  // O banner promocional vende a mecânica "2 óculos por R$297" (a arte tem um
  // carrinho de exemplo com o desconto aplicado). Combos não participam dessa
  // promoção, então na página deles isso seria propaganda de um desconto que o
  // checkout não vai dar.
  const isCombo = product.variants.some(isComboSku)

  return (
    <div style={{ paddingBottom: '32px' }}>
      <ProductJsonLd product={product} />

      {/* ── Main 2-col layout ── */}
      <div className="product-page-top">
        <div className="page-width">
          {/* Gallery + Info — single client component with unified state */}
          <ProductClient product={product} initialVariantId={v} />
        </div>
      </div>

      {/* ── Social Proof / Customer Gallery ── */}
      <SocialProof />

      {/* ── Banners Promocionais ── */}
      {!isCombo && <ProductBanner />}

      {/* ── Guia Rápido (FAQ) ── */}
      <div style={{ marginTop: '0' }}>
        <ProductFAQ />
      </div>

      {/* ── Talvez você goste ── */}
      {relatedProducts.length > 0 && (
        <ProductCarousel
          title="Talvez você goste"
          products={relatedProducts}
          href="/colecao"
          mobileScroll
        />
      )}
    </div>
  )
}
