import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Product } from '@/lib/types'

export const revalidate = 3600

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://justrunner.com.br'
const BRAND = 'Just Runner'
const SUNGLASSES_CATEGORY = '178' // Google Product Category: Sunglasses

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
}

function fmtPrice(n: number): string {
  return `${n.toFixed(2)} BRL`
}

function isHidden(slug: string, name: string): boolean {
  const s = slug.toLowerCase()
  const n = name.toLowerCase()
  return (
    s.includes('case') || n.includes('case')
  )
}

type ProductWithCollection = Product & {
  collection: { id: string; name: string; slug: string } | null
}

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl?.startsWith('https://') || !supabaseKey) {
    return new NextResponse('<?xml version="1.0"?><rss version="2.0"><channel/></rss>', {
      headers: { 'Content-Type': 'application/xml; charset=utf-8' },
    })
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  const { data, error } = await supabase
    .from('products')
    .select('*, variants(*), images(*), collection:collections(id, name, slug)')
    .eq('status', 'active')
    .order('name', { ascending: true })

  if (error || !data) {
    return new NextResponse('<?xml version="1.0"?><rss version="2.0"><channel/></rss>', {
      status: 500,
      headers: { 'Content-Type': 'application/xml; charset=utf-8' },
    })
  }

  const products = data as ProductWithCollection[]
  const items: string[] = []

  // Preço de 1 óculos no site: o gêmeo da Oferta Progressiva (<slug>-op, R$175)
  // é o que o cliente paga levando 1, e é o preço que a página mostra. O item do
  // feed continua com o SKU JR- (os product sets dos anúncios filtram por "JR-"),
  // mas com esse preço de venda (decisão do dono em 26/10/2026; antes ia R$297).
  const precoUm = new Map<string, number>()
  for (const p of products) {
    if (p.collection?.slug !== 'oferta-progressiva' || !p.slug.endsWith('-op')) continue
    for (const v of p.variants) if (v.price > 0) precoUm.set(`${p.slug.slice(0, -3)}|${v.name}`, v.price)
  }

  for (const product of products) {
    if (isHidden(product.slug, product.name)) continue
    if (product.collection?.slug === 'oferta-progressiva') continue

    const sortedVariants = [...product.variants].sort((a, b) => a.position - b.position)
    const sortedImages = [...product.images].sort((a, b) => a.position - b.position)
    const collectionName = product.collection?.name ?? 'Óculos'

    const baseDescription = product.description
      ? stripHtml(product.description).slice(0, 4990)
      : `${product.name} — Óculos de alta performance com proteção UV400 e design esportivo premium.`

    for (const variant of sortedVariants) {
      if (!variant.sku || variant.price <= 0) continue

      // Variant-specific image first; fallback to product's first image
      const image =
        sortedImages.find((img) => img.variant_id === variant.id) ??
        sortedImages[0]

      if (!image?.url) continue

      const hasCompare =
        variant.compare_price !== null && variant.compare_price > variant.price
      const listPrice = hasCompare ? (variant.compare_price as number) : variant.price
      const um = precoUm.get(`${product.slug}|${variant.name}`)
      const salePrice = um !== undefined && um < listPrice ? um : hasCompare ? variant.price : null

      const title =
        sortedVariants.length > 1
          ? `${product.name} — ${variant.name}`
          : product.name

      // O tema novo escolhe a lente por ?l= (sem "Lente ") e, no Eye Jacket e
      // Redux (várias armações num produto), a cor por ?cor=; ?v=<id> era do site
      // antigo e caía sempre na 1ª lente.
      const [cor, lente] = variant.name.includes(' · ') ? variant.name.split(' · ') : [null, variant.name]
      const qs = new URLSearchParams()
      if (cor) qs.set('cor', cor)
      if (lente && lente !== 'Único') qs.set('l', lente.replace(/^Lente /, ''))
      const productUrl = `${SITE_URL}/produto/${product.slug}${qs.size ? `?${qs}` : ''}`

      const salePriceLine =
        salePrice !== null
          ? `\n      <g:sale_price>${fmtPrice(salePrice)}</g:sale_price>`
          : ''

      items.push(`    <item>
      <g:id>${esc(variant.sku)}</g:id>
      <g:item_group_id>${esc(product.id)}</g:item_group_id>
      <g:title><![CDATA[${title}]]></g:title>
      <g:description><![CDATA[${baseDescription}]]></g:description>
      <g:link>${esc(productUrl)}</g:link>
      <g:image_link>${esc(image.url)}</g:image_link>
      <g:brand><![CDATA[${BRAND}]]></g:brand>
      <g:condition>new</g:condition>
      <g:availability>in stock</g:availability>
      <g:price>${fmtPrice(listPrice)}</g:price>${salePriceLine}
      <g:google_product_category>${SUNGLASSES_CATEGORY}</g:google_product_category>
      <g:product_type><![CDATA[${collectionName}]]></g:product_type>
    </item>`)
    }
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title><![CDATA[Just Runner]]></title>
    <link>${esc(SITE_URL)}</link>
    <description><![CDATA[Catálogo de Óculos Just Runner — Proteção UV400, Design Esportivo]]></description>
${items.join('\n')}
  </channel>
</rss>`

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  })
}
