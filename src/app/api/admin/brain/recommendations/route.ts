import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'

const JHF_STORE_ID = 'b0000000-0000-0000-0000-000000000001'

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

// GET — return open recommendations with their signals
export async function GET() {
  if (!await checkAuth()) return NextResponse.json({ ok: false }, { status: 401 })
  const db = getDb()

  const { data, error } = await db
    .from('brain_recommendations')
    .select(`*, signal:brain_signals(signal_type, severity, metric_name, current_value, baseline_value, delta_pct, detected_at)`)
    .eq('store_id', JHF_STORE_ID)
    .in('status', ['open', 'acknowledged'])
    .order('created_at', { ascending: false })
    .limit(10)

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, data })
}
