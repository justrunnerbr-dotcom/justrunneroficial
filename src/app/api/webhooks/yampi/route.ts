import { createHmac } from 'crypto'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { upsertYampiOrder } from '@/lib/yampi/sync'

function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  )
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.text()

    const secret = process.env.YAMPI_SECRET_KEY
    if (secret) {
      const sig      = request.headers.get('x-yampi-hmac-sha256') ?? ''
      const expected = createHmac('sha256', secret).update(rawBody).digest('hex')
      if (sig !== expected) {
        return NextResponse.json({ ok: false }, { status: 401 })
      }
    }

    const body     = JSON.parse(rawBody)
    const resource = body?.resource
    if (!resource?.data?.id) {
      return NextResponse.json({ ok: true, skipped: true })
    }

    const db = getDb()
    const result = await upsertYampiOrder(db, resource, { fireCapiEvents: true })
    if (result.skipped) {
      return NextResponse.json({ ok: true, skipped: true, reason: 'legacy_order' })
    }
    return NextResponse.json(result)
  } catch (err) {
    console.error('[yampi-webhook]', err)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
