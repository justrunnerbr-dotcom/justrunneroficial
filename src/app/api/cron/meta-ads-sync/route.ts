import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { syncMetaInsights } from '@/lib/admin/meta-ads'

function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  )
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }

  const today = new Date().toISOString().slice(0, 10)
  const since7 = (() => {
    const d = new Date()
    d.setDate(d.getDate() - 7)
    return d.toISOString().slice(0, 10)
  })()

  const db     = getDb()
  const result = await syncMetaInsights(db, since7, today)

  return NextResponse.json({ ok: result.ok, count: result.count, synced: today })
}
