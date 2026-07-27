#!/usr/bin/env node
/**
 * Just Runner — Categoria "Combos".
 *
 * Cada combo é um kit fechado de 3 óculos por R$327, vendido como 1 produto.
 * O SKU usa prefixo próprio `JRC-` justamente para ficar de fora da promoção
 * "Compre 1 Leve 2" (ver PROMO_EXCLUDED_SKU_PREFIXES em src/lib/cart-store.ts) —
 * sem isso, 2 combos no carrinho dariam 1 combo grátis.
 *
 * Lê `products/COMBOS/COMBO {n}.jpg`, cria a collection + 1 produto por foto +
 * 1 variante única, sobe a foto pro Storage e cria o registro em `images`.
 * Idempotente: pula collection/produto/variante/imagem que já existirem.
 *
 * Uso:
 *   npm run combos:dry-run
 *   npm run combos:import
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join, extname, resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const DRY_RUN = process.argv.includes('--dry-run')

const SOURCE_DIR = resolve(process.cwd(), 'products', 'COMBOS')
const BUCKET = 'products'

const COLLECTION_SLUG = 'combos'
const COLLECTION_NAME = 'Combos'
const COLLECTION_DESCRIPTION =
  'Kits fechados com 3 óculos Just Runner por R$ 327. Preço de kit, já com desconto — não acumula com a promoção Compre 1 Leve 2.'

const PRICE = 327
const SKU_PREFIX = 'JRC-'
const VARIANT_NAME = 'Único'

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

const MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
}

interface Combo {
  number: number
  name: string
  slug: string
  sku: string
  file: string
  ext: string
}

/**
 * Os arquivos são "COMBO 1.jpg", "COMBO 10.jpg"... A numeração original tem
 * buracos (não existem 3, 4 e 8) e o usuário pediu para mantê-la como está,
 * então o número vem do nome do arquivo, não de um contador sequencial.
 */
function scanCombos(): Combo[] {
  if (!existsSync(SOURCE_DIR)) throw new Error(`Pasta não encontrada: ${SOURCE_DIR}`)

  const combos: Combo[] = []
  for (const file of readdirSync(SOURCE_DIR)) {
    if (file.startsWith('.')) continue
    const ext = extname(file).toLowerCase()
    if (!MIME[ext]) continue

    const match = file.slice(0, -ext.length).match(/^COMBO\s+(\d+)$/i)
    if (!match) {
      console.log(`  ⚠ ignorado (fora do padrão "COMBO {n}"): ${file}`)
      continue
    }

    const number = parseInt(match[1], 10)
    combos.push({
      number,
      name: `Combo ${number}`,
      slug: `combo-${number}`,
      sku: `${SKU_PREFIX}COMBO-${number}`,
      file,
      ext,
    })
  }

  return combos.sort((a, b) => a.number - b.number)
}

