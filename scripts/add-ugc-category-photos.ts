#!/usr/bin/env node
/**
 * Just Runner — Add UGC "on-face" category photos as the 2nd photo of every
 * variant in that category (or a single product, for overrides).
 *
 * Reads from `public/FOTOS UGC CATEGORIA/`, uploads each file once to
 * Supabase Storage (bucket "products", path `ugc/{key}.{ext}`), then for
 * every affected variant: shifts existing images at position >= 1 up by one
 * and inserts the UGC photo at position 1 (variant_id set — required for it
 * to show up in the product page's per-variant gallery flow).
 *
 * Usage:
 *   npm run ugc:dry-run
 *   npm run ugc:import
 */

import { readFileSync, existsSync } from 'node:fs'
import { extname, resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const DRY_RUN = process.argv.includes('--dry-run')

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
const BUCKET = 'products'
const SRC_DIR = resolve(process.cwd(), 'public', 'FOTOS UGC CATEGORIA')

const MIME: Record<string, string> = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' }

// key -> { file, categorySlug, productSlug? } — productSlug set = only that product; unset = whole category
const ENTRIES: { key: string; file: string; categorySlug: string; productSlug?: string; alt: string }[] = [
  { key: 'encoder', file: 'Encoder.png', categorySlug: 'encoder', alt: 'Encoder no rosto' },
  { key: 'eye-jacket', file: 'Eye Jacket_.png', categorySlug: 'eye-jacket', alt: 'Eye Jacket no rosto' },
  { key: 'eye-jacket-flame', file: 'Eye Jacket Flame.jpg', categorySlug: 'eye-jacket', productSlug: 'eye-jacket-flame', alt: 'Eye Jacket Flame no rosto' },
  { key: 'flak', file: 'Flak.jpg', categorySlug: 'flak', alt: 'Flak no rosto' },
  { key: 'half-jacket', file: 'Half Jacket.jpg', categorySlug: 'half-jacket', alt: 'Half Jacket no rosto' },
  { key: 'hstn', file: 'HSTN.png', categorySlug: 'hstn', alt: 'HSTN no rosto' },
  { key: 'minute', file: 'Minute.jpg', categorySlug: 'minute', alt: 'Minute no rosto' },
  { key: 'plantaris', file: 'Plantaris Preta.jpg', categorySlug: 'plantaris', alt: 'Plantaris no rosto' },
  { key: 'radar', file: 'Radar EV.jpg', categorySlug: 'radar', alt: 'Radar EV no rosto' },
  { key: 'straight-jacket', file: 'Straight Jacket.png', categorySlug: 'straight-jacket', alt: 'Straight Jacket no rosto' },
]

async function main() {
  console.log(`\n${'═'.repeat(60)}`)
  console.log(DRY_RUN ? '[DRY RUN] Add UGC Category Photos' : 'Add UGC Category Photos')
  console.log('═'.repeat(60))

  for (const e of ENTRIES) {
    const full = resolve(SRC_DIR, e.file)
    if (!existsSync(full)) console.log(`  ⚠ arquivo não encontrado: ${e.file}`)
  }

  if (DRY_RUN) {
    if (!SUPABASE_URL.startsWith('https://')) {
      console.log('\n[DRY RUN] Sem Supabase configurado — só validando arquivos.')
      console.log('Arquivos encontrados:', ENTRIES.filter(e => existsSync(resolve(SRC_DIR, e.file))).length, '/', ENTRIES.length)
      return
    }
  }

  if (!SUPABASE_URL.startsWith('https://') || !SERVICE_ROLE_KEY) {
    console.error('ERRO: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY ausente.')
    process.exit(1)
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } })

  for (const e of ENTRIES) {
    const full = resolve(SRC_DIR, e.file)
    if (!existsSync(full)) continue

    const ext = extname(e.file).toLowerCase()
    const storagePath = `ugc/${e.key}${ext}`
    let publicUrl: string

    if (DRY_RUN) {
      publicUrl = `[dry-run]/${storagePath}`
      console.log(`\n▸ ${e.key}: uploadaria ${e.file} -> ${storagePath}`)
    } else {
      const buffer = readFileSync(full)
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(storagePath, buffer, {
        contentType: MIME[ext] ?? 'image/jpeg', upsert: true,
      })
      if (upErr) { console.error(`ERRO upload ${e.file}:`, upErr.message); continue }
      publicUrl = supabase.storage.from(BUCKET).getPublicUrl(storagePath).data.publicUrl
      console.log(`\n▸ ${e.key}: enviado -> ${storagePath}`)
    }

    // Find target products
    const productQuery = supabase.from('products').select('id, slug, collection:collections!inner(slug)')
    const { data: products, error: prodErr } = e.productSlug
      ? await productQuery.eq('slug', e.productSlug)
      : await productQuery.eq('collections.slug', e.categorySlug)
    if (prodErr) { console.error('ERRO buscando produtos:', prodErr.message); continue }

    // If this is the category-wide entry, exclude products that have their own override entry
    const overrideSlugs = new Set(ENTRIES.filter(x => x.productSlug && x.categorySlug === e.categorySlug).map(x => x.productSlug))
    const targetProducts = (products ?? []).filter((p: { slug: string }) => e.productSlug || !overrideSlugs.has(p.slug))

    console.log(`  Produtos afetados: ${targetProducts.length}`)

    let variantsUpdated = 0
    for (const product of targetProducts as { id: string; slug: string }[]) {
      const { data: variants } = await supabase.from('variants').select('id, name').eq('product_id', product.id)
      const { data: images } = await supabase.from('images').select('id, variant_id, position').eq('product_id', product.id)

      for (const variant of (variants ?? []) as { id: string; name: string }[]) {
        const variantImages = (images ?? []).filter((i: { variant_id: string | null }) => i.variant_id === variant.id)

        if (DRY_RUN) {
          console.log(`    - ${product.slug} / ${variant.name}: shift +1 (${variantImages.filter((i: {position: number}) => i.position >= 1).length} fotos) + inserir na posição 1`)
          variantsUpdated++
          continue
        }

        const toShift = variantImages
          .filter((i: { position: number }) => i.position >= 1)
          .sort((a: { position: number }, b: { position: number }) => b.position - a.position) // desc, avoid collisions

        for (const img of toShift as { id: string; position: number }[]) {
          const { error } = await supabase.from('images').update({ position: img.position + 1 }).eq('id', img.id)
          if (error) console.error(`ERRO shift ${img.id}:`, error.message)
        }

        const { error: insErr } = await supabase.from('images').insert({
          product_id: product.id,
          variant_id: variant.id,
          url: publicUrl,
          alt: e.alt,
          position: 1,
        })
        if (insErr) console.error(`ERRO insert ${product.slug}/${variant.name}:`, insErr.message)
        else variantsUpdated++
      }
    }
    console.log(`  Variações atualizadas: ${variantsUpdated}`)
  }

  console.log(`\n${'─'.repeat(60)}`)
  console.log(DRY_RUN ? '[DRY RUN] Nada foi gravado.' : '✓ Concluído!')
  console.log('─'.repeat(60) + '\n')
}

main().catch((err: Error) => { console.error('\nFATAL:', err.message); process.exit(1) })
