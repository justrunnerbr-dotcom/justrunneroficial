#!/usr/bin/env node
/**
 * Just Runner — Import from local `products/` photo folder.
 *
 * Reads `products/{CATEGORIA}/{arquivo}.ext` where the filename encodes
 * "Produto [Sub-modelo] [Lente Cor]" (ex: "Eye Jacket Brain Dead Lente Azul_(1).png").
 * Creates collections + products + variants (one per detected lens color) +
 * uploads photos to Supabase Storage bucket "products" + creates `images` records.
 *
 * Usage:
 *   npm run photos:dry-run              (preview only, no writes, no Supabase needed)
 *   npm run photos:import               (write to Supabase + upload files)
 *   npm run photos:import -- --source /abs/path
 *
 * Requires in environment (only for --import, not --dry-run):
 *   NEXT_PUBLIC_SUPABASE_URL  (or SUPABASE_URL)
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { join, extname, resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

// ── Flags ─────────────────────────────────────────────────────────────────────

const DRY_RUN = process.argv.includes('--dry-run')

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

// ── Types ─────────────────────────────────────────────────────────────────────

interface ParsedFile {
  category: string
  fullPath: string
  ext: string
  product: string
  variant: string | null // null = product-level image, not tied to a variant
  position: number
}

// ── Category-specific overrides ──────────────────────────────────────────────
// Files that don't follow the "Produto Lente Cor" pattern. Reviewed manually
// against the actual `products/` folder contents (2026-07-07).

const OVERRIDES: Record<string, (base: string) => { product: string; variant: string | null } | null> = {
  'CASUAL': (base) => {
    const m = base.match(/^Dartboard\s+(.+)$/i)
    return m ? { product: 'Dartboard', variant: m[1].trim() } : null
  },
  'ENCODER': (base) => {
    if (/^ENCODERFULLBLACK/i.test(base)) return { product: 'Encoder', variant: 'Full Black' }
    if (/^ENCODERVR28/i.test(base)) return { product: 'Encoder', variant: 'VR28' }
    const m = base.match(/^Encoder\s+(.+)$/i)
    return m ? { product: 'Encoder', variant: m[1].trim() } : null
  },
  'HALF JACKET': (base) => {
    if (/^HALFJACKETFULLBLACK/i.test(base)) return { product: 'Half Jacket', variant: 'Full Black' }
    const m = base.match(/^Half Jacket\s+(.+)$/i)
    return m ? { product: 'Half Jacket', variant: m[1].trim() } : null
  },
  'MINUTE': (base) => {
    if (/^Minute Cristal/i.test(base)) return { product: 'Minute Cristal', variant: 'Único' }
    return null
  },
  'PLANTARIS': (base) => {
    const standalone = ['Azul Escuro', 'Podpah', 'Preta', 'Preta Haste Transparente', 'Stonewash', 'Verde']
    for (const name of standalone) {
      if (base.trim().toLowerCase() === `Plantaris ${name}`.toLowerCase()) {
        return { product: `Plantaris ${name}`, variant: 'Único' }
      }
    }
    return null
  },
  'EYE JACKET': (base) => {
    const b = base.trim().toLowerCase()
    if (b === 'eye jacket preta') return { product: 'Eye Jacket Preta', variant: null }
    if (b === 'eye jacket redux preta') return { product: 'Eye Jacket Redux Preta', variant: null }
    if (b === 'eye jacket redux verde') return { product: 'Eye Jacket Redux Verde', variant: 'Único' }
    return null
  },
  'RADAR': (base) => {
    const m = base.match(/^Radar EV\s+(.+?)\s*\+\s*Kit de Lentes$/i)
    return m ? { product: 'Radar EV Kit de Lentes', variant: m[1].trim() } : null
  },
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function slugify(str: string): string {
  return str
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // strip accents
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

function titleCase(str: string): string {
  return str.split(' ').map(w => w.length ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w).join(' ')
}

function parseFilename(category: string, filename: string, fullPath: string): ParsedFile | null {
  const ext = extname(filename).toLowerCase()
  if (!MIME[ext]) return null

  let base = filename.slice(0, -ext.length)
  let position = 0
  const parenMatch = base.match(/\((\d+)\)\s*$/)
  if (parenMatch) {
    position = parseInt(parenMatch[1], 10)
    base = base.slice(0, parenMatch.index).trim()
  }
  base = base.replace(/_+$/, '').trim()

  const override = OVERRIDES[category]?.(base)
  if (override) {
    return { category, fullPath, ext, product: override.product, variant: override.variant, position }
  }

  const m = base.match(/\bLente\b/i)
  if (m) {
    const product = base.slice(0, m.index).trim()
    const variant = base.slice(m.index).trim()
    return { category, fullPath, ext, product, variant, position }
  }

  return null // unmapped — reported separately
}

function scanSourceDir(dir: string): { parsed: ParsedFile[]; unmapped: string[] } {
  const parsed: ParsedFile[] = []
  const unmapped: string[] = []
  if (!existsSync(dir)) return { parsed, unmapped }

  const categoryDirs = readdirSync(dir).filter((n) => {
    try { return !n.startsWith('.') && statSync(join(dir, n)).isDirectory() } catch { return false }
  })

  for (const category of categoryDirs) {
    const catPath = join(dir, category)
    const entries = readdirSync(catPath).filter((n) => !n.startsWith('.'))

    // Direct files
    for (const n of entries) {
      const full = join(catPath, n)
      let isFile = false
      try { isFile = statSync(full).isFile() } catch { continue }
      if (!isFile) continue
      const p = parseFilename(category, n, full)
      if (p) parsed.push(p)
      else unmapped.push(`${category}/${n}`)
    }

    // One level of subfolders (ex: "KIT RADAR", "FUNDO CINZA") — files inside
    // are still attributed to the parent category, parsed the same way.
    for (const n of entries) {
      const subPath = join(catPath, n)
      let isDir = false
      try { isDir = statSync(subPath).isDirectory() } catch { continue }
      if (!isDir) continue
      const subFiles = readdirSync(subPath).filter((f) => !f.startsWith('.'))
      for (const f of subFiles) {
        const full = join(subPath, f)
        try { if (!statSync(full).isFile()) continue } catch { continue }
        const p = parseFilename(category, f, full)
        if (p) parsed.push(p)
        else unmapped.push(`${category}/${n}/${f}`)
      }
    }
  }

  return { parsed, unmapped }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log(`\n${'═'.repeat(60)}`)
  console.log(DRY_RUN ? '[DRY RUN] Just Runner — Import from Photos' : 'Just Runner — Import from Photos')
  console.log('═'.repeat(60))
  console.log(`\nSource: ${SOURCE_DIR}\n`)

  const { parsed, unmapped } = scanSourceDir(SOURCE_DIR)

  if (unmapped.length > 0) {
    console.log(`⚠ ${unmapped.length} arquivo(s) não reconhecido(s) (sem "Lente" e sem override) — IGNORADOS:`)
    unmapped.forEach((u) => console.log(`  - ${u}`))
    console.log()
  }

  // Group: category -> product -> variant (or __product__ for null) -> files
  type Group = Map<string, Map<string, Map<string, ParsedFile[]>>>
  const groups: Group = new Map()

  for (const p of parsed) {
    if (!groups.has(p.category)) groups.set(p.category, new Map())
    const byProduct = groups.get(p.category)!
    if (!byProduct.has(p.product)) byProduct.set(p.product, new Map())
    const byVariant = byProduct.get(p.product)!
    const vKey = p.variant ?? '__product__'
    if (!byVariant.has(vKey)) byVariant.set(vKey, [])
    byVariant.get(vKey)!.push(p)
  }

  let totalProducts = 0
  let totalVariants = 0
  let totalImages = parsed.length

  for (const [category, byProduct] of groups) {
    console.log(`\n${category} (${byProduct.size} produtos)`)
    for (const [product, byVariant] of byProduct) {
      totalProducts++
      const variantNames = [...byVariant.keys()].filter(k => k !== '__product__')
      totalVariants += variantNames.length
      const photoCount = [...byVariant.values()].reduce((s, arr) => s + arr.length, 0)
      console.log(`  ${product}  [${photoCount} fotos, ${variantNames.length} variação(ões)]`)
      if (DRY_RUN) {
        for (const [variant, files] of byVariant) {
          const label = variant === '__product__' ? '(imagem do produto, sem variação)' : variant
          console.log(`    - ${label}: ${files.length} foto(s)`)
        }
      }
    }
  }

  console.log(`\n${'─'.repeat(60)}`)
  console.log(`Categorias : ${groups.size}`)
  console.log(`Produtos   : ${totalProducts}`)
  console.log(`Variações  : ${totalVariants}`)
  console.log(`Imagens    : ${totalImages}`)
  console.log(`Não mapeados: ${unmapped.length}`)
  console.log('─'.repeat(60))

  if (DRY_RUN) {
    console.log('\n[DRY RUN] Nada foi gravado.')
    console.log('Pra rodar de verdade: npm run photos:import\n')
    return
  }

  // ── Validate env ─────────────────────────────────────────────────────────
  if (!SUPABASE_URL.startsWith('https://')) {
    console.error('\nERRO: SUPABASE_URL / NEXT_PUBLIC_SUPABASE_URL ausente ou inválida.')
    process.exit(1)
  }
  if (!SERVICE_ROLE_KEY) {
    console.error('\nERRO: SUPABASE_SERVICE_ROLE_KEY ausente.')
    process.exit(1)
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } })

  // ── 1. Upsert collections ───────────────────────────────────────────────
  console.log('\n▸ Upsert collections...')
  const categories = [...groups.keys()]
  const collectionRows = categories.map((cat, i) => ({
    slug: slugify(cat),
    name: titleCase(cat),
    description: null,
    image_url: null,
    position: i + 1,
  }))
  const { error: colErr } = await supabase.from('collections').upsert(collectionRows, { onConflict: 'slug' })
  if (colErr) { console.error('ERRO collections:', colErr.message); process.exit(1) }

  const { data: colData } = await supabase.from('collections').select('id, slug')
  const collectionBySlug = new Map<string, string>((colData ?? []).map((c: { id: string; slug: string }) => [c.slug, c.id]))
  console.log(`  ✓ ${collectionRows.length} collections`)

  // ── 2. Insert products (skip existing) ──────────────────────────────────
  console.log('\n▸ Insert products...')
  const { data: existingProducts } = await supabase.from('products').select('id, slug')
  const productIdBySlug = new Map<string, string>((existingProducts ?? []).map((p: { id: string; slug: string }) => [p.slug, p.id]))

  for (const [category, byProduct] of groups) {
    const collectionId = collectionBySlug.get(slugify(category))!
    for (const product of byProduct.keys()) {
      const slug = slugify(product)
      if (productIdBySlug.has(slug)) continue
      const { data, error } = await supabase.from('products')
        .insert({ slug, name: product, description: null, collection_id: collectionId, status: 'active', featured: false })
        .select('id, slug').single()
      if (error) { console.error(`ERRO produto "${product}":`, error.message); continue }
      productIdBySlug.set(slug, (data as { id: string }).id)
    }
  }
  console.log(`  ✓ ${productIdBySlug.size} produtos no total (novos + existentes)`)

  // ── 3. Insert variants (skip existing by product_id+name) ───────────────
  console.log('\n▸ Insert variants...')
  const { data: existingVariants } = await supabase.from('variants').select('id, product_id, name')
  const variantKey = (productId: string, name: string) => `${productId}::${name}`
  const variantIdByKey = new Map<string, string>(
    (existingVariants ?? []).map((v: { id: string; product_id: string; name: string }) => [variantKey(v.product_id, v.name), v.id])
  )

  for (const [, byProduct] of groups) {
    for (const [product, byVariant] of byProduct) {
      const productSlug = slugify(product)
      const productId = productIdBySlug.get(productSlug)
      if (!productId) continue
      let position = 1
      for (const variant of byVariant.keys()) {
        if (variant === '__product__') continue
        const key = variantKey(productId, variant)
        if (variantIdByKey.has(key)) { position++; continue }
        const sku = `JR-${slugify(product).toUpperCase().replace(/-/g, '_')}-${slugify(variant).toUpperCase().replace(/-/g, '_')}`
        const { data, error } = await supabase.from('variants')
          .insert({ product_id: productId, name: variant, price: 0, compare_price: null, sku, stock: 0, yampi_product_id: null, position })
          .select('id').single()
        if (error) { console.error(`ERRO variante "${product} / ${variant}":`, error.message); continue }
        variantIdByKey.set(key, (data as { id: string }).id)
        position++
      }
    }
  }
  console.log(`  ✓ ${variantIdByKey.size} variações no total (novas + existentes)`)

  // ── 4. Upload photos + insert images ─────────────────────────────────────
  console.log(`\n▸ Upload de ${totalImages} fotos + registros de imagem...`)
  const { data: existingImages } = await supabase.from('images').select('url')
  const existingUrls = new Set<string>((existingImages ?? []).map((i: { url: string }) => i.url))

  let uploaded = 0, skipped = 0, errors = 0
  for (const [category, byProduct] of groups) {
    const categorySlug = slugify(category)
    for (const [product, byVariant] of byProduct) {
      const productSlug = slugify(product)
      const productId = productIdBySlug.get(productSlug)
      if (!productId) continue

      for (const [variant, files] of byVariant) {
        const variantId = variant === '__product__' ? null : (variantIdByKey.get(variantKey(productId, variant)) ?? null)
        const variantSlug = variant === '__product__' ? 'geral' : slugify(variant)

        for (const file of files) {
          const storagePath = `${categorySlug}/${productSlug}/${variantSlug}/${file.position}${file.ext}`
          const buffer = readFileSync(file.fullPath)
          const { error: upErr } = await supabase.storage.from(BUCKET)
            .upload(storagePath, buffer, { contentType: MIME[file.ext], upsert: true })
          if (upErr) { errors++; console.log(`  ✗ ${storagePath}: ${upErr.message}`); continue }
          uploaded++

          const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath)
          const publicUrl = urlData.publicUrl
          if (existingUrls.has(publicUrl)) { skipped++; continue }

          const { error: imgErr } = await supabase.from('images').insert({
            product_id: productId,
            variant_id: variantId,
            url: publicUrl,
            alt: variant === '__product__' ? product : `${product} — ${variant}`,
            position: file.position,
          })
          if (imgErr) console.log(`  ✗ registro de imagem ${storagePath}: ${imgErr.message}`)
          process.stdout.write(`  ${uploaded + skipped}/${totalImages}\r`)
        }
      }
    }
  }

  console.log(`\n\n${'─'.repeat(60)}`)
  console.log('✓ Import completo!')
  console.log(`  Fotos enviadas       : ${uploaded}`)
  console.log(`  Já existentes (skip) : ${skipped}`)
  console.log(`  Erros                : ${errors}`)
  console.log('─'.repeat(60) + '\n')
}

main().catch((err: Error) => {
  console.error('\nFATAL:', err.message)
  process.exit(1)
})