async function main(): Promise<void> {
  console.log(`\n${'═'.repeat(60)}`)
  console.log(DRY_RUN ? '[DRY RUN] Just Runner — Categoria Combos' : 'Just Runner — Categoria Combos')
  console.log('═'.repeat(60))
  console.log(`\nOrigem: ${SOURCE_DIR}\n`)

  const combos = scanCombos()
  console.log(`${combos.length} combo(s) encontrado(s):`)
  for (const c of combos) {
    console.log(`  ${c.name.padEnd(10)} slug=${c.slug.padEnd(10)} sku=${c.sku.padEnd(16)} R$ ${PRICE},00   ← ${c.file}`)
  }

  if (DRY_RUN) {
    console.log('\n[DRY RUN] Nada foi gravado.')
    console.log('Pra rodar de verdade: npm run combos:import\n')
    return
  }

  if (!SUPABASE_URL.startsWith('https://')) {
    console.error('\nERRO: NEXT_PUBLIC_SUPABASE_URL ausente ou inválida.')
    process.exit(1)
  }
  if (!SERVICE_ROLE_KEY) {
    console.error('\nERRO: SUPABASE_SERVICE_ROLE_KEY ausente.')
    process.exit(1)
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } })

  // ── 1. Collection ────────────────────────────────────────────────────────
  console.log('\n▸ Collection...')
  const { data: existingCol } = await supabase
    .from('collections')
    .select('id')
    .eq('slug', COLLECTION_SLUG)
    .maybeSingle()

  let collectionId = (existingCol as { id: string } | null)?.id

  if (!collectionId) {
    // Entra no fim da lista pra não reordenar as 10 categorias já existentes.
    const { data: last } = await supabase
      .from('collections')
      .select('position')
      .order('position', { ascending: false })
      .limit(1)
      .maybeSingle()
    const position = ((last as { position: number } | null)?.position ?? 0) + 1

    const { data, error } = await supabase
      .from('collections')
      .insert({
        slug: COLLECTION_SLUG,
        name: COLLECTION_NAME,
        description: COLLECTION_DESCRIPTION,
        image_url: null,
        position,
      })
      .select('id')
      .single()
    if (error) { console.error('ERRO collection:', error.message); process.exit(1) }
    collectionId = (data as { id: string }).id
    console.log(`  ✓ criada (position ${position})`)
  } else {
    console.log('  ⊘ já existia')
  }

  // ── 2. Produtos ──────────────────────────────────────────────────────────
  console.log('\n▸ Produtos...')
  const { data: existingProducts } = await supabase
    .from('products')
    .select('id, slug')
    .in('slug', combos.map((c) => c.slug))
  const productIdBySlug = new Map<string, string>(
    ((existingProducts ?? []) as { id: string; slug: string }[]).map((p) => [p.slug, p.id])
  )

  for (const combo of combos) {
    if (productIdBySlug.has(combo.slug)) { console.log(`  ⊘ ${combo.name} já existia`); continue }
    const { data, error } = await supabase
      .from('products')
      .insert({
        slug: combo.slug,
        name: combo.name,
        description: `Kit com 3 óculos Just Runner por R$ ${PRICE},00.`,
        collection_id: collectionId,
        status: 'active',
        featured: false,
      })
      .select('id')
      .single()
    if (error) { console.error(`ERRO produto ${combo.name}:`, error.message); continue }
    productIdBySlug.set(combo.slug, (data as { id: string }).id)
    console.log(`  ✓ ${combo.name}`)
  }

  // ── 3. Variantes ─────────────────────────────────────────────────────────
  console.log('\n▸ Variantes...')
  const { data: existingVariants } = await supabase
    .from('variants')
    .select('id, sku')
    .in('sku', combos.map((c) => c.sku))
  const variantIdBySku = new Map<string, string>(
    ((existingVariants ?? []) as { id: string; sku: string }[]).map((v) => [v.sku, v.id])
  )

  for (const combo of combos) {
    const productId = productIdBySlug.get(combo.slug)
    if (!productId) continue
    if (variantIdBySku.has(combo.sku)) { console.log(`  ⊘ ${combo.sku} já existia`); continue }
    const { data, error } = await supabase
      .from('variants')
      .insert({
        product_id: productId,
        name: VARIANT_NAME,
        price: PRICE,
        compare_price: null,
        sku: combo.sku,
        stock: 0,
        yampi_product_id: null,
        position: 1,
      })
      .select('id')
      .single()
    if (error) { console.error(`ERRO variante ${combo.sku}:`, error.message); continue }
    variantIdBySku.set(combo.sku, (data as { id: string }).id)
    console.log(`  ✓ ${combo.sku}  R$ ${PRICE},00`)
  }

  // ── 4. Fotos ─────────────────────────────────────────────────────────────
  console.log('\n▸ Fotos...')
  const { data: existingImages } = await supabase.from('images').select('url')
  const existingUrls = new Set<string>(((existingImages ?? []) as { url: string }[]).map((i) => i.url))

  for (const combo of combos) {
    const productId = productIdBySlug.get(combo.slug)
    const variantId = variantIdBySku.get(combo.sku) ?? null
    if (!productId) continue

    const storagePath = `${COLLECTION_SLUG}/${combo.slug}/unico/1${combo.ext}`
    const buffer = readFileSync(join(SOURCE_DIR, combo.file))
    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, buffer, { contentType: MIME[combo.ext], upsert: true })
    if (upErr) { console.error(`  ✗ upload ${storagePath}: ${upErr.message}`); continue }

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath)
    const publicUrl = urlData.publicUrl

    if (existingUrls.has(publicUrl)) { console.log(`  ⊘ ${combo.name} (foto já registrada)`); continue }

    const { error: imgErr } = await supabase.from('images').insert({
      product_id: productId,
      variant_id: variantId,
      url: publicUrl,
      alt: `${combo.name} — kit com 3 óculos Just Runner`,
      position: 1,
    })
    if (imgErr) { console.error(`  ✗ registro ${combo.name}: ${imgErr.message}`); continue }
    console.log(`  ✓ ${combo.name}`)
  }

  console.log(`\n${'─'.repeat(60)}`)
  console.log('✓ Combos no ar no Supabase.')
  console.log('  Próximo passo: sincronizar na Yampi (scripts/sync-yampi-combos.ts)')
  console.log('─'.repeat(60) + '\n')
}

main().catch((err: Error) => {
  console.error('\nFATAL:', err.message)
  process.exit(1)
})
