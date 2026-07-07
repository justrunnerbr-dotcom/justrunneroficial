#!/usr/bin/env node
/**
 * Just Runner Catalog Importer
 * Usage: npm run catalog:dry-run   (preview only)
 *        npm run catalog:import    (write to Supabase)
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

// ── Types ─────────────────────────────────────────────────────────────────────

interface CatalogRow {
  category: string
  product: string
  slug: string
}

interface CollectionRecord {
  slug: string
  name: string
  description: null
  image_url: null
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
    throw new Error(`Unexpected CSV header: "${header}". Expected: "categoria,produto,slug"`)
  }

  const rows: CatalogRow[] = []
  for (let i = 0; i < dataLines.length; i++) {
    const line = dataLines[i]
    // Fields: categoria, produto (may contain commas), slug
    // Strategy: first comma = category split; last comma = slug split; middle = product
    const firstComma = line.indexOf(',')
    const lastComma = line.lastIndexOf(',')

    if (firstComma === -1 || firstComma === lastComma) {
      throw new Error(`Malformed CSV row ${i + 2}: "${line}"`)
    }

    const category = line.slice(0, firstComma).trim()
    const slug = line.slice(lastComma + 1).trim()
    const product = line.slice(firstComma + 1, lastComma).trim()

    if (!category || !product || !slug) {
      throw new Error(`Empty field in CSV row ${i + 2}: "${line}"`)
    }

    if (!/^[a-z0-9-]+$/.test(slug)) {
      throw new Error(`Invalid slug at row ${i + 2}: "${slug}" (only lowercase a-z, 0-9, hyphens allowed)`)
    }

    rows.push({ category, product, slug })
  }

  return rows
}

function validateRows(rows: CatalogRow[]): void {
  const seen = new Map<string, number>()
  for (let i = 0; i < rows.length; i++) {
    const prev = seen.get(rows[i].slug)
    if (prev !== undefined) {
      throw new Error(`Duplicate slug "${rows[i].slug}" at rows ${prev + 1} and ${i + 1}`)
    }
    seen.set(rows[i].slug, i)
  }
}

function buildCollections(rows: CatalogRow[]): CollectionRecord[] {
  const order = new Map<string, number>()
  for (const row of rows) {
    if (!order.has(row.category)) order.set(row.category, order.size + 1)
  }
  return Array.from(order.entries()).map(([name, position]) => ({
    slug: toCategorySlug(name),
    name,
    description: null,
    image_url: null,
    position,
  }))
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const banner = DRY_RUN ? '[DRY RUN] Just Runner Catalog Importer' : 'Just Runner Catalog Importer'
  console.log(`\n${'═'.repeat(55)}`)
  console.log(banner)
  console.log('═'.repeat(55))

  // 1. Parse & validate
  console.log('\n▸ Parsing catalogo.md...')
  const rows = parseCatalogCsv()
  console.log(`  ✓ ${rows.length} rows parsed`)

  validateRows(rows)
  console.log('  ✓ No duplicate slugs')

  const collections = buildCollections(rows)
  console.log(`  ✓ ${collections.length} unique categories`)

  // 2. Preview
  console.log('\n▸ Collections to upsert:')
  collections.forEach((c) =>
    console.log(`  ${String(c.position).padStart(2, ' ')}. ${c.name.padEnd(18)} → ${c.slug}`)
  )

  if (DRY_RUN) {
    console.log(`\n▸ Products to insert (skipping existing slugs): ${rows.length}`)
    console.log('▸ Default variants: 1 per new product')
    console.log(`\n[DRY RUN] No data written.`)
    console.log('To run for real: npm run catalog:import\n')
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

  // 4. Upsert collections
  console.log('\n▸ Upserting collections...')
  const { error: colErr } = await supabase
    .from('collections')
    .upsert(collections, { onConflict: 'slug', ignoreDuplicates: false })

  if (colErr) {
    console.error('ERROR upserting collections:', colErr.message)
    process.exit(1)
  }
  console.log(`  ✓ ${collections.length} collections upserted`)

  // 5. Fetch collection IDs
  const { data: colData, error: colFetchErr } = await supabase
    .from('collections')
    .select('id, slug')

  if (colFetchErr || !colData) {
    console.error('ERROR fetching collections:', colFetchErr?.message)
    process.exit(1)
  }

  const collectionBySlug = new Map<string, string>(
    (colData as { id: string; slug: string }[]).map((c) => [c.slug, c.id])
  )

  // 6. Skip existing products
  const { data: existingData } = await supabase.from('products').select('slug')
  const existingSlugs = new Set<string>(
    (existingData ?? []).map((p: { slug: string }) => p.slug)
  )

  const newRows = rows.filter((r) => !existingSlugs.has(r.slug))
  const skippedCount = rows.length - newRows.length

  if (skippedCount > 0) {
    console.log(`\n  ⊘ ${skippedCount} products already exist (skipped)`)
  }

  if (newRows.length === 0) {
    console.log('  ✓ All products already in database.')
    console.log('\n✓ Import complete — nothing to do.\n')
    return
  }

  // 7. Insert products in batches
  console.log(`\n▸ Inserting ${newRows.length} new products...`)
  const BATCH_SIZE = 50
  let insertedProducts = 0

  for (let i = 0; i < newRows.length; i += BATCH_SIZE) {
    const batch = newRows.slice(i, i + BATCH_SIZE)

    const productRows = batch.map((row) => {
      const catSlug = toCategorySlug(row.category)
      const collectionId = collectionBySlug.get(catSlug)
      if (!collectionId) {
        throw new Error(
          `Collection not found for category "${row.category}" (slug: "${catSlug}"). ` +
          `Available: ${[...collectionBySlug.keys()].join(', ')}`
        )
      }
      return {
        slug: row.slug,
        name: row.product,
        description: null,
        collection_id: collectionId,
        status: 'active',
        featured: false,
      }
    })

    const { data: inserted, error: insertErr } = await supabase
      .from('products')
      .insert(productRows)
      .select('id, slug')

    if (insertErr) {
      console.error(`ERROR inserting batch starting at row ${i + 1}:`, insertErr.message)
      process.exit(1)
    }

    // 8. Create default variant for each new product
    if (inserted && inserted.length > 0) {
      const variantRows = (inserted as { id: string; slug: string }[]).map((p) => ({
        product_id: p.id,
        name: 'Padrão',
        price: 0,
        compare_price: null,
        sku: `JR-${p.slug.toUpperCase().replace(/-/g, '_')}`,
        stock: 0,
        yampi_product_id: null,
        position: 1,
      }))

      const { error: varErr } = await supabase.from('variants').insert(variantRows)
      if (varErr) {
        console.error('ERROR inserting variants:', varErr.message)
        process.exit(1)
      }

      insertedProducts += inserted.length
      process.stdout.write(
        `  batch ${Math.ceil((i + BATCH_SIZE) / BATCH_SIZE)}/${Math.ceil(newRows.length / BATCH_SIZE)}: ${insertedProducts} products\r`
      )
    }
  }

  // 9. Summary
  console.log(`\n\n${'─'.repeat(55)}`)
  console.log('✓ Import complete!')
  console.log(`  Collections upserted : ${collections.length}`)
  console.log(`  Products inserted    : ${insertedProducts}`)
  console.log(`  Products skipped     : ${skippedCount}`)
  console.log(`  Variants created     : ${insertedProducts} (1 per product, price=0)`)
  console.log(`${'─'.repeat(55)}`)
  console.log('\nNext steps:')
  console.log('  1. npm run images:dry-run   — preview image records')
  console.log('  2. npm run images:import    — create image DB records')
  console.log('  3. Upload images to Supabase Storage bucket "products"')
  console.log('  4. Set real prices in Supabase dashboard → products → variants\n')
}

main().catch((err: Error) => {
  console.error('\nFATAL:', err.message)
  process.exit(1)
})
