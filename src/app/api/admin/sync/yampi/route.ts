import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import { upsertYampiOrder, type YampiOrderResource } from '@/lib/yampi/sync'

async function checkAuth() {
  const cookieStore = await cookies()
  const token  = cookieStore.get('jhf_admin')?.value
  const secret = process.env.ADMIN_SECRET
  return !!secret && token === secret
}

function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  )
}

async function fetchYampiPage(
  alias: string,
  token: string,
  secretKey: string,
  page: number,
): Promise<{ data: YampiOrderResource['data'][]; meta?: { pagination?: { total_pages?: number } } }> {
  const url = `https://api.dooki.com.br/v2/${alias}/orders?include=customer,items&per_page=50&page=${page}`
  const res = await fetch(url, {
    headers: {
      'User-Token':      token,
      'User-Secret-Key': secretKey,
      'Content-Type':    'application/json',
    },
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`Yampi API error ${res.status}`)
  return res.json()
}

export async function POST(request: Request) {
  if (!await checkAuth()) return NextResponse.json({ ok: false }, { status: 401 })

  const alias     = process.env.YAMPI_ALIAS
  const token     = process.env.YAMPI_API_TOKEN
  const secretKey = process.env.YAMPI_SECRET_KEY
  if (!alias || !token || !secretKey) {
    return NextResponse.json({ ok: false, error: 'YAMPI_ALIAS, YAMPI_API_TOKEN or YAMPI_SECRET_KEY not configured' }, { status: 500 })
  }

  const body = await request.json().catch(() => ({}))
  const maxPages: number = body.pages ?? 5

  const db = getDb()
  let synced         = 0
  let skipped_legacy = 0
  let errors         = 0
  let checked        = 0

  try {
    for (let page = 1; page <= maxPages; page++) {
      const result = await fetchYampiPage(alias, token, secretKey, page)
      const orders = Array.isArray(result.data) ? result.data : []
      if (orders.length === 0) break

      for (const order of orders) {
        checked++
        const r = await upsertYampiOrder(db, { data: order })
        if (r.skipped)    { skipped_legacy++ }
        else if (r.ok)    { synced++ }
        else              { errors++ }
      }

      const lastPage = result.meta?.pagination?.total_pages ?? 1
      if (page >= lastPage) break
    }

    return NextResponse.json({ ok: true, checked, synced, skipped_legacy, errors })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown'
    return NextResponse.json({ ok: false, error: msg, checked, synced, skipped_legacy, errors }, { status: 500 })
  }
}
