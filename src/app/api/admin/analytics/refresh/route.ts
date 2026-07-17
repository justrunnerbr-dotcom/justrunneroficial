import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import { refreshDailyAnalytics } from '@/lib/admin/daily-analytics'

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

  const results = await refreshDailyAnalytics(db, dates)

  return NextResponse.json({ ok: true, results })
}
