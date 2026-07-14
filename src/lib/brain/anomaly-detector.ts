import { SupabaseClient } from '@supabase/supabase-js'

const JHF_STORE_ID = 'b0000000-0000-0000-0000-000000000001'
const TZ = 'America/Sao_Paulo'

function brlDate(daysAgo = 0): string {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  return d.toLocaleDateString('en-CA', { timeZone: TZ })
}

export type SignalType = 'conversion_drop' | 'revenue_drop' | 'traffic_drop'
export type Severity   = 'low' | 'medium' | 'high' | 'critical'

export interface Signal {
  signal_type:    SignalType
  severity:       Severity
  metric_name:    string
  current_value:  number
  baseline_value: number
  delta_pct:      number
  context:        Record<string, unknown>
}

function severity(deltaPct: number): Severity {
  const drop = Math.abs(deltaPct)
  if (drop >= 60) return 'critical'
  if (drop >= 40) return 'high'
  if (drop >= 20) return 'medium'
  return 'low'
}

// ─── Conversion Drop Detector ────────────────────────────────────────────────
// current  = avg conversion_rate over last 3 days with data
// baseline = avg conversion_rate over days 4-10 (one week prior)
// signal fires when current < baseline * 0.80 (≥20% drop)
async function detectConversionDrop(db: SupabaseClient): Promise<Signal | null> {
  const [recentRows, baselineRows] = await Promise.all([
    db.from('daily_analytics')
      .select('date, conversion_rate, sessions, orders')
      .eq('store_id', JHF_STORE_ID)
      .gte('date', brlDate(3))
      .lte('date', brlDate(0))
      .gt('sessions', 0),

    db.from('daily_analytics')
      .select('date, conversion_rate, sessions, orders')
      .eq('store_id', JHF_STORE_ID)
      .gte('date', brlDate(10))
      .lt('date',  brlDate(3))
      .gt('sessions', 0),
  ])

  const recent   = recentRows.data   ?? []
  const baseline = baselineRows.data ?? []

  if (recent.length === 0 || baseline.length === 0) return null

  const avg = (rows: typeof recent): number => {
    const vals = rows.map((r) => parseFloat(String(r.conversion_rate ?? 0))).filter((v) => v > 0)
    return vals.length > 0 ? vals.reduce((s, v) => s + v, 0) / vals.length : 0
  }

  const currentRate  = avg(recent)
  const baselineRate = avg(baseline)

  if (baselineRate === 0) return null

  const recentTotals = recent.reduce(
    (acc, r) => ({ sessions: acc.sessions + (r.sessions ?? 0), orders: acc.orders + (r.orders ?? 0) }),
    { sessions: 0, orders: 0 },
  )

  // Complete crash: sessions exist but zero conversions in all recent days
  if (currentRate === 0) {
    if (recentTotals.sessions === 0) return null
    return {
      signal_type:    'conversion_drop',
      severity:       'critical' as Severity,
      metric_name:    'conversion_rate',
      current_value:  0,
      baseline_value: baselineRate,
      delta_pct:      -100,
      context: {
        recent_sessions: recentTotals.sessions,
        recent_orders:   0,
        recent_days:     recent.length,
        baseline_days:   baseline.length,
        recent_dates:    recent.map((r) => r.date),
        baseline_dates:  baseline.map((r) => r.date),
      },
    }
  }

  const deltaPct = ((currentRate - baselineRate) / baselineRate) * 100
  if (deltaPct > -20) return null  // less than 20% drop — not anomalous

  return {
    signal_type:    'conversion_drop',
    severity:       severity(deltaPct),
    metric_name:    'conversion_rate',
    current_value:  currentRate,
    baseline_value: baselineRate,
    delta_pct:      Math.round(deltaPct * 100) / 100,
    context: {
      recent_sessions:  recentTotals.sessions,
      recent_orders:    recentTotals.orders,
      recent_days:      recent.length,
      baseline_days:    baseline.length,
      recent_dates:     recent.map((r) => r.date),
      baseline_dates:   baseline.map((r) => r.date),
    },
  }
}

