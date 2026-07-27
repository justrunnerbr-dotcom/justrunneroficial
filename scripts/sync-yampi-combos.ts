// Sincroniza a categoria Combos (produtos JRC-) na Yampi: 1 produto "simple" +
// 1 SKU + fotos por variante, categorizado SÓ em "Combos".
//
// IMPORTANTE — por que a categoria é exclusiva: as 3 regras de desconto ativas
// da loja (1897 "2X1", 27184 "COMPRE 1 LEVE 2 - Runner", 27186 "Oferta
// Progressiva") são escopadas por `restrictions.include.categories_ids`:
//   1897  -> 7784461..7784471 + 8180539  (categorias por modelo)
//   27184 -> 8375893                     (JUST RUNNER OFICIAL)
//   27186 -> 8375993                     (Oferta Progressiva)
// Combo é kit fechado a R$327 e não pode acumular com nenhuma delas — se entrar
// em qualquer uma dessas categorias, o checkout real dá um combo de graça mesmo
// com o site bloqueando (ver isFreeGlassesEligible em src/lib/cart-store.ts).
// NÃO adicione JUST RUNNER OFICIAL aqui, ao contrário do sync-yampi-catalog.ts.
//
// Seguro re-rodar: pula variantes que já têm yampi_product_id.
//
// Uso: node --experimental-strip-types --env-file-if-exists=.env.local scripts/sync-yampi-combos.ts [--dry-run]
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const DRY_RUN = process.argv.includes('--dry-run')

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
const CATEGORY_NAME = 'Combos'

// Kit com 3 óculos: peso e caixa ~3x a unidade (0.25kg, 6x8x17 no catálogo normal).
const SHIPPING = { weight: 0.75, height: 18, width: 8, length: 17 }

async function findOrCreateCategory(): Promise<number> {
  const listRes = await fetch(`${base}/catalog/categories?limit=100`, { headers })
  if (!listRes.ok) throw new Error(`categories list ${listRes.status}: ${await listRes.text()}`)
  const existing = (await listRes.json()).data as Array<{ id: number; name: string }>
  const found = existing.find((c) => c.name.trim().toLowerCase() === CATEGORY_NAME.toLowerCase())
  if (found) {
    console.log(`Categoria "${CATEGORY_NAME}" já existe: id ${found.id}`)
    return found.id
  }

  if (DRY_RUN) {
    console.log(`[DRY RUN] criaria a categoria "${CATEGORY_NAME}"`)
    return -1
  }

  const res = await fetch(`${base}/catalog/categories`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ name: CATEGORY_NAME, active: true, searchable: true }),
  })
  if (!res.ok) throw new Error(`category create ${res.status}: ${await res.text()}`)
  const id = (await res.json()).data.id as number
  console.log(`Categoria "${CATEGORY_NAME}" criada: id ${id}`)
  return id
}

async function main() {
  const { data: collection } = await supabase
    .from('collections')
    .select('id')
    .eq('slug', 'combos')
    .single()
  if (!collection) throw new Error('collection "combos" não existe no Supabase — rode npm run combos:import antes')

  const { data: products } = await supabase
    .from('products')
    .select('id,name,variants(*),images(*)')
    .eq('collection_id', collection.id)
    .eq('status', 'active')

  const categoryId = await findOrCreateCategory()

  let created = 0
  let skipped = 0
  let failed = 0

  for (const product of products!) {
    for (const variant of product.variants as any[]) {
      if (variant.yampi_product_id) {
        console.log(`SKIP ${variant.sku} (já sincronizado: sku ${variant.yampi_product_id})`)
        skipped++
        continue
      }

      const name = `[JR COMBO] ${product.name}`
      const images = (product.images as any[])
        .filter((i) => i.url)
        .sort((a, b) => a.position - b.position)

      if (DRY_RUN) {
        console.log(`[DRY RUN] criaria "${name}"  sku=${variant.sku}  R$${variant.price}  categoria=[${categoryId}]  ${images.length} foto(s)`)
        continue
      }

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
            categories_ids: [categoryId],
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
            ...SHIPPING,
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
  if (!DRY_RUN && created > 0) {
    console.log(`\nCategoria Combos na Yampi: ${categoryId}`)
    console.log('Confira que ela NÃO foi adicionada em nenhuma regra de desconto.')
  }
}

main()
