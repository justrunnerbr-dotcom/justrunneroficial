'use client'
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'

// Meta cobra 13,8% de imposto (ISS + PIS/COFINS) sobre o investimento em
// anúncios no Brasil, que não vem embutido no valor de "spend" retornado pela
// API. Esse toggle deixa o usuário ver o investimento (e o CPA, que depende
// dele) com ou sem esse imposto somado — preferência salva no navegador.
const META_TAX_RATE = 0.138
const STORAGE_KEY = 'jhf-admin-meta-tax-enabled'

interface MetaTaxContextValue {
  enabled: boolean
  toggle: () => void
  applyTax: (raw: number) => number
}

const MetaTaxContext = createContext<MetaTaxContextValue>({
  enabled: false,
  toggle: () => {},
  applyTax: (raw) => raw,
})

function fmtBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

export function MetaTaxProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === 'true') setEnabled(true)
    } catch {
      // localStorage indisponível — mantém desligado por padrão
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function toggle() {
    setEnabled((prev) => {
      const next = !prev
      try { localStorage.setItem(STORAGE_KEY, String(next)) } catch {}
      return next
    })
  }

  const applyTax = (raw: number) => (enabled ? raw * (1 + META_TAX_RATE) : raw)

  return (
    <MetaTaxContext.Provider value={{ enabled, toggle, applyTax }}>
      {children}
    </MetaTaxContext.Provider>
  )
}

export function MetaTaxToggle() {
  const { enabled, toggle } = useContext(MetaTaxContext)
  return (
    <button
      onClick={toggle}
      title="Inclui os 13,8% de imposto cobrado pela Meta sobre o investimento em anúncios"
      style={{
        display: 'flex', alignItems: 'center', gap: '5px', fontSize: '9px', fontWeight: 700,
        color: enabled ? '#fff' : 'var(--admin-text-sec)',
        background: enabled ? '#16a34a' : 'var(--admin-bg)',
        border: '1px solid var(--admin-border)', borderRadius: '99px', padding: '3px 9px', cursor: 'pointer',
        letterSpacing: '0.3px', textTransform: 'uppercase',
      }}
    >
      Imposto Meta 13,8% {enabled ? 'ON' : 'OFF'}
    </button>
  )
}

// Renderiza um valor monetário já formatado, aplicando (ou não) o imposto
// conforme o toggle atual. `divideBy` serve pra métricas derivadas do gasto,
// como o CPA (gasto ajustado ÷ pedidos pagos).
export function MetaSpendAmount({ raw, divideBy }: { raw: number; divideBy?: number }) {
  const { applyTax } = useContext(MetaTaxContext)
  const adjusted = applyTax(raw)
  const value = divideBy && divideBy > 0 ? adjusted / divideBy : adjusted
  return <>{fmtBRL(value)}</>
}
