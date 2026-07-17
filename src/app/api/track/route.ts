import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const STORE_ID = 'b0000000-0000-0000-0000-000000000001'

function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  )
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      session_id, visitor_id, event_type, page,
      product_slug, product_id, variant_id,
      value, properties, device, referrer,
      utm_source, utm_medium, utm_campaign,
    } = body

    if (!session_id || !event_type) {
      return NextResponse.json({ ok: false }, { status: 400 })
    }

    const db = getDb()
    const now = new Date().toISOString()

    await Promise.allSettled([
      db.from('events').insert({
        store_id: STORE_ID,
        session_id,
        visitor_id: visitor_id || null,
        event_type,
        page: page || null,
        product_slug: product_slug || null,
        product_id:   product_id   || null,
        variant_id:   variant_id   || null,
        value:        value        ?? null,
        properties:   properties   ?? {},
        device:       device       || null,
        referrer:     referrer     || null,
        utm_source:   utm_source   || null,
        utm_medium:   utm_medium   || null,
        utm_campaign: utm_campaign || null,
      }),

      db.from('sessions').upsert(
        {
          id:           session_id,
          store_id:     STORE_ID,
          visitor_id:   visitor_id || null,
          device:       device     || null,
          referrer:     referrer   || null,
          utm_source:   utm_source   || null,
          utm_medium:   utm_medium   || null,
          utm_campaign: utm_campaign || null,
          landing_page: event_type === 'page_view' ? page : undefined,
          started_at:   now,
        },
        { onConflict: 'id', ignoreDuplicates: true },
      ),

      db.from('live_visitors').upsert(
        {
          session_id,
          store_id:     STORE_ID,
          page:         page         || null,
          product_slug: product_slug || null,
          device:       device       || null,
          last_seen:    now,
        },
        { onConflict: 'session_id' },
      ),
    ])

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
