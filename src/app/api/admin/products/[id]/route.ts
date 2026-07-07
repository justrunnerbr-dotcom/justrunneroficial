import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { getAdminSupabase } from '@/lib/admin-client'
import { getYampiCredentialsFromEnv, syncVariantNamesForProduct, logYampiCatalogSync } from '@/lib/yampi/catalog'

// Worst case is 20 variants on one product, each needing a GET+PUT round trip
// to Yampi (see syncVariantNamesForProduct) — give that room to finish.
export const maxDuration = 30

async function checkAuth() {
  const cookieStore = await cookies()
  const token  = cookieStore.get('jhf_admin')?.value
  const secret = process.env.ADMIN_SECRET
  return !!secret && token === secret
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await checkAuth())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body   = await request.json()

  // Only allow safe product fields to be updated.
  // 'slug' is intentionally excluded — changing it would break already-published
  // ad/SEO links pointing at /produto/[slug].
  const allowed = ['name', 'description', 'status', 'featured', 'collection_id']
  const updates: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) updates[key] = body[key]
  }

  const db = getAdminSupabase()

  // The admin form always submits every field on every save, so 'name' in
  // updates is true even when only e.g. `featured` changed. Read the current
  // name first so an unrelated save doesn't trigger a full Yampi resync of
  // every variant under this product.
  let previousName: string | null = null
  if ('name' in updates) {
    const { data: current } = await db.from('products').select('name').eq('id', id).maybeSingle()
    previousName = current?.name ?? null
  }

  const { data, error } = await db
    .from('products')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*, collection:collections(slug)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  revalidatePath(`/produto/${data.slug}`)
  if (data.collection?.slug) revalidatePath(`/colecao/${data.collection.slug}`)
  revalidatePath('/')

  const nameChanged = 'name' in updates && previousName !== null && previousName !== data.name
  let yampi: { attempted: boolean; synced?: number; failed?: number; errors?: string[] } = { attempted: false }

  if (nameChanged) {
    const { data: variantRows } = await db
      .from('variants')
      .select('id, name, yampi_product_id')
      .eq('product_id', id)
      .not('yampi_product_id', 'is', null)

    const variants = (variantRows ?? []).filter(
      (v): v is { id: string; name: string; yampi_product_id: string } => !!v.yampi_product_id,
    )

    if (variants.length > 0) {
      const creds = getYampiCredentialsFromEnv()

      if (creds) {
        const startedAt = new Date().toISOString()
        const { synced, failed, results } = await syncVariantNamesForProduct(
          creds,
          data.name,
          variants.map((v) => ({ id: v.id, name: v.name, yampiSkuId: v.yampi_product_id })),
        )
        const finishedAt = new Date().toISOString()

        await Promise.all(
          results.map((r) =>
            logYampiCatalogSync(db, {
              variantId:      r.variantId ?? null,
              productId:      id,
              yampiSkuId:     r.yampiSkuId,
              yampiProductId: r.yampiProductId ?? null,
              field:          'product_name',
              status:         r.ok ? 'success' : 'error',
              newValue:       r.newName ?? null,
              errorMessage:   r.error ?? null,
              startedAt,
              finishedAt,
            }),
          ),
        )

        yampi = {
          attempted: true,
          synced,
          failed,
          errors: results.filter((r) => !r.ok).map((r) => r.error ?? 'unknown error'),
        }
      } else {
        yampi = { attempted: true, synced: 0, failed: variants.length, errors: ['Yampi credentials not configured'] }
      }
    }
  }

  return NextResponse.json({ ...data, yampi })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await checkAuth())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const db = getAdminSupabase()
  const { error } = await db.from('products').delete().eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
