'use client'
import { useSyncExternalStore } from 'react'
import { KpiValue } from './kpi-value'
import { formatKind } from './format'

// Botão do card "Receita paga" (portado da JHF em 09/11/2026): troca o bruto
// (o que o cliente pagou) pelo líquido aproximado que cai na Appmax, descontando
// a taxa por meio de pagamento — a mesma que o lucro já desconta. No JR o cartão
// usa as parcelas reais da transação Yampi (4,98% + 1,89% por parcela extra) e
// só cai no parcelamento padrão quando o pedido não tem o dado. Não inclui
// antecipação de saque nem a taxa da Yampi (2,5%), que é cobrada à parte.

const STORAGE_KEY = 'jr-admin-appmax-net-enabled'
const EVENT = 'jr-appmax-net-change'

export interface AppmaxSplit {
  gross: number
  pixRevenue: number; pixFee: number; pixCount: number
  cardRevenue: number; cardFee: number; cardCount: number
}

let fallback = false

function read(): boolean {
  try { return localStorage.getItem(STORAGE_KEY) === 'true' } catch { return fallback }
}
function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb)
  window.addEventListener('storage', cb)
  return () => { window.removeEventListener(EVENT, cb); window.removeEventListener('storage', cb) }
}

function useAppmaxNet(): [boolean, () => void] {
  const on = useSyncExternalStore(subscribe, read, () => false)
  const toggle = () => {
    fallback = !on
    try { localStorage.setItem(STORAGE_KEY, String(!on)) } catch { /* fica no fallback */ }
    window.dispatchEvent(new Event(EVENT))
  }
  return [on, toggle]
}

const net = (s: AppmaxSplit) => s.gross - s.pixFee - s.cardFee
const brl = (v: number) => formatKind(v, 'brl')
const n = (v: number) => Math.round(v).toLocaleString('pt-BR')

export function AppmaxToggleButton() {
  const [on, toggle] = useAppmaxNet()
  return (
    <button
      type="button"
      className="dsh-tax"
      aria-pressed={on}
      onClick={toggle}
      title="Mostra o valor aproximado que entra na Appmax, descontando a taxa de Pix e cartão"
    >− Appmax</button>
  )
}

export function AppmaxValue({ cur }: { cur: AppmaxSplit }) {
  const [on] = useAppmaxNet()
  return <KpiValue value={on ? net(cur) : cur.gross} kind="brl" />
}

export function AppmaxBase({ base, title }: { base: AppmaxSplit; title: string }) {
  const [on] = useAppmaxNet()
  return <span className="dsh-kpi-sub" title={title}>ant. {brl(on ? net(base) : base.gross)}</span>
}

/** Os descontos, com o botão ligado: janelinha flutuante ao passar o mouse
 *  no card (não muda a altura da fileira de cards). */
export function AppmaxDetail({ cur }: { cur: AppmaxSplit }) {
  const [on] = useAppmaxNet()
  if (!on) return null
  return (
    <div className="dsh-appmax-pop">
      <span>Bruto pago {brl(cur.gross)}</span>
      <span>Pix ({n(cur.pixCount)}) −{brl(cur.pixFee)}</span>
      <span>Cartão ({n(cur.cardCount)}) −{brl(cur.cardFee)}</span>
      <span style={{ color: 'var(--fg)', fontWeight: 700 }}>≈ Appmax {brl(net(cur))}</span>
      <span style={{ fontSize: '.7rem' }}>cartão pelas parcelas reais; sem antecipação</span>
    </div>
  )
}
