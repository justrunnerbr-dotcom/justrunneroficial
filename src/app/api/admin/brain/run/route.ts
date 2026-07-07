import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import { detectAnomalies, saveSignal } from '@/lib/brain/anomaly-detector'
import { generateHypothesis, saveRecommendation } from '@/lib/brain/hypothesis-generator'

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

// POST — detect anomalies, generate hypotheses, save everything
export async function POST() {
  if (!await checkAuth()) return NextResponse.json({ ok: false }, { status: 401 })

  const db = getDb()

  // 1. Detect
  const signals = await detectAnomalies(db)

  if (signals.length === 0) {
    return NextResponse.json({ ok: true, signals: 0, recommendations: 0, message: 'Nenhuma anomalia detectada.' })
  }

  const results = []

  // 2. For each signal: save + generate hypothesis + save recommendation
  for (const signal of signals) {
    const signalId = await saveSignal(db, signal)
    const rec      = await generateHypothesis(signal)
    const recId    = await saveRecommendation(db, signalId, rec)

    results.push({
      signal_type: signal.signal_type,
      severity:    signal.severity,
      delta_pct:   signal.delta_pct,
      title:       rec.title,
      priority:    rec.priority,
      signal_id:   signalId,
      rec_id:      recId,
    })
  }

  return NextResponse.json({ ok: true, signals: signals.length, recommendations: results.length, results })
}
