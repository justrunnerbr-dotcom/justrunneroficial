import Link from 'next/link'

export function PromoBanner() {
  return (
    <section>
      <Link href="/colecao/compre-1-leve-2" style={{ display: 'block' }}>
        <picture>
          <source media="(min-width: 750px)" srcSet="/banner_02.jpg" />
          <img
            src="/banner_02_mobile.jpg"
            alt="Compre 1 Leve 2 — Adicione 2 óculos ao carrinho e pague apenas 1"
            style={{ width: '100%', height: 'auto', display: 'block' }}
          />
        </picture>
      </Link>
    </section>
  )
}
