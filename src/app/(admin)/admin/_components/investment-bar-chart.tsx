'use client'

import { useContext } from 'react'
import { MetaTaxContext } from './meta-tax-toggle'

export interface InvestmentBarSource {
  name:   string
  spend:  number
  isMeta: boolean // só o Meta tem o imposto de 13,8% aplicável, Google Ads não
}

function fmtBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value)
}

// Gráfico de investimento por conta/plataforma, mesmo visual do mini-gráfico
// do card "Lucro Líquido" — mas com dados reais (uma barra por conta Meta +
// Google Ads) em vez de decorativo.
export function InvestmentBarChart({ sources }: { sources: InvestmentBarSource[] }) {
  const { applyTax } = useContext(MetaTaxContext)

  const values = sources.map(s => (s.isMeta ? applyTax(s.spend) : s.spend))
  const maxValue = Math.max(...values, 1)

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px', height: '76px', marginTop: '20px' }}>
      {sources.map((s, i) => {
        const value = values[i]
        const heightPct = Math.max((value / maxValue) * 100, value > 0 ? 4 : 0)
        return (
          <div key={s.name} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
            <span style={{ fontSize: '9px', color: 'var(--admin-text-muted)', marginBottom: '4px', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
              {fmtBRL(value)}
            </span>
            <div style={{
              width: '100%',
              height: `${heightPct}%`,
              background: 'linear-gradient(to top, rgba(var(--admin-accent-rgb), 0.08), rgba(var(--admin-accent-rgb), 0.45))',
              borderRadius: '3px 3px 0 0',
              borderTop: '1px solid var(--admin-accent)',
            }} />
            <span style={{ fontSize: '9px', color: 'var(--admin-text-muted)', marginTop: '5px', whiteSpace: 'nowrap' }}>{s.name}</span>
          </div>
        )
      })}
    </div>
  )
}
