'use client'
import { useState } from 'react'
import type { SeriesPoint } from '@/lib/admin/dashboard-data'

type Key = 'revenue' | 'profit' | 'paid' | 'media'

const TABS: { key: Key; label: string }[] = [
  { key: 'revenue', label: 'Receita' },
  { key: 'profit', label: 'Lucro' },
  { key: 'paid', label: 'Pedidos' },
  { key: 'media', label: 'Mídia' },
]

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
const brlK = (v: number) => Math.abs(v) >= 1000 ? `R$ ${(v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil` : `R$ ${Math.round(v)}`
const int = (v: number) => v.toLocaleString('pt-BR', { maximumFractionDigits: 1 })

const W = 800, H = 260, PL = 64, PR = 12, PT = 12, PB = 28

function area(vals: (number | null)[], x: (i: number) => number, y: (v: number) => number, base: number): string {
  let d = '', start = -1
  const close = (end: number) => { d += `L${x(end).toFixed(1)},${base.toFixed(1)}L${x(start).toFixed(1)},${base.toFixed(1)}Z`; start = -1 }
  vals.forEach((v, i) => {
    if (v === null) { if (start >= 0) close(i - 1); return }
    d += `${start < 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`
    if (start < 0) start = i
  })
  if (start >= 0) close(vals.length - 1)
  return d
}

function path(vals: (number | null)[], x: (i: number) => number, y: (v: number) => number): string {
  let d = '', pen = false
  vals.forEach((v, i) => {
    if (v === null) { pen = false; return }
    d += `${pen ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`
    pen = true
  })
  return d
}

