import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { getAdminSupabase } from '@/lib/admin-client'
import { getYampiCredentialsFromEnv, syncVariantNameToYampi, logYampiCatalogSync } from '@/lib/yampi/catalog'

async function checkAuth() {
  const cookieStore = await cookies()
  const token  = cookieStore.get('jhf_admin')?.value
  const secret = process.env.ADMIN_SECRET
  return !!secret && token === secret
}

// Only these fields may ever be updated from the client. Price, SKU, stock,
// Yampi IDs and the internal id are never accepted here — Yampi/checkout/
// tracking depend on them staying exactly as synced.
const EDITABLE_FIELDS = ['name', 'position'] as const

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await checkAuth())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body   = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Corpo da requisição inválido.' }, { status: 400 })
  }

  const updates: Record<string, unknown> = {}
  for (const key of EDITABLE_FIELDS) {
    if (key in body) updates[key] = (body as Record<string, unknown>)[key]
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nenhum campo válido para atualizar.' }, { status: 400 })
  }

  if ('name' in updates) {
    if (typeof updates.name !== 'string' || !updates.name.trim()) {
      return NextResponse.json({ error: 'Nome não pode ser vazio.' }, { status: 400 })
    }
    updates.name = updates.name.trim().slice(0, 200)
  }

  if ('position' in updates) {
    const pos = Number(updates.position)
    if (!Number.isFinite(pos)) {
      return NextResponse.json({ error: 'Ordem inválida.' }, { status: 400 })
    }
    updates.position = pos
  }

  const db = getAdminSupabase()

  // Read the current name before writing — the frontend always sends
  // name+position together, so without this a position-only reorder would
  // look identical to a real rename and trigger a spurious Yampi sync.
  let previousName: string | null = null
  if ('name' in updates) {
    const { data: current } = await db.from('variants').select('name').eq('id', id).maybeSingle()
    previousName = current?.name ?? null
  }

  const { data, error } = await db
    .from('variants')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*, product:products(name, slug, collection:collections(slug))')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  const productSlug    = data.product?.slug as string | undefined
  const collectionSlug = data.product?.collection?.slug as string | undefined

  if (productSlug)    revalidatePath(`/produto/${productSlug}`)
  if (collectionSlug) revalidatePath(`/colecao/${collectionSlug}`)
  revalidatePath('/')

  const nameChanged = 'name' in updates && previousName !== null && previousName !== data.name
  let yampi: { attempted: boolean; ok?: boolean; error?: string } = { attempted: false }

  if (nameChanged && data.yampi_product_id && data.product?.name) {
    const creds = getYampiCredentialsFromEnv()
    if (creds) {
      const startedAt = new Date().toISOString()
      const outcome = await syncVariantNameToYampi(creds, {
        yampiSkuId:  data.yampi_product_id,
        productName: data.product.name,
        variantName: data.name,
        variantId:   data.id,
      })
      yampi = { attempted: true, ok: outcome.ok, error: outcome.error }
      await logYampiCatalogSync(db, {
        variantId:      data.id,
        productId:      data.product_id,
        yampiSkuId:     data.yampi_product_id,
        yampiProductId: outcome.yampiProductId ?? null,
        field:          'variant_name',
        status:         outcome.ok ? 'success' : 'error',
        newValue:       outcome.newName ?? null,
        errorMessage:   outcome.error ?? null,
        startedAt,
        finishedAt:     new Date().toISOString(),
      })
    } else {
      yampi = { attempted: true, ok: false, error: 'Yampi credentials not configured' }
    }
  }

  return NextResponse.json({ ...data, yampi })
}
