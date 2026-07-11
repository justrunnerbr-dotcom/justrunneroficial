// Duplica o catálogo inteiro (produtos + variantes + fotos) pra dentro da
// coleção "oferta-progressiva", com SKU prefixado JROP- e preço fixo R$175.
// São produtos NOVOS e independentes (não afetam o Compre 1 Leve 2) — a
// promoção "1 óculos R$175 / 2 óculos R$297" é calculada no carrinho a partir
// do prefixo JROP- (ver src/lib/cart-store.ts).
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
const OP_PRICE = 175

async function main() {
  const { data: opCollection } = await supabase.from('collections').select('id').eq('slug', 'oferta-progressiva').single()
  if (!opCollection) throw new Error('Coleção oferta-progressiva não existe — rode a criação da coleção primeiro.')

  const { data: products } = await supabase
    .from('products')
    .select('id,slug,name,description,featured,variants(*),images(*)')
    .eq('status', 'active')
    .neq('collection_id', opCollection.id)

  let createdProducts = 0
  let createdVariants = 0
  let createdImages = 0

  for (const product of products as any[]) {
    const newSlug = `${product.slug}-op`

    const { data: existing } = await supabase.from('products').select('id').eq('slug', newSlug).maybeSingle()
    if (existing) continue

    const { data: newProduct, error: prodErr } = await supabase.from('products').insert({
      slug: newSlug,
      name: product.name,
      description: product.description,
      collection_id: opCollection.id,
      status: 'active',
      featured: false,
    }).select('id').single()
    if (prodErr || !newProduct) { console.error('FAIL product', product.slug, prodErr?.message); continue }
    createdProducts++

    const variantIdMap = new Map<string, string>()

    for (const variant of product.variants as any[]) {
      const newSku = 'JROP-' + variant.sku.replace(/^JR-/, '')
      const { data: newVariant, error: varErr } = await supabase.from('variants').insert({
        product_id: newProduct.id,
        name: variant.name,
        price: OP_PRICE,
        compare_price: null,
        sku: newSku,
        stock: variant.stock,
        position: variant.position,
      }).select('id').single()
      if (varErr || !newVariant) { console.error('FAIL variant', variant.sku, varErr?.message); continue }
      variantIdMap.set(variant.id, newVariant.id)
      createdVariants++
    }

    const imageRows = (product.images as any[])
      .filter((img) => img.url && variantIdMap.has(img.variant_id))
      .map((img) => ({
        product_id: newProduct.id,
        variant_id: variantIdMap.get(img.variant_id),
        url: img.url,
        alt: img.alt,
        position: img.position,
      }))

    if (imageRows.length > 0) {
      const { error: imgErr } = await supabase.from('images').insert(imageRows)
      if (imgErr) console.error('FAIL images for', product.slug, imgErr.message)
      else createdImages += imageRows.length
    }

    console.log(`OK ${product.slug} -> ${newSlug} (${variantIdMap.size} variantes, ${imageRows.length} fotos)`)
  }

  console.log(`\nDone. products=${createdProducts} variants=${createdVariants} images=${createdImages}`)
}

main()
