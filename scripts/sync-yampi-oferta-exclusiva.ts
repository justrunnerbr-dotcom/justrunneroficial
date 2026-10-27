// Cópia de scripts/sync-yampi-oferta-progressiva.ts pra coleção "oferta-exclusiva"
// (SKUs JROE-, R$147,90, 26/10/2026): 1 produto Yampi "simple" + 1 SKU + fotos por
// variação, só na categoria "Oferta Exclusiva" (criada aqui se não existir).
// Idempotente: variação que já tem yampi_product_id é pulada.
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

async function categoriaOE(): Promise<number> {
  const lista = await (await fetch(`${base}/catalog/categories?limit=100&q=oferta`, { headers })).json()
  const achou = (lista.data ?? []).find((c: any) => c.slug === 'oferta-exclusiva')
  if (achou) return achou.id
  const res = await fetch(`${base}/catalog/categories`, { method: 'POST', headers, body: JSON.stringify({ name: 'Oferta Exclusiva', active: true }) })
  if (!res.ok) throw new Error(`categoria ${res.status}: ${await res.text()}`)
  const c = (await res.json()).data
  console.log('categoria Yampi criada', c.id, c.slug)
  return c.id
}

async function main() {
  const OE_CATEGORY_ID = await categoriaOE()
  const { data: opCollection } = await supabase.from('collections').select('id').eq('slug', 'oferta-exclusiva').single()

  const { data: products } = await supabase
    .from('products')
    .select('id,name,variants(*),images(*)')
    .eq('collection_id', opCollection!.id)
    .eq('status', 'active')

  let created = 0
  let skipped = 0
  let failed = 0

  for (const product of products!) {
    for (const variant of product.variants as any[]) {
      if (variant.yampi_product_id) {
        skipped++
        continue
      }

      const name = `[JR OE] ${product.name}   ${variant.name}`
      const images = (product.images as any[])
        .filter((i) => i.variant_id === variant.id && i.url)
        .sort((a, b) => a.position - b.position)
      const shortSku = String(variant.sku).slice(0, 40)

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
            categories_ids: [OE_CATEGORY_ID],
          }),
        })
        if (!prodRes.ok) throw new Error(`product create ${prodRes.status}: ${await prodRes.text()}`)
        const prod = (await prodRes.json()).data

        const skuRes = await fetch(`${base}/catalog/skus`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            product_id: prod.id,
            sku: shortSku,
            price_cost: variant.price,
            price_sale: variant.price,
            weight: 0.25,
            height: 6,
            width: 8,
            length: 17,
            quantity_managed: false,
            // `availability` é "Prazo para postagem" EM DIAS, não estoque —
            // estava 999 e o checkout somava 999 dias ao prazo dos Correios.
            // Ver scripts/fix-yampi-prazo-postagem.ts.
            availability: 1,
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
