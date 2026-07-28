import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { refreshDailyAnalytics } from '@/lib/admin/daily-analytics'

const TZ = 'America/Sao_Paulo'

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

  // Por padrão recalcula hoje e ontem (é o que o cron diário precisa). Aceita
  // `?dates=2026-07-21,2026-07-22` para backfill manual: quando o sync de
  // pedidos fica fora do ar por alguns dias, os pedidos recuperados depois não
  // aparecem no dashboard sem recalcular os dias afetados — e já aconteceu
  // duas vezes (15/07 e 27/07).
  const datesParam = new URL(request.url).searchParams.get('dates')
  const dates = datesParam
    ? datesParam.split(',').map((d) => d.trim()).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
    : [0, 1].map((daysAgo) => {
        const d = new Date()
        d.setDate(d.getDate() - daysAgo)
        return d.toLocaleDateString('en-CA', { timeZone: TZ })
      })

  if (dates.length === 0) {
    return NextResponse.json({ ok: false, error: 'nenhuma data válida em ?dates' }, { status: 400 })
  }

  const results = await refreshDailyAnalytics(db, dates)

  return NextResponse.json({ ok: true, results })
}
