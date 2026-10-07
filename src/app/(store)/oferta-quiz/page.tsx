import type { Metadata } from 'next'
import { getCollections, getProductsBatchByCollections } from '@/lib/queries'
import { ProductsGrid } from '@/components/store/products-grid'
import { QUIZ_VALIDADE_LABEL } from '@/lib/quiz/bonus'
import { QuizOfertaHero } from './quiz-oferta-hero'

// Vitrine do Compre 1 Leve 2 só pra quem respondeu o quiz: mesmo catálogo da
// /colecao/compre-1-leve-2, com um topo que mostra o bônus escolhido e o
// progresso do carrinho até liberar. Fora do Google e fora do menu.
export const metadata: Metadata = {
  title: 'Sua oferta do quiz — Just Runner',
  robots: { index: false, follow: false },
}

export const revalidate = 300

export default async function OfertaQuizPage() {
  // Mesma montagem da coleção virtual Compre 1 Leve 2 (colecao/[slug]/page.tsx):
  // sem Oferta Progressiva (JROP-) e sem Combos (JRC-), destaques da home primeiro.
  const allCollections = (await getCollections()).filter(c => c.slug !== 'oferta-progressiva' && c.slug !== 'combos')
  const productMap = await getProductsBatchByCollections(allCollections.map(c => c.id))
  const allProducts = allCollections.flatMap(c => productMap.get(c.id) ?? [])
  const featuredOrder = ['radar-ev-preta', 'minute-preta', 'flak-preta', 'eye-jacket-redux', 'plantaris-podpah']
  const featured = featuredOrder
    .map(slug => allProducts.find(p => p.slug === slug))
    .filter((p): p is NonNullable<typeof p> => p !== undefined)
  const products = [...featured, ...allProducts.filter(p => !featuredOrder.includes(p.slug))]

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '16px clamp(16px, 3vw, 32px) 48px' }}>
      <QuizOfertaHero validade={QUIZ_VALIDADE_LABEL} />
      <h2 style={{ fontSize: 'clamp(20px, 3vw, 26px)', fontWeight: 800, margin: '28px 0 6px', fontFamily: 'var(--font-poppins), sans-serif' }}>
        Escolha seus 2 óculos da promoção
      </h2>
      <p style={{ fontSize: '14px', color: '#71717a', margin: '0 0 18px' }}>
        Compre 1, leve 2 — o mais barato do par sai de graça. Com 2 óculos no carrinho, o seu bônus entra sozinho no checkout.
      </p>
      <ProductsGrid products={products} unroll={false} />
    </div>
  )
}
