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

export const MetaTaxContext = createContext<MetaTaxContextValue>({
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

// Investimento Marketing = Meta (com imposto, se o toggle estiver ligado) + Google Ads
// (a API do Google já devolve o valor real cobrado, sem imposto embutido pra ajustar).
// `divideBy` serve pro CPA (gasto combinado ÷ pedidos pagos) — precisa ser o
// mesmo total do card Investimento Marketing, senão os dois não batem.
export function MarketingSpendAmount({ metaRaw, googleRaw, divideBy }: { metaRaw: number; googleRaw: number; divideBy?: number }) {
  const { applyTax } = useContext(MetaTaxContext)
  const total = applyTax(metaRaw) + googleRaw
  const value = divideBy && divideBy > 0 ? total / divideBy : total
  return <>{fmtBRL(value)}</>
}
