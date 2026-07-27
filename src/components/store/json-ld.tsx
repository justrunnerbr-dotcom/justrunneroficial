// Dados estruturados (schema.org) via JSON-LD.
//
// Por que existe: o site tinha zero markup estruturado, então o Google não
// tinha como mostrar preço/disponibilidade no resultado de busca — nenhum dos
// 146 produtos do feed gerava rich snippet.
//
// O JSON é serializado num <script type="application/ld+json">. O Next não
// escapa conteúdo de script, então `JSON.stringify` é sanitizado contra `<`
// para evitar que um texto de produto feche a tag (`</script>`).
import type { Product, Variant } from '@/lib/types'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://justrunner.com.br'

function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, '\\u003c'),
      }}
    />
  )
}

export function OrganizationJsonLd() {
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: 'Just Runner',
        url: SITE_URL,
        logo: `${SITE_URL}/og-image.jpg`,
        description: 'Óculos de alta performance e estilo.',
        sameAs: ['https://www.instagram.com/justrunner.br1'],
      }}
    />
  )
}

export function WebSiteJsonLd() {
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'Just Runner',
        url: SITE_URL,
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: `${SITE_URL}/busca?q={search_term_string}`,
          },
          'query-input': 'required name=search_term_string',
        },
      }}
    />
  )
}

/**
 * Product + Offer. Usa a variante mais barata como preço de referência (é o
 * "a partir de" que o Google exibe) e declara todas as variantes como offers,
 * já que cada uma tem SKU próprio.
 */
export function ProductJsonLd({ product }: { product: Product }) {
  const variants = (product.variants ?? []) as Variant[]
  if (variants.length === 0) return null

  const images = [...(product.images ?? [])]
    .sort((a, b) => a.position - b.position)
    .map((i) => i.url)
    .slice(0, 5)

  const prices = variants.map((v) => Number(v.price)).filter((p) => p > 0)
  if (prices.length === 0) return null

  const url = `${SITE_URL}/produto/${product.slug}`
  const description = product.description
    ? product.description.replace(/<[^>]+>/g, '').trim()
    : `${product.name} — Just Runner.`

  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: product.name,
        description,
        image: images.length > 0 ? images : undefined,
        sku: variants[0].sku ?? undefined,
        brand: { '@type': 'Brand', name: 'Just Runner' },
        offers: {
          '@type': 'AggregateOffer',
          url,
          priceCurrency: 'BRL',
          lowPrice: Math.min(...prices).toFixed(2),
          highPrice: Math.max(...prices).toFixed(2),
          offerCount: prices.length,
          availability: 'https://schema.org/InStock',
          itemCondition: 'https://schema.org/NewCondition',
        },
      }}
    />
  )
}
