#!/usr/bin/env node
/**
 * Just Runner Storage Sync — Upload product images to Supabase Storage and sync `images` table.
 *
 * Usage:
 *   npm run storage:dry-run             # scan only, no writes
 *   npm run storage:sync                # upload + update DB
 *   npm run storage:verify              # integrity report vs DB and catalogo.md
 *   npm run storage:sync -- --source /abs/path/to/products
 *
 * Expected local source structure (default: ./products at project root):
 *   products/
 *   ├── eye-jacket/
 *   │   └── eye-jacket-preta-lente-preta/
 *   │       ├── cover.jpg   → Storage position 0
 *   │       ├── 01.jpg      → Storage position 1
 *   │       ├── 02.jpg      → Storage position 2
 *   │       └── 03.jpg      → Storage position 3
 *
 * Storage bucket name: products
 * Storage path format: {categorySlug}/{productSlug}/{filename}
 *
 * Requires:
 *   NEXT_PUBLIC_SUPABASE_URL  (or SUPABASE_URL)
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { join, extname, resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

// ── Flags ─────────────────────────────────────────────────────────────────────

const DRY_RUN = process.argv.includes('--dry-run')
const VERIFY_ONLY = process.argv.includes('--verify')

const srcIdx = process.argv.indexOf('--source')
const SOURCE_DIR = srcIdx >= 0
  ? resolve(process.argv[srcIdx + 1] ?? '')
  : resolve(process.cwd(), 'products')

const SUPABASE_URL =
  process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

const BUCKET = 'products'
const MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
}
const IMAGE_EXTS = new Set(Object.keys(MIME))

// ── Types ─────────────────────────────────────────────────────────────────────

interface LocalFile {
  filename: string
  fullPath: string
  storagePath: string
  position: number
  mimeType: string
  sizeBytes: number
}

interface LocalProduct {
  categorySlug: string
  productSlug: string
  files: LocalFile[]
}

interface IntegrityReport {
  dbProductsTotal: number
  dbProductsWithImages: number
  dbProductsWithoutImages: string[]
  localFoldersWithoutDbProduct: string[]
  dbProductsWithoutLocalFolder: string[]
  orphanImageRecords: number
  totalLocalFiles: number
  totalStoragePaths: number
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function assignPosition(filename: string): number {
  const base = filename.toLowerCase().replace(/\.[^.]+$/, '')
  if (base === 'cover') return 0
  const n = parseInt(base, 10)
  if (!isNaN(n) && n >= 1 && n <= 99) return n
  return 100 // unrecognised names → last
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

function parseCatalogSlugs(): Set<string> {
  const mdPath = resolve(process.cwd(), 'catalogo.md')
  if (!existsSync(mdPath)) return new Set()
  const content = readFileSync(mdPath, 'utf-8')
  const csvMatch = content.match(/```csv\n([\s\S]+?)\n```/)
  if (!csvMatch) return new Set()
  const lines = csvMatch[1].split('\n').slice(1) // skip header
  const slugs = new Set<string>()
  for (const line of lines) {
    const lastComma = line.lastIndexOf(',')
    if (lastComma > 0) slugs.add(line.slice(lastComma + 1).trim())
  }
  return slugs
}

// ── Scan local source ─────────────────────────────────────────────────────────

function scanSourceDir(dir: string): LocalProduct[] {
  if (!existsSync(dir)) return []

  const products: LocalProduct[] = []

  let categoryDirs: string[]
  try {
    categoryDirs = readdirSync(dir).filter((n) => {
      try { return !n.startsWith('.') && statSync(join(dir, n)).isDirectory() }
      catch { return false }
    })
  } catch {
    return []
  }

  for (const categorySlug of categoryDirs) {
    const categoryPath = join(dir, categorySlug)

    let productDirs: string[]
    try {
      productDirs = readdirSync(categoryPath).filter((n) => {
        try { return !n.startsWith('.') && statSync(join(categoryPath, n)).isDirectory() }
        catch { return false }
      })
    } catch {
      continue
    }

    for (const productSlug of productDirs) {
      const productPath = join(categoryPath, productSlug)

      let filenames: string[]
      try {
        filenames = readdirSync(productPath).filter((n) => {
          if (n.startsWith('.')) return false
          return IMAGE_EXTS.has(extname(n).toLowerCase())
        })
      } catch {
        continue
      }

      if (filenames.length === 0) continue

      const files: LocalFile[] = filenames.map((filename) => {
        const fullPath = join(productPath, filename)
        const ext = extname(filename).toLowerCase()
        let sizeBytes = 0
        try { sizeBytes = statSync(fullPath).size } catch { /* ok */ }
        return {
          filename,
          fullPath,
          storagePath: `${categorySlug}/${productSlug}/${filename}`,
          position: assignPosition(filename),
          mimeType: MIME[ext] ?? 'image/jpeg',
          sizeBytes,
        }
      })

      files.sort((a, b) => a.position - b.position || a.filename.localeCompare(b.filename))

      products.push({ categorySlug, productSlug, files })
    }
  }

  return products
}

