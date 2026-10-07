'use client'
import { useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { DateRangePicker } from '../date-range-picker'

const PERIODS: { key: string; label: string }[] = [
  { key: 'today', label: 'Hoje' },
  { key: 'yesterday', label: 'Ontem' },
  { key: 'last_7_days', label: '7 dias' },
  { key: 'last_14_days', label: '14 dias' },
  { key: 'last_30_days', label: '30 dias' },
]

/** Filtro do topo do Dashboard: períodos rápidos, intervalo personalizado,
 *  base de comparação e a linha que explica o recorte. Médias de 7 e 14 dias
 *  só existem para um dia isolado. */
export function PeriodBar({ compare, singleDay, anteriorLabel, note }: {
  compare: string; singleDay: boolean; anteriorLabel: string; note: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const sp = useSearchParams()
  const [picker, setPicker] = useState(false)
  const custom = Boolean(sp.get('from') && sp.get('to'))
  const current = custom ? 'custom' : sp.get('range') ?? 'today'

  function go(update: (p: URLSearchParams) => void) {
    const next = new URLSearchParams(sp.toString())
    update(next)
    const qs = next.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname)
  }

  return (
    <div className="dsh-filters">
      <div className="dsh-seg" role="group" aria-label="Período">
        {PERIODS.map(p => (
          <button
            key={p.key}
            type="button"
            aria-pressed={current === p.key}
            onClick={() => go(n => {
              n.delete('from'); n.delete('to'); n.set('range', p.key)
              // média de 7/14 dias não vale para período de vários dias
              if (p.key !== 'today' && p.key !== 'yesterday') n.delete('cmp')
            })}
          >{p.label}</button>
        ))}
        <button type="button" aria-pressed={current === 'custom'} onClick={() => setPicker(true)}>Personalizado</button>
      </div>
      <select
        className="dsh-select"
        aria-label="Comparar com"
        value={compare}
        onChange={e => go(n => { if (e.target.value === 'anterior') n.delete('cmp'); else n.set('cmp', e.target.value) })}
      >
        <option value="anterior">{anteriorLabel}</option>
        <option value="m7" disabled={!singleDay}>Média 7 dias</option>
        <option value="m14" disabled={!singleDay}>Média 14 dias</option>
      </select>
      <span className="dsh-per-note">{note}</span>
      {picker && <DateRangePicker onClose={() => setPicker(false)} />}
    </div>
  )
}
