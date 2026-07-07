import { notFound } from 'next/navigation'
import { getProductBySlug, getAllProductSlugs, getRelatedProducts } from '@/lib/queries'
import { ProductClient } from '@/components/store/product-client'
import { ProductCarousel } from '@/components/store/product-carousel'
import { ProductFAQ } from '@/components/store/product-faq'
import { SocialProof } from '@/components/store/social-proof'
import { ProductBanner } from '@/components/store/product-banner'

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
  return {
    title: `${product.name} — Just Have Fun`,
    description: product.description
      ? product.description.replace(/<[^>]+>/g, '').trim().slice(0, 160)
      : `Compre ${product.name} na Just Have Fun Store.`,
  }
}

export default async function ProductPage({ params, searchParams }: PageProps) {
  const { slug } = await params
  const { v } = await searchParams
  const product = await getProductBySlug(slug)
  if (!product) notFound()

  // Buscar produtos relacionados de categorias diferentes (garantido no lib/queries)
  const relatedProducts = await getRelatedProducts(product.collection_id, product.id, 8)

  return (
    <div style={{ paddingBottom: '32px' }}>
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
      <ProductBanner />

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
