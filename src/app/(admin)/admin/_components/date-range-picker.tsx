'use client'
import { useState, useEffect, useRef } from 'react'
import { useSearchParams, usePathname, useRouter } from 'next/navigation'
import { getDateRangePreset, rangeToUrlParams, type DateRangePreset } from '@/lib/admin/date-range'

// ─── Palette ─────────────────────────────────────────────────────────────────

const C = {
  bg:          '#0B0F0E',
  panel:       '#111716',
  sidebar:     '#0D1110',
  border:      'rgba(255,255,255,0.08)',
  textMain:    '#F4F7F5',
  textSec:     '#8A9791',
  textMuted:   '#5F6B66',
  accent:      '#10B981',
  accentBg:    'rgba(16,185,129,0.16)',
  accentLight: 'rgba(16,185,129,0.08)',
}

// ─── Preset groups ────────────────────────────────────────────────────────────

const RECENT: { key: DateRangePreset; label: string }[] = [
  { key: 'today',        label: 'Hoje' },
  { key: 'last_7_days',  label: 'Últimos 7 dias' },
  { key: 'last_30_days', label: 'Últimos 30 dias' },
  { key: 'max',          label: 'Máximo' },
]

const QUICK: { key: DateRangePreset; label: string }[] = [
  { key: 'today',               label: 'Hoje' },
  { key: 'yesterday',           label: 'Ontem' },
  { key: 'today_and_yesterday', label: 'Hoje e ontem' },
  { key: 'last_7_days',         label: 'Últimos 7 dias' },
  { key: 'last_14_days',        label: 'Últimos 14 dias' },
  { key: 'last_28_days',        label: 'Últimos 28 dias' },
  { key: 'last_30_days',        label: 'Últimos 30 dias' },
  { key: 'this_week',           label: 'Esta semana' },
  { key: 'last_week',           label: 'Semana passada' },
  { key: 'current_month',       label: 'Este mês' },
  { key: 'last_month',          label: 'Mês passado' },
  { key: 'this_quarter',        label: 'Este trimestre' },
  { key: 'last_3_months',       label: 'Últimos 3 meses' },
  { key: 'current_year',        label: 'Este ano' },
  { key: 'last_year',           label: 'Ano passado' },
]

// ─── Calendar helpers ─────────────────────────────────────────────────────────

const MONTHS_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const WEEK_PT   = ['Seg','Ter','Qua','Qui','Sex','Sáb','Dom']

function todayBRL(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
}

function shiftDays(s: string, n: number): string {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10)
}

function shiftMonths(year: number, month: number, n: number): { year: number; month: number } {
  const d = new Date(Date.UTC(year, month - 1 + n, 1))
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 }
}

function getMonthGrid(year: number, month: number): (string | null)[] {
  const firstDow    = new Date(Date.UTC(year, month - 1, 1)).getUTCDay()
  const monOffset   = firstDow === 0 ? 6 : firstDow - 1
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const grid: (string | null)[] = Array(monOffset).fill(null)
  for (let d = 1; d <= daysInMonth; d++) {
    grid.push(`${year}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`)
  }
  return grid
}

function fmtDisplay(s: string | null): string {
  if (!s) return ''
  const [y, m, d] = s.split('-')
  return `${d}/${m}/${y}`
}

// ─── CalendarMonth ────────────────────────────────────────────────────────────

