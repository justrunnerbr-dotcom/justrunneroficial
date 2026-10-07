'use client'
import { useSyncExternalStore } from 'react'
import { KpiValue } from './kpi-value'
import { formatKind } from './format'

// Mesma chave do botão do layout antigo (meta-tax-toggle.tsx): quem já tinha
// ligado o imposto continua vendo com imposto.
const STORAGE_KEY = 'jr-admin-meta-tax-enabled'
const EVENT = 'jr-meta-tax-change'
const RATE = 0.138

/** Liga/desliga os 13,8% sobre o gasto Meta. Os pedaços do card (valor,
 *  "ant." e o botão) ficam em sincronia por um evento na janela. */
let fallback = false // sem localStorage (aba privada), vale só enquanto a tela está aberta

function read(): boolean {
  try { return localStorage.getItem(STORAGE_KEY) === 'true' } catch { return fallback }
}
function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb)
  window.addEventListener('storage', cb)
  return () => { window.removeEventListener(EVENT, cb); window.removeEventListener('storage', cb) }
}

function useMetaTax(): [boolean, () => void] {
  const on = useSyncExternalStore(subscribe, read, () => false)
  const toggle = () => {
    fallback = !on
    try { localStorage.setItem(STORAGE_KEY, String(!on)) } catch { /* fica no fallback */ }
    window.dispatchEvent(new Event(EVENT))
  }
  return [on, toggle]
}

export function MetaTaxToggleButton() {
  const [on, toggle] = useMetaTax()
  return (
    <button
      type="button"
      className="dsh-tax"
      aria-pressed={on}
      onClick={toggle}
      title="Soma os 13,8% de imposto que a Meta cobra sobre o investimento em anúncios"
    >+ 13,8%</button>
  )
}

export function MetaTaxValue({ value }: { value: number }) {
  const [on] = useMetaTax()
  return <KpiValue value={on ? value * (1 + RATE) : value} kind="brl" />
}

export function MetaTaxBase({ base, title }: { base: number; title: string }) {
  const [on] = useMetaTax()
  return <span className="dsh-kpi-sub" title={title}>ant. {formatKind(on ? base * (1 + RATE) : base, 'brl')}</span>
}
