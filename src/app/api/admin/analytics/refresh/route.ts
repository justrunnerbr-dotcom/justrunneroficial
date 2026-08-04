import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { refreshDailyAnalytics } from '@/lib/admin/daily-analytics'
import { checkAuth } from '@/lib/admin/auth'

const TZ = 'America/Sao_Paulo'

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

  const results = await refreshDailyAnalytics(db, dates)

  return NextResponse.json({ ok: true, results })
}
