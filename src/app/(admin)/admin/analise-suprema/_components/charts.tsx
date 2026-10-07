'use client'

import { useState, useRef, useEffect, type PointerEvent } from 'react'

// Gráficos SVG artesanais (sem lib externa) seguindo o método de choosing-a-form/color-formula
// da skill dataviz: 1 forma por job (divergente pra sinal +/-, sequencial pra magnitude),
// eixo único, marca fina, hover como camada obrigatória, texto nunca na cor da série.

// Cores vêm dos tokens, não de literais: assim o gráfico acompanha a paleta do
// painel (e o dark) sem alguém precisar lembrar de atualizar dois lugares.
const TXT_MAIN  = 'var(--admin-text-main)'
const TXT_SEC   = 'var(--admin-text-sec)'
const TXT_MUTED = 'var(--admin-text-muted)'
const GRID      = 'var(--admin-border)'
const GOOD      = 'var(--admin-green)'
const BAD       = 'var(--admin-red)'
const SEQ_HUE   = 'var(--admin-accent)'

export interface DivergingPoint { label: string; value: number; isToday?: boolean }

export function DivergingBarChart({ data, formatValue }: { data: DivergingPoint[]; formatValue: (v: number) => string }) {
  const [hover, setHover] = useState<number | null>(null)
  const { ref, width: W } = useChartWidth()
  const H = 190, padTop = 18, padBottom = 22, padX = 4
  const plotH = H - padTop - padBottom

  const maxPos = Math.max(0, ...data.map(d => d.value))
  const maxNeg = Math.max(0, ...data.map(d => -d.value))
  const span   = maxPos + maxNeg || 1
  const baselineY = padTop + (maxPos / span) * plotH

  if (!data.length) return <ChartEmpty />

  const n = data.length
  const slot = (W - padX * 2) / n
  const barW = Math.max(1, Math.min(18, slot - 3))

  const maxIdx = data.reduce((best, d, i) => (d.value > data[best].value ? i : best), 0)
  const minIdx = data.reduce((best, d, i) => (d.value < data[best].value ? i : best), 0)

  const active = hover ?? -1

  return (
    <div ref={ref} style={{ position: 'relative', minWidth: 0 }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} role="img" aria-label="Lucro diário do mês" style={{ overflow: 'visible' }}>
        <line x1={padX} y1={baselineY} x2={W - padX} y2={baselineY} stroke={GRID} strokeWidth={1} />
        {data.map((d, i) => {
          const x = padX + i * slot + (slot - barW) / 2
          const h = Math.abs(d.value) / span * plotH
          const y = d.value >= 0 ? baselineY - h : baselineY
          const color = d.value >= 0 ? GOOD : BAD
          const isExtreme = i === maxIdx || i === minIdx
          const r = Math.min(4, barW / 2, h)
          return (
            <g key={d.label}
              tabIndex={0} role="button" aria-label={`${d.label}: ${formatValue(d.value)}`}
              onFocus={() => setHover(i)} onBlur={() => setHover(null)}
              onClick={() => setHover(i)} onPointerEnter={() => setHover(i)}
              onPointerLeave={() => setHover(null)}
              style={{ cursor: 'pointer' }}
            >
              {/* hit target maior que a barra, cobre a coluna inteira */}
              <rect x={padX + i * slot} y={padTop} width={slot} height={plotH} fill="transparent" />
              <path
                d={roundedBarPath(x, y, barW, h, r, d.value >= 0)}
                fill={color}
                opacity={active === -1 || active === i ? 1 : 0.35}
              />
              {d.isToday && (
                <circle cx={x + barW / 2} cy={d.value >= 0 ? y - 5 : y + h + 5} r={2.5} fill={TXT_MAIN} />
              )}
              {isExtreme && (
                <text x={x + barW / 2} y={d.value >= 0 ? y - 8 : y + h + 14} textAnchor="middle" fontSize="10" fontWeight={700} fill={TXT_SEC}>
                  {formatValue(d.value)}
                </text>
              )}
            </g>
          )
        })}
      </svg>
      {hover !== null && data[hover] && (
        <ChartTooltip
          label={data[hover].label}
          rows={[{ key: 'Lucro', value: formatValue(data[hover].value), color: data[hover].value >= 0 ? GOOD : BAD }]}
        />
      )}
      <div style={{ display: 'flex', gap: 'var(--sp-4)', marginTop: 'var(--sp-1)', fontSize: 'var(--fs-xs)', color: TXT_MUTED }}>
        <LegendKey color={GOOD} label="Dia positivo" />
        <LegendKey color={BAD} label="Dia negativo" />
      </div>
    </div>
  )
}

export interface SeriesPoint { label: string; value: number; status?: 'acima' | 'media' | 'abaixo' }
export interface ThresholdLine { value: number; label: string; color: string }

