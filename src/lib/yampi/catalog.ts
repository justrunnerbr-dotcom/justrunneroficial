import type { SupabaseClient } from '@supabase/supabase-js'

const STORE_ID = 'b0000000-0000-0000-0000-000000000001'

export interface YampiCredentials {
  alias: string
  token: string
  secretKey: string
}

export function getYampiCredentialsFromEnv(): YampiCredentials | null {
  const alias     = process.env.NEXT_PUBLIC_YAMPI_ALIAS
  const token     = process.env.YAMPI_API_TOKEN
  const secretKey = process.env.YAMPI_SECRET_KEY
  if (!alias || !token || !secretKey) return null
  return { alias, token, secretKey }
}

// Mirrors productName() in scripts/create-site-oficial.js (line 72-73), which
// originally used an em dash separator — live Yampi data shows it's actually
// stored with 3 plain spaces (confirmed byte-for-byte 2026-07-01), so new
// syncs must match what's already live rather than the original script source.
export function yampiProductName(productName: string, variantName: string): string {
  return `[SO] ${productName}   ${variantName}`
}

function yampiHeaders(creds: YampiCredentials): Record<string, string> {
  return {
    'User-Token':      creds.token,
    'User-Secret-Key': creds.secretKey,
    'Content-Type':    'application/json',
  }
}

function yampiBaseUrl(creds: YampiCredentials): string {
  return `https://api.dooki.com.br/v2/${creds.alias}`
}

interface YampiSkuProductInfo {
  productId:   number
  active:      boolean
  simple:      boolean
  brandId:     number | null
  categoryIds: number[]
}

// variants.yampi_product_id is actually a Yampi SKU id, not a product id — the
// editable `name` field lives on the parent product, so every sync starts by
// resolving sku -> product. `include=product.brand,product.categories` gets
// everything needed for the follow-up PUT in this one call.
async function getYampiSkuProduct(
  creds: YampiCredentials,
  yampiSkuId: string,
): Promise<{ ok: true; info: YampiSkuProductInfo } | { ok: false; error: string }> {
  try {
    const url = `${yampiBaseUrl(creds)}/catalog/skus/${yampiSkuId}?include=product.brand,product.categories`
    const res = await fetch(url, { headers: yampiHeaders(creds), cache: 'no-store' })
    if (!res.ok) return { ok: false, error: `GET sku ${yampiSkuId} failed: ${res.status}` }

    const json = await res.json()
    const product = json?.data?.product?.data
    if (!product) return { ok: false, error: `GET sku ${yampiSkuId}: response had no product` }

    const categoryIds: number[] = Array.isArray(product.categories?.data)
      ? product.categories.data.map((c: { id: number }) => c.id)
      : []

    return {
      ok: true,
      info: {
        productId:   product.id,
        active:      !!product.active,
        simple:      !!product.simple,
        brandId:     product.brand?.data?.id ?? null,
        categoryIds,
      },
    }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'unknown error fetching sku' }
  }
}

// Yampi's product PUT requires simple/brand_id/active/name on every call (not a
// true partial update). brand_id and categories_ids are re-sent explicitly too,
// even though Yampi's docs say omitted optional fields are preserved — cheap
// insurance against silently clearing a product's brand/category.
async function putYampiProductName(
  creds: YampiCredentials,
  info: YampiSkuProductInfo,
  name: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const url = `${yampiBaseUrl(creds)}/catalog/products/${info.productId}`
    const body: Record<string, unknown> = {
      simple: info.simple,
      active: info.active,
      name,
    }
    if (info.brandId != null)        body.brand_id       = info.brandId
    if (info.categoryIds.length > 0) body.categories_ids = info.categoryIds

    const res = await fetch(url, {
      method:  'PUT',
      headers: yampiHeaders(creds),
      body:    JSON.stringify(body),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      return { ok: false, error: `PUT product ${info.productId} failed: ${res.status}${text ? ` ${text}` : ''}` }
    }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'unknown error updating product' }
  }
}

export interface YampiSyncOutcome {
  ok: boolean
  yampiSkuId: string
  yampiProductId?: number
  variantId?: string
  newName?: string
  error?: string
}

// Never throws — always resolves to an outcome object, so callers can treat
// Yampi sync as strictly best-effort and never let it fail a local save.
export async function syncVariantNameToYampi(
  creds: YampiCredentials,
  params: { yampiSkuId: string; productName: string; variantName: string; variantId?: string },
): Promise<YampiSyncOutcome> {
  const { yampiSkuId, productName, variantName, variantId } = params
  const newName = yampiProductName(productName, variantName)

  const resolved = await getYampiSkuProduct(creds, yampiSkuId)
  if (!resolved.ok) {
    return { ok: false, yampiSkuId, variantId, newName, error: resolved.error }
  }

  const put = await putYampiProductName(creds, resolved.info, newName)
  if (!put.ok) {
    return { ok: false, yampiSkuId, yampiProductId: resolved.info.productId, variantId, newName, error: put.error }
  }

  return { ok: true, yampiSkuId, yampiProductId: resolved.info.productId, variantId, newName }
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let next = 0

  async function worker() {
    while (next < items.length) {
      const i = next++
      results[i] = await fn(items[i])
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return results
}

export const DEFAULT_SYNC_CONCURRENCY = 5

// Used when a product's name changes — every one of its variants is its own
// independent Yampi product and needs its composite name recomputed.
export async function syncVariantNamesForProduct(
  creds: YampiCredentials,
  productName: string,
  variants: Array<{ id: string; name: string; yampiSkuId: string }>,
  concurrency: number = DEFAULT_SYNC_CONCURRENCY,
): Promise<{ synced: number; failed: number; results: YampiSyncOutcome[] }> {
  const results = await mapWithConcurrency(variants, concurrency, (v) =>
    syncVariantNameToYampi(creds, {
      yampiSkuId:  v.yampiSkuId,
      productName,
      variantName: v.name,
      variantId:   v.id,
    }),
  )
  const synced = results.filter((r) => r.ok).length
  return { synced, failed: results.length - synced, results }
}

export interface YampiCatalogSyncLogEntry {
  variantId?: string | null
  productId?: string | null
  yampiSkuId?: string | null
  yampiProductId?: number | null
  field: 'variant_name' | 'product_name'
  status: 'success' | 'error'
  newValue?: string | null
  errorMessage?: string | null
  startedAt: string
  finishedAt: string
}

// Best-effort audit trail so drift is debuggable even when nobody was watching
// the admin UI at the time. Mirrors the meta_sync_logs insert pattern in
// syncMetaInsights() (src/lib/admin/meta-ads.ts) — its own try/catch, never
// lets a logging failure surface to the caller.
export async function logYampiCatalogSync(
  db: SupabaseClient,
  entry: YampiCatalogSyncLogEntry,
): Promise<void> {
  try {
    await db.from('yampi_catalog_sync_logs').insert({
      store_id:         STORE_ID,
      variant_id:       entry.variantId ?? null,
      product_id:       entry.productId ?? null,
      yampi_sku_id:     entry.yampiSkuId ?? null,
      yampi_product_id: entry.yampiProductId != null ? String(entry.yampiProductId) : null,
      field:            entry.field,
      status:           entry.status,
      new_value:        entry.newValue ?? null,
      error_message:    entry.errorMessage ?? null,
      started_at:       entry.startedAt,
      finished_at:      entry.finishedAt,
    })
  } catch {
    // logging is best-effort only
  }
}
