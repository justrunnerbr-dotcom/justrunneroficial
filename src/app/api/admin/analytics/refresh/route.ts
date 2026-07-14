import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'

const JHF_STORE_ID = 'b0000000-0000-0000-0000-000000000001'
const TZ = 'America/Sao_Paulo'

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

export async function POST() {
  if (!await checkAuth()) return NextResponse.json({ ok: false }, { status: 401 })

  const db = getDb()

  // Refresh today and yesterday
  const dates = [0, 1].map((daysAgo) => {
    const d = new Date()
    d.setDate(d.getDate() - daysAgo)
    return d.toLocaleDateString('en-CA', { timeZone: TZ })
  })

  const results = []

  for (const date of dates) {
    const dayStart = `${date}T00:00:00-03:00`
    const dayEnd   = new Date(new Date(`${date}T00:00:00-03:00`).getTime() + 86400000).toISOString()

    const [sessionsRes, eventsRes, ordersRes] = await Promise.all([
      db.from('sessions')
        .select('id, visitor_id')
        .eq('store_id', JHF_STORE_ID)
        .gte('started_at', dayStart)
        .lt('started_at',  dayEnd),

      db.from('events')
        .select('event_type')
        .eq('store_id', JHF_STORE_ID)
        .gte('created_at', dayStart)
        .lt('created_at',  dayEnd),

      db.from('orders')
        .select('total')
        .eq('store_id', JHF_STORE_ID)
        .in('status', ['paid', 'invoiced', 'on_carriage', 'payment_confirmed', 'preparing_shipping', 'in_separation', 'in_transit', 'delivered'])
        .gte('created_at', dayStart)
        .lt('created_at',  dayEnd),
    ])

    const sessions = sessionsRes.data ?? []
    const events   = eventsRes.data ?? []
    const orders   = ordersRes.data ?? []

    const sessionCount  = sessions.length
    const uniqueVisitors = new Set(sessions.map((s) => s.visitor_id).filter(Boolean)).size
    const pageViews     = events.filter((e) => e.event_type === 'page_view').length
    const productViews  = events.filter((e) => e.event_type === 'view_content').length
    const addToCarts    = events.filter((e) => e.event_type === 'add_to_cart').length
    const checkouts     = events.filter((e) => e.event_type === 'initiate_checkout').length
    const orderCount    = orders.length
    const revenue       = orders.reduce((sum, o) => sum + parseFloat(String(o.total)), 0)
    const aov           = orderCount > 0 ? revenue / orderCount : 0
    const convRate      = sessionCount > 0 ? orderCount / sessionCount : 0

    await db.from('daily_analytics').upsert(
      {
        store_id:        JHF_STORE_ID,
        date,
        sessions:        sessionCount,
        unique_visitors: uniqueVisitors,
        page_views:      pageViews,
        product_views:   productViews,
        add_to_carts:    addToCarts,
        checkout_starts: checkouts,
        orders:          orderCount,
        revenue,
        avg_order_value: aov,
        conversion_rate: convRate,
      },
      { onConflict: 'store_id,date' },
    )

    results.push({ date, sessions: sessionCount, orders: orderCount, revenue })
  }

  return NextResponse.json({ ok: true, results })
}
