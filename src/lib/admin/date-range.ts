const TZ = 'America/Sao_Paulo'

export type DateRangePreset =
  | 'today'
  | 'yesterday'
  | 'today_and_yesterday'
  | 'last_7_days'
  | 'last_14_days'
  | 'last_28_days'
  | 'last_30_days'
  | 'this_week'
  | 'last_week'
  | 'current_month'
  | 'last_month'
  | 'this_quarter'
  | 'last_3_months'
  | 'current_year'
  | 'last_year'
  | 'max'
  | 'custom'

export interface DateRange {
  start:        string  // YYYY-MM-DD (BRL, inclusive)
  endExclusive: string  // YYYY-MM-DD (BRL, exclusive — next day)
  startISO:     string  // ISO timestamp for .gte() queries
  endISO:       string  // ISO timestamp for .lt() queries
  label:        string
  preset:       DateRangePreset
}

function nowBRL(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: TZ })
}

// Brazil is permanently UTC-3 (no DST since 2019)
function toISO(dateStr: string): string {
  return `${dateStr}T00:00:00-03:00`
}

function addDays(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10)
}

function startOfMonth(dateStr: string): string {
  return dateStr.slice(0, 7) + '-01'
}

function addMonths(dateStr: string, n: number): string {
  const [y, m] = dateStr.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1 + n, 1)).toISOString().slice(0, 10)
}

function startOfWeek(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay() // 0=Sun
  const offset = dow === 0 ? -6 : 1 - dow                 // shift to Monday
  return new Date(Date.UTC(y, m - 1, d + offset)).toISOString().slice(0, 10)
}

function makeRange(
  start: string,
  endExclusive: string,
  label: string,
  preset: DateRangePreset,
): DateRange {
  return { start, endExclusive, startISO: toISO(start), endISO: toISO(endExclusive), label, preset }
}

// Returns { from, to } as inclusive URL params (to = endExclusive - 1 day)
export function rangeToUrlParams(range: DateRange): { from: string; to: string } {
  return { from: range.start, to: addDays(range.endExclusive, -1) }
}

export function getDateRangePreset(preset: DateRangePreset): DateRange {
  const today     = nowBRL()
  const tomorrow  = addDays(today, 1)
  const yesterday = addDays(today, -1)

  switch (preset) {
    case 'today':
      return makeRange(today, tomorrow, 'Hoje', preset)

    case 'yesterday':
      return makeRange(yesterday, today, 'Ontem', preset)

    case 'today_and_yesterday':
      return makeRange(yesterday, tomorrow, 'Hoje e ontem', preset)

    case 'last_7_days':
      return makeRange(addDays(today, -6), tomorrow, 'Últimos 7 dias', preset)

    case 'last_14_days':
      return makeRange(addDays(today, -13), tomorrow, 'Últimos 14 dias', preset)

    case 'last_28_days':
      return makeRange(addDays(today, -27), tomorrow, 'Últimos 28 dias', preset)

    case 'last_30_days':
      return makeRange(addDays(today, -29), tomorrow, 'Últimos 30 dias', preset)

    case 'this_week': {
      return makeRange(startOfWeek(today), tomorrow, 'Esta semana', preset)
    }

    case 'last_week': {
      const thisWeekStart = startOfWeek(today)
      const lastWeekStart = addDays(thisWeekStart, -7)
      return makeRange(lastWeekStart, thisWeekStart, 'Semana passada', preset)
    }

    case 'current_month': {
      return makeRange(startOfMonth(today), tomorrow, 'Este mês', preset)
    }

    case 'last_month': {
      const thisMonthStart = startOfMonth(today)
      const lastMonthStart = addMonths(thisMonthStart, -1)
      return makeRange(lastMonthStart, thisMonthStart, 'Mês passado', preset)
    }

    case 'this_quarter': {
      const m = parseInt(today.split('-')[1])
      const qm = (Math.floor((m - 1) / 3) * 3) + 1
      return makeRange(`${today.slice(0, 4)}-${String(qm).padStart(2, '0')}-01`, tomorrow, 'Este trimestre', preset)
    }

    case 'last_3_months': {
      return makeRange(addMonths(startOfMonth(today), -2), tomorrow, 'Últimos 3 meses', preset)
    }

    case 'current_year': {
      return makeRange(today.slice(0, 4) + '-01-01', tomorrow, 'Este ano', preset)
    }

    case 'last_year': {
      const y = parseInt(today.slice(0, 4)) - 1
      return makeRange(`${y}-01-01`, `${y + 1}-01-01`, 'Ano passado', preset)
    }

    case 'max': {
      return makeRange('2025-01-01', tomorrow, 'Máximo', preset)
    }

    default:
      return makeRange(today, tomorrow, 'Hoje', 'today')
  }
}

function fmtBRL(dateStr: string): string {
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y}`
}

export function getDateRangeFromSearchParams(
  sp: { range?: string | string[]; from?: string | string[]; to?: string | string[] },
): DateRange {
  const preset = (Array.isArray(sp.range) ? sp.range[0] : sp.range) ?? 'today'
  const from   = Array.isArray(sp.from) ? sp.from[0] : sp.from
  const to     = Array.isArray(sp.to)   ? sp.to[0]   : sp.to

  if (from && to) {
    const endExclusive = addDays(to, 1)
    const label = from === to ? fmtBRL(from) : `${fmtBRL(from)} — ${fmtBRL(to)}`
    return makeRange(from, endExclusive, label, 'custom')
  }

  return getDateRangePreset(preset as DateRangePreset)
}

export function getPreviousPeriodRange(range: DateRange): DateRange {
  const days = Math.round(
    (new Date(range.endExclusive).getTime() - new Date(range.start).getTime()) / 86400000,
  )
  const prevStart = addDays(range.start, -days)
  return makeRange(prevStart, range.start, 'Período anterior', 'custom')
}

export function formatDateRangeLabel(range: DateRange): string {
  return range.label
}

export function buildDateRangeQuery(range: DateRange) {
  return {
    gte:     range.startISO,
    lt:      range.endISO,
    gteDate: range.start,
    ltDate:  range.endExclusive,
  }
}