// ── Upload ────────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function uploadFile(
  supabase: any,
  localFile: LocalFile,
  skipExisting: boolean
): Promise<'uploaded' | 'skipped' | 'error'> {
  if (skipExisting) {
    // HEAD-check: try to get existing metadata
    const { data: existing } = await supabase.storage
      .from(BUCKET)
      .list(localFile.storagePath.substring(0, localFile.storagePath.lastIndexOf('/')), {
        search: localFile.filename,
        limit: 1,
      })
    if (existing && existing.length > 0) return 'skipped'
  }

  const buffer = readFileSync(localFile.fullPath)
  const { error } = await supabase.storage.from(BUCKET).upload(localFile.storagePath, buffer, {
    contentType: localFile.mimeType,
    upsert: true,
  })

  return error ? 'error' : 'uploaded'
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const modeLabel = VERIFY_ONLY
    ? 'Verify'
    : DRY_RUN
    ? '[DRY RUN] Sync'
    : 'Sync'

  console.log(`\n${'═'.repeat(55)}`)
  console.log(`Just Runner Storage ${modeLabel}`)
  console.log('═'.repeat(55))
  console.log(`\nSource  : ${SOURCE_DIR}`)
  console.log(`Bucket  : ${BUCKET}`)
  console.log(`Mode    : ${VERIFY_ONLY ? 'verify' : DRY_RUN ? 'dry-run' : 'sync'}\n`)

  // ── 1. Scan local ─────────────────────────────────────────────────────────

  console.log('▸ Scanning local source folder...')

  if (!existsSync(SOURCE_DIR)) {
    console.log(`  ⚠ Folder not found: ${SOURCE_DIR}`)
    console.log('  Create the folder with this structure:')
    console.log('    products/{categorySlug}/{productSlug}/cover.jpg')
    console.log('    products/{categorySlug}/{productSlug}/01.jpg\n')

    if (!VERIFY_ONLY && !DRY_RUN) {
      console.error('FATAL: Nothing to upload.\n')
      process.exit(1)
    }
  }

  const localProducts = scanSourceDir(SOURCE_DIR)
  const totalFiles = localProducts.reduce((s, p) => s + p.files.length, 0)

  if (localProducts.length > 0) {
    console.log(`  ✓ ${localProducts.length} product folders found`)
    console.log(`  ✓ ${totalFiles} image files total`)

    // Preview table
    const sample = localProducts.slice(0, 5)
    for (const p of sample) {
      const fileList = p.files.map((f) => f.filename).join(', ')
      console.log(`  ${p.categorySlug}/${p.productSlug}/ [${fileList}]`)
    }
    if (localProducts.length > 5) {
      console.log(`  ... and ${localProducts.length - 5} more product folders`)
    }
  } else {
    console.log('  (no image folders found)')
  }

  // ── 2. DRY RUN: stop here ─────────────────────────────────────────────────

  if (DRY_RUN) {
    console.log('\n▸ Would upload:')
    let totalSize = 0
    for (const p of localProducts) {
      for (const f of p.files) {
        console.log(`  → ${f.storagePath} (${formatBytes(f.sizeBytes)})`)
        totalSize += f.sizeBytes
      }
    }
    console.log(`\n  Total: ${localProducts.length} products, ${totalFiles} files, ${formatBytes(totalSize)}`)
    console.log('\n[DRY RUN] No data written.')
    console.log('To sync for real: npm run storage:sync\n')
    return
  }

  // ── 3. Validate env ───────────────────────────────────────────────────────

  if (!SUPABASE_URL.startsWith('https://')) {
    console.error('\nERROR: SUPABASE_URL / NEXT_PUBLIC_SUPABASE_URL is missing or invalid.')
    console.error('Add it to .env.local and retry.\n')
    process.exit(1)
  }
  if (!SERVICE_ROLE_KEY) {
    console.error('\nERROR: SUPABASE_SERVICE_ROLE_KEY is missing.')
    console.error('Supabase dashboard → Project Settings → API → service_role\n')
    process.exit(1)
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  })

  // ── 4. Fetch DB state ─────────────────────────────────────────────────────

  console.log('\n▸ Fetching products from database...')
  const { data: dbProducts, error: dbErr } = await supabase
    .from('products')
    .select('id, slug')

  if (dbErr) {
    console.error('ERROR fetching products:', dbErr.message)
    process.exit(1)
  }

  const productBySlug = new Map<string, string>(
    (dbProducts ?? []).map((p: { id: string; slug: string }) => [p.slug, p.id])
  )
  console.log(`  ✓ ${productBySlug.size} products in DB`)

  const { data: existingImages } = await supabase
    .from('images')
    .select('url, product_id')

  const existingUrls = new Set<string>(
    (existingImages ?? []).map((i: { url: string }) => i.url)
  )
  console.log(`  ✓ ${existingUrls.size} image records in DB`)

  // ── 5. VERIFY ONLY: skip upload ───────────────────────────────────────────

  if (!VERIFY_ONLY && localProducts.length > 0) {
    // ── 6. Upload + DB insert ─────────────────────────────────────────────

    const catalogSlugs = parseCatalogSlugs()

    console.log(`\n▸ Uploading ${totalFiles} files to Storage...`)

    let uploaded = 0
    let skipped = 0
    let errors = 0
    const imageInserts: {
      product_id: string
      variant_id: null
      url: string
      alt: string
      position: number
    }[] = []

    for (const product of localProducts) {
      const productId = productBySlug.get(product.productSlug)
      if (!productId) {
        console.log(`  ⚠ No DB product for slug "${product.productSlug}" — skipping upload`)
        continue
      }

      for (const file of product.files) {
        const status = await uploadFile(supabase, file, false)

        if (status === 'uploaded') {
          uploaded++
          process.stdout.write(`  ↑ ${uploaded + skipped}/${totalFiles} files\r`)
        } else if (status === 'error') {
          errors++
          console.log(`\n  ✗ Upload failed: ${file.storagePath}`)
        }

        // Build public URL
        const { data: urlData } = supabase.storage
          .from(BUCKET)
          .getPublicUrl(file.storagePath)

        const publicUrl = urlData.publicUrl

        if (!existingUrls.has(publicUrl)) {
          imageInserts.push({
            product_id: productId,
            variant_id: null,
            url: publicUrl,
            alt: `${product.productSlug} ${file.position === 0 ? 'cover' : String(file.position).padStart(2, '0')}`,
            position: file.position,
          })
        } else {
          skipped++
        }
      }
    }

    console.log(`\n  ✓ ${uploaded} uploaded, ${skipped} skipped, ${errors} errors`)

    // Insert new image records
    if (imageInserts.length > 0) {
      console.log(`\n▸ Inserting ${imageInserts.length} image records into DB...`)
      const BATCH = 100
      let dbInserted = 0
      for (let i = 0; i < imageInserts.length; i += BATCH) {
        const { error: imgErr } = await supabase
          .from('images')
          .insert(imageInserts.slice(i, i + BATCH))
        if (imgErr) {
          console.error(`ERROR inserting image records (batch ${i}):`, imgErr.message)
          process.exit(1)
        }
        dbInserted += Math.min(BATCH, imageInserts.length - i)
        process.stdout.write(`  ${dbInserted}/${imageInserts.length} records\r`)
      }
      console.log(`\n  ✓ ${dbInserted} image records inserted`)
    } else {
      console.log('\n  ✓ All image records already in DB (nothing new)')
    }
  }

  // ── 7. Integrity report ───────────────────────────────────────────────────

  console.log(`\n${'─'.repeat(55)}`)
  console.log('INTEGRITY REPORT')
  console.log('─'.repeat(55))

  const localSlugs = new Set(localProducts.map((p) => p.productSlug))
  const dbSlugsSet = new Set(productBySlug.keys())
  const catalogSlugsAll = parseCatalogSlugs()

  // Products in DB without a local folder
  const dbWithoutLocal: string[] = [...dbSlugsSet].filter((s) => !localSlugs.has(s))

  // Local folders with no DB match
  const localWithoutDb: string[] = [...localSlugs].filter((s) => !dbSlugsSet.has(s))

  // Products in catalogo.md with no local folder
  const catalogWithoutLocal: string[] = [...catalogSlugsAll].filter((s) => !localSlugs.has(s))

  // DB products with no image records
  const { data: productsWithImages } = await supabase
    .from('images')
    .select('product_id')
  const productIdsWithImages = new Set<string>(
    (productsWithImages ?? []).map((i: { product_id: string }) => i.product_id)
  )
  const dbWithoutImages: string[] = [...productBySlug.entries()]
    .filter(([, id]) => !productIdsWithImages.has(id))
    .map(([slug]) => slug)

  // Orphan images (product_id not in products)
  const productIdsSet = new Set(productBySlug.values())
  const { data: allImages } = await supabase
    .from('images')
    .select('id, product_id')
  const orphans = (allImages ?? []).filter(
    (i: { product_id: string }) => !productIdsSet.has(i.product_id)
  )

  console.log(`\nDB products total           : ${productBySlug.size}`)
  console.log(`DB products with images     : ${productIdsWithImages.size}`)
  console.log(`DB products WITHOUT images  : ${dbWithoutImages.length}`)
  console.log(`Local folders found         : ${localProducts.length}`)
  console.log(`Total local image files     : ${totalFiles}`)
  console.log(`Catalog slugs (catalogo.md) : ${catalogSlugsAll.size}`)

  if (dbWithoutImages.length > 0) {
    console.log(`\n⚠ Products without image records (${dbWithoutImages.length}):`)
    dbWithoutImages.slice(0, 20).forEach((s) => console.log(`  - ${s}`))
    if (dbWithoutImages.length > 20) console.log(`  ... +${dbWithoutImages.length - 20} more`)
  }

  if (localWithoutDb.length > 0) {
    console.log(`\n⚠ Local folders with no DB product (${localWithoutDb.length}):`)
    localWithoutDb.slice(0, 10).forEach((s) => console.log(`  - ${s}`))
    if (localWithoutDb.length > 10) console.log(`  ... +${localWithoutDb.length - 10} more`)
  }

  if (dbWithoutLocal.length > 0) {
    const show = dbWithoutLocal.slice(0, 10)
    console.log(`\n⊘ DB products without local folder (${dbWithoutLocal.length}):`)
    show.forEach((s) => console.log(`  - ${s}`))
    if (dbWithoutLocal.length > 10) console.log(`  ... +${dbWithoutLocal.length - 10} more`)
  }

  if (catalogWithoutLocal.length > 0 && localProducts.length > 0) {
    const show = catalogWithoutLocal.slice(0, 10)
    console.log(`\n⊘ Catalog slugs without local folder (${catalogWithoutLocal.length}):`)
    show.forEach((s) => console.log(`  - ${s}`))
    if (catalogWithoutLocal.length > 10) console.log(`  ... +${catalogWithoutLocal.length - 10} more`)
  }

  if (orphans.length > 0) {
    console.log(`\n⚠ Orphan image records (product not in DB): ${orphans.length}`)
  }

  const allClear =
    dbWithoutImages.length === 0 &&
    localWithoutDb.length === 0 &&
    orphans.length === 0

  console.log(`\n${'─'.repeat(55)}`)
  if (allClear) {
    console.log('✓ All checks passed — catalog, images and DB are in sync.')
  } else {
    console.log('⚠ Issues found — see report above.')
  }
  console.log()
}

main().catch((err: Error) => {
  console.error('\nFATAL:', err.message)
  process.exit(1)
})