export function EvolutionChart({ cur, base, hourly, curLabel, refLabel }: {
  cur: SeriesPoint[]; base: SeriesPoint[]; hourly: boolean; curLabel: string; refLabel: string
}) {
  const tabs = hourly ? TABS.filter(t => t.key === 'revenue' || t.key === 'paid') : TABS
  const [key, setKey] = useState<Key>('revenue')
  const [hover, setHover] = useState<number | null>(null)
  const [showTable, setShowTable] = useState(false)
  const fmt = key === 'paid' ? int : brl
  const axis = key === 'paid' ? int : brlK

  const a = cur.map(p => p[key])
  const b = base.map(p => p[key])
  const n = Math.max(a.length, b.length)
  const all = [...a, ...b].filter((v): v is number => v !== null)
  const min = Math.min(0, ...all)
  const max = Math.max(1, ...all)
  const x = (i: number) => PL + (n <= 1 ? 0 : (i / (n - 1)) * (W - PL - PR))
  const y = (v: number) => PT + (1 - (v - min) / (max - min || 1)) * (H - PT - PB)
  const ticks = [0, 0.25, 0.5, 0.75, 1].map(t => min + t * (max - min))
  const every = Math.max(1, Math.ceil(n / 10))
  let last: number | null = null
  for (let i = a.length - 1; i >= 0; i--) if (a[i] !== null) { last = i; break }
  const gaps = a.some(v => v === null) && !hourly

  function onMove(e: React.PointerEvent<SVGSVGElement>) {
    const r = e.currentTarget.getBoundingClientRect()
    const px = ((e.clientX - r.left) / r.width) * W
    const i = Math.round(((px - PL) / (W - PL - PR)) * (n - 1))
    setHover(i >= 0 && i < n ? i : null)
  }

  return (
    <div>
      <div className="dsh-seg sm" role="group" aria-label="Métrica do gráfico">
        {tabs.map(t => (
          <button key={t.key} type="button" aria-pressed={key === t.key} onClick={() => setKey(t.key)}>{t.label}</button>
        ))}
      </div>
      <div className="dsh-legend" style={{ marginTop: 10 }}>
        <span><i style={{ background: 'var(--c1)' }} />{curLabel}</span>
        <span><i style={{ background: 'var(--prev)' }} />{refLabel}</span>
        {hourly && <span>acumulado por hora</span>}
      </div>
      <div className="dsh-chart">
        <svg key={key} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${tabs.find(t => t.key === key)?.label} por ${hourly ? 'hora' : 'dia'}`}
          onPointerMove={onMove} onPointerDown={onMove} onPointerLeave={() => setHover(null)}>
          <defs>
            <linearGradient id="dsh-evo-area" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="var(--c1)" stopOpacity=".32" />
              <stop offset="1" stopColor="var(--c1)" stopOpacity="0" />
            </linearGradient>
          </defs>
          {ticks.map((t, i) => (
            <g key={i}>
              <line x1={PL} x2={W - PR} y1={y(t)} y2={y(t)} stroke="var(--border)" strokeDasharray={i === 0 ? undefined : '2 4'} />
              <text x={PL - 8} y={y(t) + 4} textAnchor="end">{axis(t)}</text>
            </g>
          ))}
          {cur.map((p, i) => i % every === 0 && (
            <text key={i} x={x(i)} y={H - 8} textAnchor="middle">{p.label}</text>
          ))}
          <path d={path(b, x, y)} fill="none" stroke="var(--prev)" strokeWidth="1.5" strokeDasharray="5 5" />
          <g className="dsh-rv">
            <path d={area(a, x, y, y(Math.max(min, 0)))} fill="url(#dsh-evo-area)" />
            <path d={path(a, x, y)} fill="none" stroke="var(--c1)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
            {a.map((v, i) => v !== null && (a[i - 1] ?? null) === null && (a[i + 1] ?? null) === null && (
              <circle key={i} cx={x(i)} cy={y(v)} r="3" fill="var(--c1)" />
            ))}
          </g>
          {last !== null && (
            <g className="dsh-endp">
              <circle className="dsh-pulse" cx={x(last)} cy={y(a[last] as number)} r="5" fill="var(--c1)" />
              <circle cx={x(last)} cy={y(a[last] as number)} r="4" fill="var(--c1)" stroke="var(--bg)" strokeWidth="2" />
            </g>
          )}
          {hover !== null && (
            <g>
              <line x1={x(hover)} x2={x(hover)} y1={PT} y2={H - PB} stroke="var(--muted)" strokeDasharray="3 3" />
              {b[hover] !== null && b[hover] !== undefined && <circle cx={x(hover)} cy={y(b[hover] as number)} r="3.5" fill="var(--prev)" />}
              {a[hover] !== null && a[hover] !== undefined && <circle cx={x(hover)} cy={y(a[hover] as number)} r="4.5" fill="var(--c1)" stroke="var(--bg)" strokeWidth="2" />}
            </g>
          )}
        </svg>
        {hover !== null && (
          <div className="dsh-tip" style={{ left: `${Math.min(88, Math.max(12, (x(hover) / W) * 100))}%`, top: `${(PT / H) * 100 + 8}%` }}>
            <small>{cur[hover]?.label ?? base[hover]?.label}</small>
            <b>{a[hover] === null || a[hover] === undefined ? 'sem dado' : fmt(a[hover] as number)}</b>
            {b[hover] !== null && b[hover] !== undefined && (
              <small>
                comparação: {fmt(b[hover] as number)}
                {a[hover] != null && (b[hover] as number) !== 0 && ` (${(((a[hover] as number) - (b[hover] as number)) / Math.abs(b[hover] as number) * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%)`}
              </small>
            )}
          </div>
        )}
      </div>
      {gaps && <p className="dsh-note">Dias sem gasto de mídia importado aparecem como lacuna — lucro e mídia desses dias não são zero, são desconhecidos.</p>}
      <button type="button" className="dsh-link" style={{ background: 'none', border: 0, padding: 0, marginTop: 8, cursor: 'pointer' }} onClick={() => setShowTable(s => !s)}>
        {showTable ? 'Esconder valores' : 'Ver valores'}
      </button>
      {showTable && (
        <div className="dsh-tbl-w">
          <table className="dsh-tbl">
            <thead><tr><th>{hourly ? 'Hora' : 'Dia'}</th><th className="r">Período</th><th className="r">Comparação</th></tr></thead>
            <tbody>
              {Array.from({ length: n }, (_, i) => (
                <tr key={i}>
                  <td>{cur[i]?.label ?? '—'}{base[i] && !hourly ? <span style={{ color: 'var(--admin-text-muted)' }}> · {base[i].label}</span> : null}</td>
                  <td className="r">{a[i] === null || a[i] === undefined ? '—' : fmt(a[i] as number)}</td>
                  <td className="r">{b[i] === null || b[i] === undefined ? '—' : fmt(b[i] as number)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