// ─── Revenue Drop Detector ───────────────────────────────────────────────────
// current  = sum revenue last 3 days
// baseline = avg(daily revenue, days 4-10)
async function detectRevenueDrop(db: SupabaseClient): Promise<Signal | null> {
  const [recentRows, baselineRows] = await Promise.all([
    db.from('daily_analytics')
      .select('date, revenue, orders')
      .eq('store_id', JHF_STORE_ID)
      .gte('date', brlDate(3))
      .lte('date', brlDate(0)),

    db.from('daily_analytics')
      .select('date, revenue, orders')
      .eq('store_id', JHF_STORE_ID)
      .gte('date', brlDate(10))
      .lt('date',  brlDate(3)),
  ])

  const recent   = recentRows.data   ?? []
  const baseline = baselineRows.data ?? []

  if (recent.length < 2 || baseline.length < 3) return null

  const avgRevenue = (rows: typeof recent): number => {
    const vals = rows.map((r) => parseFloat(String(r.revenue ?? 0)))
    return vals.reduce((s, v) => s + v, 0) / vals.length
  }

  const currentAvg  = avgRevenue(recent)
  const baselineAvg = avgRevenue(baseline)

  if (baselineAvg === 0) return null

  const deltaPct = ((currentAvg - baselineAvg) / baselineAvg) * 100
  if (deltaPct > -30) return null  // less than 30% drop — normal variance

  return {
    signal_type:    'revenue_drop',
    severity:       severity(deltaPct),
    metric_name:    'daily_revenue',
    current_value:  currentAvg,
    baseline_value: baselineAvg,
    delta_pct:      Math.round(deltaPct * 100) / 100,
    context: {
      recent_total_revenue:   recent.reduce((s, r) => s + parseFloat(String(r.revenue ?? 0)), 0),
      baseline_avg_revenue:   baselineAvg,
      recent_days:            recent.length,
    },
  }
}

// ─── Traffic Drop Detector ───────────────────────────────────────────────────
async function detectTrafficDrop(db: SupabaseClient): Promise<Signal | null> {
  const [recentRows, baselineRows] = await Promise.all([
    db.from('daily_analytics')
      .select('date, sessions')
      .eq('store_id', JHF_STORE_ID)
      .gte('date', brlDate(3))
      .lte('date', brlDate(0)),

    db.from('daily_analytics')
      .select('date, sessions')
      .eq('store_id', JHF_STORE_ID)
      .gte('date', brlDate(10))
      .lt('date',  brlDate(3)),
  ])

  const recent   = recentRows.data   ?? []
  const baseline = baselineRows.data ?? []

  if (recent.length < 2 || baseline.length < 3) return null

  const avgSessions = (rows: typeof recent): number => {
    const vals = rows.map((r) => r.sessions ?? 0)
    return vals.reduce((s, v) => s + v, 0) / vals.length
  }

  const currentAvg  = avgSessions(recent)
  const baselineAvg = avgSessions(baseline)

  if (baselineAvg === 0) return null

  const deltaPct = ((currentAvg - baselineAvg) / baselineAvg) * 100
  if (deltaPct > -30) return null

  return {
    signal_type:    'traffic_drop',
    severity:       severity(deltaPct),
    metric_name:    'daily_sessions',
    current_value:  currentAvg,
    baseline_value: baselineAvg,
    delta_pct:      Math.round(deltaPct * 100) / 100,
    context: {
      recent_total_sessions:   recent.reduce((s, r) => s + (r.sessions ?? 0), 0),
      baseline_avg_sessions:   baselineAvg,
    },
  }
}

// ─── Run all detectors, return highest-severity signal ────────────────────────

export async function detectAnomalies(db: SupabaseClient): Promise<Signal[]> {
  const [conversion, revenue, traffic] = await Promise.all([
    detectConversionDrop(db),
    detectRevenueDrop(db),
    detectTrafficDrop(db),
  ])

  const severityOrder: Record<Severity, number> = { critical: 4, high: 3, medium: 2, low: 1 }

  return [conversion, revenue, traffic]
    .filter((s): s is Signal => s !== null)
    .sort((a, b) => severityOrder[b.severity] - severityOrder[a.severity])
}

// ─── Persist signal ───────────────────────────────────────────────────────────

export async function saveSignal(db: SupabaseClient, signal: Signal): Promise<string> {
  const { data, error } = await db.from('brain_signals').insert({
    store_id:       JHF_STORE_ID,
    signal_type:    signal.signal_type,
    severity:       signal.severity,
    metric_name:    signal.metric_name,
    current_value:  signal.current_value,
    baseline_value: signal.baseline_value,
    delta_pct:      signal.delta_pct,
    context:        signal.context,
  }).select('id').single()

  if (error) throw new Error(`saveSignal: ${error.message}`)
  return data.id
}
