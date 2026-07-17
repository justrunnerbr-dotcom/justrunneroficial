'use client'

import { useContext, useState } from 'react'
import { TrendingUp } from 'lucide-react'
import { MetaTaxContext } from './meta-tax-toggle'

const COLORS = {
  card:      'var(--admin-card)',
  border:    'var(--admin-border)',
  textMain:  'var(--admin-text-main)',
  textSec:   'var(--admin-text-sec)',
  textMuted: 'var(--admin-text-muted)',
}

interface Props {
  revenue:   number
  netProfit: number
  metaRaw:   number
  googleRaw: number
}

// ROAS = receita ÷ gasto em ads (ignora outros custos, mostra retorno bruto
// por real investido em anúncio). ROI = lucro líquido ÷ gasto em ads (já
// descontando produto, frete, taxas e impostos — reflete o retorno real do
// negócio, não só a margem bruta sobre o anúncio). Clicar alterna qual
// aparece nesse card, sem ocupar dois espaços.
export function RoasRoiCard({ revenue, netProfit, metaRaw, googleRaw }: Props) {
  const { applyTax } = useContext(MetaTaxContext)
  const [metric, setMetric] = useState<'roas' | 'roi'>('roas')

  const spend = applyTax(metaRaw) + googleRaw
  const roas  = spend > 0 ? revenue / spend : 0
  const roi   = spend > 0 ? (netProfit / spend) * 100 : 0

  const value = spend > 0
    ? (metric === 'roas' ? `${roas.toFixed(2)}×` : `${roi.toFixed(0)}%`)
    : '—'

  return (
    <div style={{
      background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: '14px',
      padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', background: 'var(--admin-bg)', border: `1px solid ${COLORS.border}`, borderRadius: '99px', padding: '2px' }}>
          {(['roas', 'roi'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMetric(m)}
              style={{
                fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px',
                padding: '3px 10px', borderRadius: '99px', border: 'none', cursor: 'pointer',
                background: metric === m ? 'var(--admin-accent)' : 'transparent',
                color: metric === m ? '#fff' : COLORS.textMuted,
              }}
            >
              {m}
            </button>
          ))}
        </div>
        <TrendingUp size={16} color={COLORS.textMuted} />
      </div>
      <div style={{ fontSize: '24px', fontWeight: 700, color: COLORS.textMain, fontFamily: 'monospace' }}>{value}</div>
      <div style={{ fontSize: '12px', color: COLORS.textMuted }}>
        {metric === 'roas' ? 'Retorno por real investido' : 'Retorno sobre o investimento'}
      </div>
    </div>
  )
}
