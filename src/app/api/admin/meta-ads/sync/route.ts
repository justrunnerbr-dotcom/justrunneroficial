import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { syncMetaInsights } from '@/lib/admin/meta-ads'
import { checkAuth } from '@/lib/admin/auth'

function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  )
}

export async function POST(request: Request) {
  if (!(await checkAuth())) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const today = new Date().toISOString().slice(0, 10)
  const since = body.since ?? (() => {
    const d = new Date()
    d.setDate(d.getDate() - 7)
    return d.toISOString().slice(0, 10)
  })()
  const until = body.until ?? today

  const db     = getDb()
  const result = await syncMetaInsights(db, since, until)

  return NextResponse.json(result, { status: result.ok ? 200 : 500 })
}
