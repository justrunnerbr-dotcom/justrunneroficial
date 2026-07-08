#!/usr/bin/env node
/**
 * Just Runner — Fix: keep the UGC "on-face" category photo on only the
 * FIRST variant of the FIRST product per category (undo the earlier
 * all-variants rollout from add-ugc-category-photos.ts).
 *
 * For every other variant that received the UGC photo: delete that image
 * row and shift the images that were pushed to position >= 2 back down by 1
 * (restoring the original order).
 *
 * Usage:
 *   npm run ugc-fix:dry-run
 *   npm run ugc-fix:import
 */

import { createClient } from '@supabase/supabase-js'

const DRY_RUN = process.argv.includes('--dry-run')
const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

// Same category -> UGC storage key mapping as add-ugc-category-photos.ts
const CATEGORY_ENTRIES: { categorySlug: string; ugcKey: string; productSlugOverride?: string }[] = [
  { categorySlug: 'encoder', ugcKey: 'encoder' },
  { categorySlug: 'eye-jacket', ugcKey: 'eye-jacket' },
  { categorySlug: 'eye-jacket', ugcKey: 'eye-jacket-flame', productSlugOverride: 'eye-jacket-flame' },
  { categorySlug: 'flak', ugcKey: 'flak' },
  { categorySlug: 'half-jacket', ugcKey: 'half-jacket' },
  { categorySlug: 'hstn', ugcKey: 'hstn' },
  { categorySlug: 'minute', ugcKey: 'minute' },
  { categorySlug: 'plantaris', ugcKey: 'plantaris' },
  { categorySlug: 'radar', ugcKey: 'radar' },
  { categorySlug: 'straight-jacket', ugcKey: 'straight-jacket' },
]

async function main() {
  console.log(`\n${'═'.repeat(60)}`)
  console.log(DRY_RUN ? '[DRY RUN] Fix UGC — single photo per category' : 'Fix UGC — single photo per category')
  console.log('═'.repeat(60))

  if (!SUPABASE_URL.startsWith('https://') || !SERVICE_ROLE_KEY) {
    console.error('ERRO: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY ausente.')
    process.exit(1)
  }
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } })

  let totalRemoved = 0
  let totalKept = 0

  for (const entry of CATEGORY_ENTRIES) {
    console.log(`\n▸ ${entry.ugcKey}`)

    const productQuery = supabase.from('products').select('id, slug, collection:collections!inner(slug)').order('slug', { ascending: true })
    const { data: products, error: prodErr } = entry.productSlugOverride
      ? await productQuery.eq('slug', entry.productSlugOverride)
      : await productQuery.eq('collections.slug', entry.categorySlug)
    if (prodErr) { console.error('  ERRO produtos:', prodErr.message); continue }

    // Exclude products that belong to a more specific override entry (same rule as the original script)
    const overrideSlugs = new Set(
      CATEGORY_ENTRIES.filter((e) => e.productSlugOverride && e.categorySlug === entry.categorySlug).map((e) => e.productSlugOverride),
    )
    const targetProducts = ((products ?? []) as { id: string; slug: string }[])
      .filter((p) => entry.productSlugOverride || !overrideSlugs.has(p.slug))

    if (targetProducts.length === 0) { console.log('  (nenhum produto)'); continue }

    const firstProduct = targetProducts[0]
    const { data: firstVariants } = await supabase
      .from('variants').select('id, name, position').eq('product_id', firstProduct.id).order('position', { ascending: true })
    const keepVariantId = (firstVariants ?? [])[0]?.id ?? null

    console.log(`  Mantém em: ${firstProduct.slug} / ${(firstVariants ?? [])[0]?.name ?? '?'}`)
    totalKept++

    for (const product of targetProducts) {
      const { data: variants } = await supabase.from('variants').select('id, name').eq('product_id', product.id)
      for (const variant of (variants ?? []) as { id: string; name: string }[]) {
        if (variant.id === keepVariantId) continue

        const { data: images } = await supabase
          .from('images').select('id, url, position').eq('product_id', product.id).eq('variant_id', variant.id)
        const ugcImg = (images ?? []).find((i: { url: string }) => i.url.includes(`/ugc/${entry.ugcKey}.`))
        if (!ugcImg) continue

        const toShiftDown = (images ?? [])
          .filter((i: { position: number }) => i.position > (ugcImg as { position: number }).position)
          .sort((a: { position: number }, b: { position: number }) => a.position - b.position) // asc, avoid collisions

        if (DRY_RUN) {
          console.log(`    - remove de ${product.slug} / ${variant.name} (shift -1 em ${toShiftDown.length} foto(s))`)
          totalRemoved++
          continue
        }

        const { error: delErr } = await supabase.from('images').delete().eq('id', (ugcImg as { id: string }).id)
        if (delErr) { console.error(`    ERRO delete ${product.slug}/${variant.name}:`, delErr.message); continue }

        for (const img of toShiftDown as { id: string; position: number }[]) {
          const { error } = await supabase.from('images').update({ position: img.position - 1 }).eq('id', img.id)
          if (error) console.error(`    ERRO shift ${img.id}:`, error.message)
        }
        totalRemoved++
      }
    }
  }

  console.log(`\n${'─'.repeat(60)}`)
  console.log(`Categorias mantidas com 1 foto : ${totalKept}`)
  console.log(`Variações corrigidas (removida): ${totalRemoved}`)
  console.log(DRY_RUN ? '[DRY RUN] Nada foi gravado.' : '✓ Concluído!')
  console.log('─'.repeat(60) + '\n')
}

main().catch((err: Error) => { console.error('\nFATAL:', err.message); process.exit(1) })
