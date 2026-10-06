// Recalcula daily_analytics de um intervalo de dias (mesma função do cron
// analytics-refresh). Usar depois de recuperar pedidos com backfill-pedidos-yampi.
//
// Uso: npx tsx --env-file=.env.local scripts/recalcular-daily-analytics.mts --desde 2026-07-07 [--ate 2026-10-06]
import { createClient } from '@supabase/supabase-js'
import { refreshDailyAnalytics } from '@/lib/admin/daily-analytics'

const arg = (n: string) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : undefined }
const desde = arg('--desde')
const ate = arg('--ate') ?? new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
if (!desde) throw new Error('Informe --desde AAAA-MM-DD')

const dates: string[] = []
for (let d = new Date(`${desde}T12:00:00Z`); d.toISOString().slice(0, 10) <= ate; d.setUTCDate(d.getUTCDate() + 1)) {
  dates.push(d.toISOString().slice(0, 10))
}
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
const results = await refreshDailyAnalytics(db, dates)
const falhas = results.filter((r: any) => r.ok === false || r.error)
console.log(`Dias recalculados: ${results.length} de ${dates.length} · falhas: ${falhas.length}`)
falhas.slice(0, 5).forEach((f) => console.log(JSON.stringify(f)))