export function SequentialLineChart({ data, thresholds = [], formatValue, seriesLabel = 'ROAS' }: {
  data: SeriesPoint[]
  thresholds?: ThresholdLine[]
  /** Formata o valor no tooltip. Sem isto o gráfico de Lucro mostrava "1234.56x". */
  formatValue: (v: number) => string
  seriesLabel?: string
}) {
  const [hover, setHover] = useState<number | null>(null)
  const { ref, width: W } = useChartWidth()
  const H = 190, padTop = 16, padBottom = 22, padX = 8
  const plotH = H - padTop - padBottom
  const plotW = W - padX * 2

  const allValues = [...data.map(d => d.value), ...thresholds.map(t => t.value)]
  const maxV = Math.max(...allValues, 0.1)
  const minV = Math.min(0, ...allValues)
  const range = maxV - minV || 1

  if (!data.length) return <ChartEmpty />

  const n = data.length
  const xAt = (i: number) => padX + (n <= 1 ? 0 : (i / (n - 1)) * plotW)
  const yAt = (v: number) => padTop + (1 - (v - minV) / range) * plotH

  const linePath = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${xAt(i)} ${yAt(d.value)}`).join(' ')
  const areaPath = `${linePath} L ${xAt(n - 1)} ${padTop + plotH} L ${xAt(0)} ${padTop + plotH} Z`

  function handleMove(e: PointerEvent<SVGRectElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const relX = (e.clientX - rect.left) / rect.width * W
    const idx = Math.round(((relX - padX) / plotW) * (n - 1))
    setHover(Math.max(0, Math.min(n - 1, idx)))
  }

  const gridSteps = 3
  const ticks = Array.from({ length: gridSteps + 1 }, (_, i) => minV + (range * i) / gridSteps)

  return (
    <div ref={ref} style={{ position: 'relative', minWidth: 0 }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} role="img" aria-label={`${seriesLabel} ao longo do período`} style={{ overflow: 'visible' }}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={padX} y1={yAt(t)} x2={W - padX} y2={yAt(t)} stroke={GRID} strokeWidth={1} />
            <text x={0} y={yAt(t) - 3} fontSize="9.5" fill={TXT_MUTED}>{formatValue(t)}</text>
          </g>
        ))}

        {thresholds.map((t) => (
          <g key={t.label}>
            <line x1={padX} y1={yAt(t.value)} x2={W - padX} y2={yAt(t.value)} stroke={t.color} strokeWidth={1.5} strokeDasharray="4 4" opacity={0.6} />
            <text x={W - padX} y={yAt(t.value) - 4} textAnchor="end" fontSize="9.5" fontWeight={600} fill={t.color}>{t.label}</text>
          </g>
        ))}

        <path d={areaPath} fill={SEQ_HUE} opacity={0.08} />
        <path d={linePath} fill="none" stroke={SEQ_HUE} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

        {hover !== null && data[hover] && (
          <line x1={xAt(hover)} y1={padTop} x2={xAt(hover)} y2={padTop + plotH} stroke={TXT_MUTED} strokeWidth={1} strokeDasharray="2 3" />
        )}

        {data.map((d, i) => {
          const isEnd = i === n - 1
          const isHover = hover === i
          if (!isEnd && !isHover) return null
          return (
            <circle key={d.label} cx={xAt(i)} cy={yAt(d.value)} r={isHover ? 5 : 4} fill={SEQ_HUE} stroke="var(--admin-card)" strokeWidth={2} />
          )
        })}

        <rect x={padX} y={padTop} width={plotW} height={plotH} fill="transparent"
          onPointerMove={handleMove} onPointerDown={handleMove} onPointerLeave={() => setHover(null)} style={{ cursor: 'crosshair' }} />
      </svg>
      {hover !== null && data[hover] && (
        <ChartTooltip
          label={data[hover].label}
          rows={[{ key: seriesLabel, value: formatValue(data[hover].value), color: SEQ_HUE }]}
        />
      )}
    </div>
  )
}

function useChartWidth() {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(880)
  useEffect(() => {
    const element = ref.current
    if (!element) return
    const measure = () => {
      const measured = element.getBoundingClientRect().width
      if (measured > 0) setWidth(measured)
    }
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  return { ref, width }
}

function ChartEmpty() {
  return <div role="status" style={{ padding: '40px 16px', color: TXT_SEC, fontSize: 'var(--fs-sm)', textAlign: 'center' }}>Sem dados disponíveis para este gráfico.</div>
}

function ChartTooltip({ label, rows }: { label: string; rows: { key: string; value: string; color: string }[] }) {
  return (
    <div style={{
      position: 'absolute', top: 0, right: 0, background: 'var(--admin-card)', color: 'var(--admin-text-main)', border: '1px solid var(--admin-border-strong)',
      borderRadius: 'var(--r-sm)', padding: '8px 12px', fontSize: 'var(--fs-xs)', pointerEvents: 'none',
      boxShadow: '0 4px 16px rgba(15,23,42,0.18)', minWidth: '120px',
    }}>
      <div style={{ fontWeight: 600, marginBottom: 'var(--sp-1)', opacity: 0.75 }}>{label}</div>
      {rows.map((r) => (
        <div key={r.key} style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
          <span style={{ width: '10px', height: '2px', background: r.color, display: 'inline-block' }} />
          <span style={{ opacity: 0.75 }}>{r.key}</span>
          <strong style={{ marginLeft: 'auto', fontFamily: 'monospace' }}>{r.value}</strong>
        </div>
      ))}
    </div>
  )
}

function LegendKey({ color, label }: { color: string; label: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--sp-1)' }}>
      <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: color, display: 'inline-block' }} />
      {label}
    </span>
  )
}

function roundedBarPath(x: number, y: number, w: number, h: number, r: number, up: boolean): string {
  const rr = Math.max(0, Math.min(r, h))
  if (up) {
    return `M ${x} ${y + h} L ${x} ${y + rr} Q ${x} ${y} ${x + rr} ${y} L ${x + w - rr} ${y} Q ${x + w} ${y} ${x + w} ${y + rr} L ${x + w} ${y + h} Z`
  }
  return `M ${x} ${y} L ${x + w} ${y} L ${x + w} ${y + h - rr} Q ${x + w} ${y + h} ${x + w - rr} ${y + h} L ${x + rr} ${y + h} Q ${x} ${y + h} ${x} ${y + h - rr} Z`
}
