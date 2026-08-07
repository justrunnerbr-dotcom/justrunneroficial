// Adiciona 2 variações novas (lente preta) ao catálogo principal e aos gêmeos
// da Oferta Progressiva, seguindo a convenção já existente:
//   - foto  -> Storage bucket "products" em {categoria}/{produto}/{variante}/0.png
//   - main  -> price 297 / compare 348 / SKU JR-{PRODUTO}-{VARIANTE}
//   - OP    -> price 175 / compare null / SKU JROP-{PRODUTO}-{VARIANTE}, mesma URL de foto
// O yampi_product_id fica null de propósito: quem cria o SKU na Yampi depois são
// os scripts sync-yampi-catalog.ts e sync-yampi-oferta-progressiva.ts, que pulam
// variantes já sincronizadas.
//
// Uso: node scripts/add-variantes-lente-preta.mjs [--dry-run]
import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'

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

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

const BUCKET = 'products'

const ADICOES = [
  {
    categoria: 'eye-jacket',
    produtoSlug: 'eye-jacket-redux',
    opSlug: 'eye-jacket-redux-op',
    variante: 'Preta · Lente Preta',
    varianteSlug: 'preta-lente-preta',
    skuProduto: 'EYE_JACKET_REDUX',
    skuVariante: 'PRETA_LENTE_PRETA',
    arquivo: 'products/EYE JACKET/Eye Jacket Redux Preta_.png',
  },
  {
    categoria: 'minute',
    produtoSlug: 'minute-preta',
    opSlug: 'minute-preta-op',
    variante: 'Lente Preta',
    varianteSlug: 'lente-preta',
    skuProduto: 'MINUTE_PRETA',
    skuVariante: 'LENTE_PRETA',
    arquivo: 'products/MINUTE/Minute preta lentes preta.png',
  },
]

async function getProduto(slug) {
  const { data, error } = await supabase
    .from('products')
    .select('id,name,slug')
    .eq('slug', slug)
    .single()
  if (error) throw new Error(`produto "${slug}": ${error.message}`)
  return data
}

async function proximaPosition(productId) {
  const { data, error } = await supabase
    .from('variants')
    .select('position')
    .eq('product_id', productId)
    .order('position', { ascending: false })
    .limit(1)
  if (error) throw new Error(`position: ${error.message}`)
  return (data?.[0]?.position ?? 0) + 1
}

async function upsertVariante({ productId, nome, sku, price, comparePrice, position }) {
  const { data: existente, error: findErr } = await supabase
    .from('variants')
    .select('id')
    .eq('product_id', productId)
    .eq('name', nome)
    .maybeSingle()
  if (findErr) throw new Error(`busca variante: ${findErr.message}`)
  if (existente) {
    console.log(`    · variante já existia (id ${existente.id}) — pulando insert`)
    return existente.id
  }

  if (DRY_RUN) {
    console.log(`    + [dry-run] variante "${nome}" sku=${sku} price=${price} pos=${position}`)
    return null
  }

  const { data, error } = await supabase
    .from('variants')
    .insert({
      product_id: productId,
      name: nome,
      sku,
      price,
      compare_price: comparePrice,
      stock: 0,
      yampi_product_id: null,
      position,
    })
    .select('id')
    .single()
  if (error) throw new Error(`insert variante "${nome}": ${error.message}`)
  console.log(`    + variante "${nome}" criada (id ${data.id}) sku=${sku} R$${price}`)
  return data.id
}

async function upsertImagem({ productId, variantId, url, alt }) {
  if (!variantId) return
  const { data: existente, error: findErr } = await supabase
    .from('images')
    .select('id')
    .eq('variant_id', variantId)
    .eq('url', url)
    .maybeSingle()
  if (findErr) throw new Error(`busca imagem: ${findErr.message}`)
  if (existente) {
    console.log(`    · registro de imagem já existia (id ${existente.id})`)
    return
  }
  if (DRY_RUN) {
    console.log(`    + [dry-run] registro de imagem -> ${url}`)
    return
  }
  const { error } = await supabase
    .from('images')
    .insert({ product_id: productId, variant_id: variantId, url, alt, position: 0 })
  if (error) throw new Error(`insert imagem: ${error.message}`)
  console.log(`    + registro de imagem criado`)
}

async function main() {
  console.log(`\n${'='.repeat(64)}`)
  console.log(DRY_RUN ? '[DRY RUN] Novas variações — lente preta' : 'Novas variações — lente preta')
  console.log('='.repeat(64))

  for (const a of ADICOES) {
    console.log(`\n▸ ${a.produtoSlug} → "${a.variante}"`)

    if (!fs.existsSync(a.arquivo)) throw new Error(`arquivo não encontrado: ${a.arquivo}`)

    const principal = await getProduto(a.produtoSlug)
    const op = await getProduto(a.opSlug)

    // 1. Foto no Storage
    const storagePath = `${a.categoria}/${a.produtoSlug}/${a.varianteSlug}/0.png`
    if (DRY_RUN) {
      console.log(`    + [dry-run] upload -> ${BUCKET}/${storagePath}`)
    } else {
      const buffer = fs.readFileSync(a.arquivo)
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(storagePath, buffer, { contentType: 'image/png', upsert: true })
      if (upErr) throw new Error(`upload ${storagePath}: ${upErr.message}`)
      console.log(`    + foto enviada -> ${BUCKET}/${storagePath}`)
    }
    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath)
    const url = urlData.publicUrl

    // 2. Catálogo principal (R$297)
    console.log('  catálogo principal:')
    const posMain = await proximaPosition(principal.id)
    const variantIdMain = await upsertVariante({
      productId: principal.id,
      nome: a.variante,
      sku: `JR-${a.skuProduto}-${a.skuVariante}`,
      price: 297,
      comparePrice: 348,
      position: posMain,
    })
    await upsertImagem({
      productId: principal.id,
      variantId: variantIdMain,
      url,
      alt: `${principal.name} — ${a.variante}`,
    })

    // 3. Gêmeo da Oferta Progressiva (R$175, mesma foto)
    console.log('  oferta progressiva:')
    const posOp = await proximaPosition(op.id)
    const variantIdOp = await upsertVariante({
      productId: op.id,
      nome: a.variante,
      sku: `JROP-${a.skuProduto}-${a.skuVariante}`,
      price: 175,
      comparePrice: null,
      position: posOp,
    })
    await upsertImagem({
      productId: op.id,
      variantId: variantIdOp,
      url,
      alt: `${op.name} — ${a.variante}`,
    })
  }

  console.log(`\n${'-'.repeat(64)}`)
  if (DRY_RUN) {
    console.log('[DRY RUN] Nada foi gravado.')
  } else {
    console.log('✓ Supabase pronto. Próximo passo — criar os SKUs na Yampi:')
    console.log('  node --experimental-strip-types --env-file-if-exists=.env.local scripts/sync-yampi-catalog.ts')
    console.log('  node --experimental-strip-types --env-file-if-exists=.env.local scripts/sync-yampi-oferta-progressiva.ts')
  }
  console.log('-'.repeat(64) + '\n')
}

main().catch((err) => {
  console.error('\nFATAL:', err.message)
  process.exit(1)
})
