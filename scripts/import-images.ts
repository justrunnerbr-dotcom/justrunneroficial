#!/usr/bin/env node
/**
 * Just Runner Image Records Importer
 * Creates image records in the `images` table pointing to Supabase Storage paths.
 * Does NOT upload files — upload images separately to the Storage bucket "products".
 *
 * Usage: npm run images:dry-run   (preview only)
 *        npm run images:import    (write to Supabase)
 *
 * Expected Storage layout (bucket: products):
 *   products/{categorySlug}/{productSlug}/cover.jpg
 *   products/{categorySlug}/{productSlug}/01.jpg
 *   products/{categorySlug}/{productSlug}/02.jpg
 *   products/{categorySlug}/{productSlug}/03.jpg
 *
 * Requires in environment:
 *   NEXT_PUBLIC_SUPABASE_URL  (or SUPABASE_URL)
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createClient } from '@supabase/supabase-js'

// ── Config ────────────────────────────────────────────────────────────────────

const DRY_RUN = process.argv.includes('--dry-run')

const SUPABASE_URL =
  process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

const STORAGE_BUCKET = 'products'
const IMAGE_FILENAMES = ['cover.jpg', '01.jpg', '02.jpg', '03.jpg']

// ── Types ─────────────────────────────────────────────────────────────────────

interface CatalogRow {
  category: string
  product: string
  slug: string
}

interface ImageRecord {
  product_id: string
  variant_id: null
  url: string
  alt: string
  position: number
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function toCategorySlug(category: string): string {
  return category
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

function parseCatalogCsv(): CatalogRow[] {
  const mdPath = join(process.cwd(), 'catalogo.md')
  let content: string
  try {
    content = readFileSync(mdPath, 'utf-8')
  } catch {
    throw new Error(`catalogo.md not found at ${mdPath}`)
  }

  const csvMatch = content.match(/```csv\n([\s\S]+?)\n```/)
  if (!csvMatch) throw new Error('CSV block (```csv ... ```) not found in catalogo.md')

  const lines = csvMatch[1].split('\n').map((l) => l.trim()).filter(Boolean)
  const [header, ...dataLines] = lines

  if (header !== 'categoria,produto,slug') {
    throw new Error(`Unexpected CSV header: "${header}"`)
  }

  return dataLines.map((line, i) => {
    const firstComma = line.indexOf(',')
    const lastComma = line.lastIndexOf(',')
    if (firstComma === -1 || firstComma === lastComma) {
      throw new Error(`Malformed CSV row ${i + 2}: "${line}"`)
    }
    return {
      category: line.slice(0, firstComma).trim(),
      slug: line.slice(lastComma + 1).trim(),
      product: line.slice(firstComma + 1, lastComma).trim(),
    }
  })
}

function buildStorageUrl(supabaseUrl: string, path: string): string {
  const base = supabaseUrl.replace(/\/$/, '')
  return `${base}/storage/v1/object/public/${STORAGE_BUCKET}/${path}`
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const banner = DRY_RUN ? '[DRY RUN] Just Runner Image Records Importer' : 'Just Runner Image Records Importer'
  console.log(`\n${'═'.repeat(55)}`)
  console.log(banner)
  console.log('═'.repeat(55))

  // 1. Parse catalog
  console.log('\n▸ Parsing catalogo.md...')
  const rows = parseCatalogCsv()
  console.log(`  ✓ ${rows.length} products in catalog`)

  // 2. Preview paths
  console.log('\n▸ Expected Storage paths (bucket: products):')
  const sample = rows.slice(0, 3)
  for (const row of sample) {
    const catSlug = toCategorySlug(row.category)
    for (const filename of IMAGE_FILENAMES) {
      console.log(`  ${catSlug}/${row.slug}/${filename}`)
    }
  }
  if (rows.length > 3) {
    console.log(`  ... and ${(rows.length - 3) * IMAGE_FILENAMES.length} more paths`)
  }

  const totalImageRecords = rows.length * IMAGE_FILENAMES.length
  console.log(`\n  Total image records to create: ${totalImageRecords}`)

  if (DRY_RUN) {
    console.log('\n[DRY RUN] No data written.')
    console.log('To run for real: npm run images:import\n')
    return
  }

  // 3. Validate env
  if (!SUPABASE_URL.startsWith('https://')) {
    console.error('\nERROR: SUPABASE_URL / NEXT_PUBLIC_SUPABASE_URL is missing or invalid.')
    console.error('Add it to .env.local and retry.\n')
    process.exit(1)
  }
  if (!SERVICE_ROLE_KEY) {
    console.error('\nERROR: SUPABASE_SERVICE_ROLE_KEY is missing.')
    console.error('Find it in Supabase dashboard → Project Settings → API → service_role key.')
    console.error('Add it to .env.local and retry.\n')
    process.exit(1)
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  })

  // 4. Fetch all products (slug → id map)
  console.log('\n▸ Fetching products from Supabase...')
  const { data: productData, error: productErr } = await supabase
    .from('products')
    .select('id, slug')

  if (productErr) {
    console.error('ERROR fetching products:', productErr.message)
    process.exit(1)
  }

  const productBySlug = new Map<string, string>(
    (productData ?? []).map((p: { id: string; slug: string }) => [p.slug, p.id])
  )
  console.log(`  ✓ ${productBySlug.size} products found in DB`)

  // 5. Fetch existing image URLs to avoid duplicates
  console.log('\n▸ Fetching existing image records...')
  const { data: existingImages } = await supabase
    .from('images')
    .select('url')

  const existingUrls = new Set<string>(
    (existingImages ?? []).map((img: { url: string }) => img.url)
  )
  console.log(`  ✓ ${existingUrls.size} image records already exist`)

  // 6. Build image records
  const toInsert: ImageRecord[] = []
  const skippedNoProduct: string[] = []
  const skippedExisting: number[] = []

  for (const row of rows) {
    const productId = productBySlug.get(row.slug)
    if (!productId) {
      skippedNoProduct.push(row.slug)
      continue
    }

    const catSlug = toCategorySlug(row.category)

    IMAGE_FILENAMES.forEach((filename, position) => {
      const storagePath = `${catSlug}/${row.slug}/${filename}`
      const url = buildStorageUrl(SUPABASE_URL, storagePath)

      if (existingUrls.has(url)) {
        skippedExisting.push(position)
        return
      }

      toInsert.push({
        product_id: productId,
        variant_id: null,
        url,
        alt: `${row.product} — ${filename.replace('.jpg', '')}`,
        position,
      })
    })
  }

  if (skippedNoProduct.length > 0) {
    console.log(`\n  ⚠ ${skippedNoProduct.length} products not in DB (run catalog:import first):`)
    skippedNoProduct.slice(0, 10).forEach((s) => console.log(`    - ${s}`))
    if (skippedNoProduct.length > 10) console.log(`    ... and ${skippedNoProduct.length - 10} more`)
  }

  if (skippedExisting.length > 0) {
    console.log(`\n  ⊘ ${skippedExisting.length} image records already exist (skipped)`)
  }

  if (toInsert.length === 0) {
    console.log('\n  ✓ Nothing new to insert.')
    console.log('\n✓ Import complete — nothing to do.\n')
    return
  }

  // 7. Insert in batches
  console.log(`\n▸ Inserting ${toInsert.length} image records...`)
  const BATCH_SIZE = 100
  let inserted = 0

  for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
    const batch = toInsert.slice(i, i + BATCH_SIZE)
    const { error: imgErr } = await supabase.from('images').insert(batch)

    if (imgErr) {
      console.error(`ERROR inserting image batch at offset ${i}:`, imgErr.message)
      process.exit(1)
    }

    inserted += batch.length
    process.stdout.write(
      `  ${inserted}/${toInsert.length} records inserted\r`
    )
  }

  // 8. Summary
  console.log(`\n\n${'─'.repeat(55)}`)
  console.log('✓ Image records import complete!')
  console.log(`  Records inserted  : ${inserted}`)
  console.log(`  Records skipped   : ${skippedExisting.length} (already exist)`)
  console.log(`  Products missing  : ${skippedNoProduct.length} (not in DB)`)
  console.log(`${'─'.repeat(55)}`)
  console.log('\nNext steps:')
  console.log(`  1. Upload image files to Supabase Storage bucket "${STORAGE_BUCKET}":`)
  console.log('     Path format: {categorySlug}/{productSlug}/cover.jpg')
  console.log('     Path format: {categorySlug}/{productSlug}/01.jpg')
  console.log('  2. Verify in Supabase dashboard → Storage → products\n')
}

main().catch((err: Error) => {
  console.error('\nFATAL:', err.message)
  process.exit(1)
})
