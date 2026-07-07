import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { calculateHealthScore, saveHealthScore } from '@/lib/brain/health-score'

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

  const db = getDb()
  const result = await calculateHealthScore(db)
  await saveHealthScore(db, result)

  return NextResponse.json({ ok: true, score: result.score })
}
