// One-off batch sync: creates 1 Yampi "simple" product + 1 SKU + images per
// Supabase variant, following the [SO]-style convention from src/lib/yampi/catalog.ts
// but with a "[JR]" prefix for Just Runner. Writes the resulting Yampi SKU id back
// into variants.yampi_product_id (that field is actually a SKU id — see catalog.ts).
// Safe to re-run: skips variants that already have yampi_product_id set.
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = Object.fromEntries(
  fs.readFileSync('.env.local', 'utf8')
    .split(/\r?\n/)
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=')
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()]
    }),
)

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const headers = {
  'User-Token': env.YAMPI_API_TOKEN,
  'User-Secret-Key': env.YAMPI_SECRET_KEY,
  'Content-Type': 'application/json',
}
const base = `https://api.dooki.com.br/v2/${env.NEXT_PUBLIC_YAMPI_ALIAS}`
const BRAND_ID = 45798793
const JRO_CATEGORY_ID = 8375893

// slug -> Yampi category id (existing categories reused, Straight Jacket/JRO created earlier)
const CATEGORY_MAP: Record<string, number> = {
  casual: 8315402,
  encoder: 7784468,
  'eye-jacket': 7784461,
  flak: 7784467,
  'half-jacket': 7784471,
  hstn: 7784464,
  minute: 7784470,
  plantaris: 7784466,
  radar: 7784465,
  'straight-jacket': 8375892,
}

async function main() {
  const { data: collections } = await supabase.from('collections').select('id,slug')
  const collectionSlugById = new Map(collections!.map((c) => [c.id, c.slug]))

  const { data: products } = await supabase
    .from('products')
    .select('id,name,collection_id,variants(*),images(*)')
    .eq('status', 'active')

  let created = 0
  let skipped = 0
  let failed = 0

  for (const product of products!) {
    const collectionSlug = collectionSlugById.get(product.collection_id)
    const categoryId = collectionSlug ? CATEGORY_MAP[collectionSlug] : undefined
    const categoriesIds = [categoryId, JRO_CATEGORY_ID].filter(Boolean) as number[]

    for (const variant of product.variants as any[]) {
      if (variant.yampi_product_id) {
        skipped++
        continue
      }

      const name = `[JR] ${product.name}   ${variant.name}`
      const images = (product.images as any[])
        .filter((i) => i.variant_id === variant.id && i.url)
        .sort((a, b) => a.position - b.position)

      try {
        const prodRes = await fetch(`${base}/catalog/products`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            simple: true,
            brand_id: BRAND_ID,
            active: true,
            name,
            searchable: true,
            categories_ids: categoriesIds,
          }),
        })
        if (!prodRes.ok) throw new Error(`product create ${prodRes.status}: ${await prodRes.text()}`)
        const prod = (await prodRes.json()).data

        const skuRes = await fetch(`${base}/catalog/skus`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            product_id: prod.id,
            sku: variant.sku,
            price_cost: variant.price,
            price_sale: variant.price,
            weight: 0.25,
            height: 6,
            width: 8,
            length: 17,
            quantity_managed: false,
            availability: 999,
            availability_soldout: 0,
            blocked_sale: false,
            variations_values_ids: [],
          }),
        })
        if (!skuRes.ok) throw new Error(`sku create ${skuRes.status}: ${await skuRes.text()}`)
        const sku = (await skuRes.json()).data

        if (images.length > 0) {
          const imgRes = await fetch(`${base}/catalog/skus/${sku.id}/images`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              upload_option: 'resize',
              images: images.map((i) => ({ url: i.url })),
            }),
          })
          if (!imgRes.ok) console.error(`  images failed for ${variant.sku}: ${imgRes.status} ${await imgRes.text()}`)
        }

        await supabase.from('variants').update({ yampi_product_id: String(sku.id) }).eq('id', variant.id)
        created++
        console.log(`OK  ${variant.sku} -> product ${prod.id} / sku ${sku.id}`)
      } catch (err) {
        failed++
        console.error(`FAIL ${variant.sku}:`, err instanceof Error ? err.message : err)
      }
    }
  }

  console.log(`\nDone. created=${created} skipped=${skipped} failed=${failed}`)
}

main()
