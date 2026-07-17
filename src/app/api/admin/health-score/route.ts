import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import { calculateHealthScore, saveHealthScore } from '@/lib/brain/health-score'

const STORE_ID = 'b0000000-0000-0000-0000-000000000001'

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

// GET — last saved score
export async function GET() {
  if (!await checkAuth()) return NextResponse.json({ ok: false }, { status: 401 })
  const db = getDb()
  const { data } = await db
    .from('health_scores')
    .select('*')
    .eq('store_id', STORE_ID)
    .order('calculated_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return NextResponse.json({ ok: true, data })
}

// POST — recalculate and save
export async function POST() {
  if (!await checkAuth()) return NextResponse.json({ ok: false }, { status: 401 })
  const db = getDb()
  const result = await calculateHealthScore(db)
  await saveHealthScore(db, result)
  return NextResponse.json({ ok: true, data: result })
}