function CalendarMonth({
  year, month,
  start, end, hover, phase, today,
  onDayClick, onDayHover,
  onPrev, onNext,
}: {
  year: number; month: number
  start: string | null; end: string | null; hover: string | null
  phase: 'start' | 'end'; today: string
  onDayClick: (d: string) => void
  onDayHover: (d: string | null) => void
  onPrev?: () => void
  onNext?: () => void
}) {
  const grid = getMonthGrid(year, month)

  // Build visual range (include hover preview when picking end)
  const previewEnd = phase === 'end' && hover ? hover : end
  let rStart: string | null = null
  let rEnd:   string | null = null
  if (start && previewEnd) {
    if (start <= previewEnd) { rStart = start; rEnd = previewEnd }
    else                      { rStart = previewEnd; rEnd = start }
  } else {
    rStart = start
  }
  const hasRange = !!(rStart && rEnd && rStart !== rEnd)

  const NAV_BTN: React.CSSProperties = {
    background: 'none', border: 'none', cursor: 'pointer',
    color: C.textSec, fontSize: '18px', lineHeight: 1,
    padding: '0 8px', borderRadius: '4px',
  }

  return (
    <div style={{ minWidth: '256px' }}>
      {/* Month header with navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <button
          onClick={onPrev}
          style={{ ...NAV_BTN, visibility: onPrev ? 'visible' : 'hidden' }}
        >‹</button>
        <span style={{ fontSize: '13px', fontWeight: 600, color: C.textMain }}>
          {MONTHS_PT[month - 1]} {year}
        </span>
        <button
          onClick={onNext}
          style={{ ...NAV_BTN, visibility: onNext ? 'visible' : 'hidden' }}
        >›</button>
      </div>

      {/* Week headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 36px)', marginBottom: '4px' }}>
        {WEEK_PT.map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: '11px', color: C.textMuted, fontWeight: 600, padding: '2px 0' }}>
            {d}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 36px)' }}>
        {grid.map((day, i) => {
          if (!day) return <div key={`e${i}`} style={{ height: '36px' }} />

          const isDisplayStart = day === rStart
          const isDisplayEnd   = day === rEnd
          const inRange        = hasRange && !!rStart && !!rEnd && day > rStart && day < rEnd
          const isSelected     = isDisplayStart || isDisplayEnd
          const isToday        = day === today

          // Strip positioning
          let stripLeft  = '0'
          let stripRight = '0'
          let showStrip  = false
          if (inRange) {
            showStrip = true
          } else if (isDisplayStart && hasRange) {
            showStrip = true; stripLeft = '50%'
          } else if (isDisplayEnd && hasRange) {
            showStrip = true; stripRight = '50%'
          }

          return (
            <div
              key={day}
              onClick={() => onDayClick(day)}
              onMouseEnter={() => onDayHover(day)}
              onMouseLeave={() => onDayHover(null)}
              style={{ height: '36px', position: 'relative', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              {/* Range strip (background layer) */}
              {showStrip && (
                <div style={{
                  position: 'absolute', top: '3px', bottom: '3px',
                  left: stripLeft, right: stripRight,
                  background: C.accentBg, pointerEvents: 'none',
                }} />
              )}
              {/* Day circle */}
              <div style={{
                position: 'relative', zIndex: 1,
                width: '30px', height: '30px', borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background:  isSelected ? C.accent : 'transparent',
                color:       isSelected ? '#fff' : isToday ? C.accent : C.textMain,
                fontSize:    '12px',
                fontWeight:  isSelected ? 700 : isToday ? 600 : 400,
                border:      isToday && !isSelected ? `1px solid ${C.accent}` : 'none',
                transition:  'background 0.1s',
              }}>
                {parseInt(day.split('-')[2])}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── DateRangePicker ──────────────────────────────────────────────────────────

type CompareMode = 'previous' | 'year_over_year' | 'custom'

export function DateRangePicker({ onClose }: { onClose: () => void }) {
  const searchParams = useSearchParams()
  const pathname     = usePathname()
  const router       = useRouter()
  const overlayRef   = useRef<HTMLDivElement>(null)

  const urlFrom  = searchParams.get('from') ?? ''
  const urlTo    = searchParams.get('to')   ?? ''
  const urlRange = searchParams.get('range') ?? ''

  // Compute initial draft values from current URL
  function initFromUrl(): { start: string | null; end: string | null; preset: DateRangePreset | null } {
    if (urlFrom && urlTo) {
      return { start: urlFrom, end: urlTo, preset: null }
    }
    if (urlRange && urlRange !== 'custom') {
      try {
        const r = getDateRangePreset(urlRange as DateRangePreset)
        const { from, to } = rangeToUrlParams(r)
        return { start: from, end: to, preset: urlRange as DateRangePreset }
      } catch { /* fall through */ }
    }
    const today = todayBRL()
    return { start: today, end: today, preset: 'today' }
  }

  const init = initFromUrl()

  const [draftStart,   setDraftStart]   = useState<string | null>(init.start)
  const [draftEnd,     setDraftEnd]     = useState<string | null>(init.end)
  const [hoverDate,    setHoverDate]    = useState<string | null>(null)
  const [phase,        setPhase]        = useState<'start' | 'end'>('start')
  const [activePreset, setActivePreset] = useState<DateRangePreset | null>(init.preset)
  const [compare,      setCompare]      = useState(false)
  const [compareMode,  setCompareMode]  = useState<CompareMode>('previous')

  // Calendar navigation — start showing the month(s) that contain the selection
  const today = todayBRL()
  const [todayY, todayM] = today.split('-').map(Number)

  function initLeft() {
    const ref = draftStart ?? today
    const [y, m] = ref.split('-').map(Number)
    // If that month IS the right calendar, show prev month on left
    const r = shiftMonths(y, m, 1)
    const isLastMonth = (r.year === todayY && r.month === todayM) || (y === todayY && m === todayM)
    if (isLastMonth) return shiftMonths(y, m, -1)
    return { year: y, month: m }
  }

  const il = initLeft()
  const [leftYear,  setLeftYear]  = useState(il.year)
  const [leftMonth, setLeftMonth] = useState(il.month)
  const right = shiftMonths(leftYear, leftMonth, 1)

  // Close on backdrop click
  function handleBackdrop(e: React.MouseEvent) {
    if (e.target === overlayRef.current) onClose()
  }

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // ── Handlers ────────────────────────────────────────────

  function handlePreset(preset: DateRangePreset) {
    const r = getDateRangePreset(preset)
    const { from, to } = rangeToUrlParams(r)
    setDraftStart(from)
    setDraftEnd(to)
    setActivePreset(preset)
    setPhase('start')
    // Navigate left calendar to show the start month
    const [y, m] = from.split('-').map(Number)
    setLeftYear(y); setLeftMonth(m)
  }

  function handleDayClick(day: string) {
    setActivePreset(null)
    if (phase === 'start') {
      setDraftStart(day)
      setDraftEnd(null)
      setPhase('end')
    } else {
      if (draftStart && day < draftStart) {
        setDraftStart(day); setDraftEnd(null); setPhase('end')
      } else {
        setDraftEnd(day); setPhase('start')
      }
    }
  }

  function handleFromInput(val: string) {
    setDraftStart(val || null)
    setActivePreset(null)
  }

  function handleToInput(val: string) {
    setDraftEnd(val || null)
    setActivePreset(null)
  }

  function handleApply() {
    let from = draftStart
    let to   = draftEnd ?? draftStart
    if (!from) return
    // Auto-correct inverted range
    if (to && from > to) { [from, to] = [to, from] }
    const params = new URLSearchParams()
    params.set('from', from!)
    params.set('to', to!)
    if (compare) params.set('compare', compareMode)
    router.push(`${pathname}?${params.toString()}`)
    onClose()
  }

  const canApply = !!draftStart

  const INPUT_STYLE: React.CSSProperties = {
    background: C.bg, border: `1px solid ${C.border}`, borderRadius: '8px',
    padding: '8px 12px', color: C.textMain, fontSize: '13px', outline: 'none',
    colorScheme: 'dark', fontFamily: 'inherit',
  }

  const SIDEBAR_BTN = (isActive: boolean): React.CSSProperties => ({
    display: 'block', width: '100%', textAlign: 'left',
    padding: '7px 16px', border: 'none', cursor: 'pointer',
    fontSize: '13px', fontWeight: isActive ? 600 : 400,
    color:      isActive ? C.accent : C.textSec,
    background: isActive ? C.accentBg : 'transparent',
    transition: 'background 0.15s',
  })

  const GROUP_TITLE: React.CSSProperties = {
    fontSize: '10px', fontWeight: 700, color: C.textMuted,
    textTransform: 'uppercase', letterSpacing: '0.7px',
    padding: '12px 16px 4px',
  }

  return (
    <div
      ref={overlayRef}
      onClick={handleBackdrop}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.65)',
        zIndex: 9999,
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        paddingTop: '72px', overflowY: 'auto',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: C.panel,
          border: `1px solid ${C.border}`,
          borderRadius: '16px',
          boxShadow: '0 32px 80px rgba(0,0,0,0.7)',
          display: 'flex',
          maxHeight: 'calc(100vh - 88px)',
          overflow: 'hidden',
          margin: '0 16px 24px',
        }}
      >
        {/* ── Sidebar ── */}
        <div style={{
          width: '210px', flexShrink: 0,
          background: C.sidebar,
          borderRight: `1px solid ${C.border}`,
          overflowY: 'auto',
          padding: '8px 0 20px',
        }}>
          <div style={GROUP_TITLE}>Usados recentemente</div>
          {RECENT.map(p => (
            <button key={`r-${p.key}`} onClick={() => handlePreset(p.key)} style={SIDEBAR_BTN(activePreset === p.key)}>
              {p.label}
            </button>
          ))}

          <div style={GROUP_TITLE}>Períodos rápidos</div>
          {QUICK.map(p => (
            <button key={`q-${p.key}`} onClick={() => handlePreset(p.key)} style={SIDEBAR_BTN(activePreset === p.key)}>
              {p.label}
            </button>
          ))}

          <div style={GROUP_TITLE}>Personalizado</div>
          <button
            onClick={() => { setDraftStart(null); setDraftEnd(null); setPhase('start'); setActivePreset(null) }}
            style={SIDEBAR_BTN(!activePreset && !draftStart)}
          >
            Escolher no calendário
          </button>
        </div>

        {/* ── Main area ── */}
        <div style={{ display: 'flex', flexDirection: 'column', padding: '24px 28px', minWidth: '600px' }}>

          {/* Date inputs row */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', marginBottom: '24px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <span style={{ fontSize: '10px', fontWeight: 600, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>De</span>
              <input
                type="date"
                value={draftStart ?? ''}
                onChange={e => handleFromInput(e.target.value)}
                style={{ ...INPUT_STYLE, width: '148px' }}
              />
            </div>
            <span style={{ color: C.textMuted, paddingBottom: '10px', fontSize: '16px' }}>→</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <span style={{ fontSize: '10px', fontWeight: 600, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Até</span>
              <input
                type="date"
                value={draftEnd ?? ''}
                onChange={e => handleToInput(e.target.value)}
                style={{ ...INPUT_STYLE, width: '148px' }}
              />
            </div>
            {/* Phase hint */}
            <div style={{ paddingBottom: '8px', fontSize: '12px', color: C.textMuted, marginLeft: '4px' }}>
              {phase === 'start' && draftStart && draftEnd
                ? `${fmtDisplay(draftStart)} → ${fmtDisplay(draftEnd)}`
                : phase === 'end'
                ? '← clique a data final'
                : '← clique para iniciar'}
            </div>
          </div>

          {/* Dual calendars */}
          <div style={{ display: 'flex', gap: '0', marginBottom: '20px' }}>
            <CalendarMonth
              year={leftYear} month={leftMonth}
              start={draftStart} end={draftEnd}
              hover={hoverDate} phase={phase} today={today}
              onDayClick={handleDayClick}
              onDayHover={setHoverDate}
              onPrev={() => { const p = shiftMonths(leftYear, leftMonth, -1); setLeftYear(p.year); setLeftMonth(p.month) }}
            />
            <div style={{ width: '1px', background: C.border, margin: '0 24px' }} />
            <CalendarMonth
              year={right.year} month={right.month}
              start={draftStart} end={draftEnd}
              hover={hoverDate} phase={phase} today={today}
              onDayClick={handleDayClick}
              onDayHover={setHoverDate}
              onNext={() => { const n = shiftMonths(leftYear, leftMonth, 1); setLeftYear(n.year); setLeftMonth(n.month) }}
            />
          </div>

          {/* Footer: timezone + compare + buttons */}
          <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '11px', color: C.textMuted, flex: 1 }}>
                🕐 Fuso horário das datas: Horário de São Paulo (UTC-3)
              </span>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '12px', color: C.textSec, flexShrink: 0 }}>
                <input
                  type="checkbox"
                  checked={compare}
                  onChange={e => setCompare(e.target.checked)}
                  style={{ accentColor: C.accent }}
                />
                Comparar
              </label>
              {compare && (
                <select
                  value={compareMode}
                  onChange={e => setCompareMode(e.target.value as CompareMode)}
                  style={{
                    ...INPUT_STYLE,
                    padding: '5px 10px', fontSize: '12px',
                    borderRadius: '6px', cursor: 'pointer',
                  }}
                >
                  <option value="previous">Período anterior</option>
                  <option value="year_over_year">Ano anterior</option>
                  <option value="custom">Personalizado</option>
                </select>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={onClose}
                style={{
                  padding: '9px 20px', borderRadius: '8px',
                  border: `1px solid ${C.border}`, background: 'transparent',
                  color: C.textSec, fontSize: '13px', fontWeight: 500, cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleApply}
                disabled={!canApply}
                style={{
                  padding: '9px 24px', borderRadius: '8px', border: 'none',
                  background: canApply ? C.accent : C.textMuted,
                  color: '#fff', fontSize: '13px', fontWeight: 700,
                  cursor: canApply ? 'pointer' : 'not-allowed',
                }}
              >
                Atualizar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
