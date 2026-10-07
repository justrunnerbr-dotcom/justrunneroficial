'use client'

/**
 * O card grande de Lucro Líquido, com a conta aberta no hover.
 *
 * Existia como JSX solto dentro de admin/page.tsx (Server Component), então não
 * tinha como guardar estado de hover. Virou client component só por isso — o
 * visual é o mesmo de antes, linha por linha.
 *
 * A conta exibida é exatamente a de `financial-breakdown.ts`:
 *
 *   lucro = receita − CMV − frete − logística − gateway − taxa Yampi
 *           − mensalidade Yampi − tributo de mídia − imposto − Meta − Google
 *
 * Linha com valor zero NÃO é escondida. Um custo zerado quase sempre significa
 * "não configurado", não "não existe" — e sumir com ele é o que faz o Lucro
 * Líquido parecer maior do que é sem ninguém perceber. Aqui o zero aparece,
 * marcado, para dar na vista.
 */

import { useState } from 'react'

const COLORS = {
  card:      'var(--admin-card)',
  bg:        'var(--admin-bg)',
  border:    'var(--admin-border)',
  textMain:  'var(--admin-text-main)',
  textSec:   'var(--admin-text-sec)',
  textMuted: 'var(--admin-text-muted)',
  green:     'var(--admin-accent)',
  red:       'var(--admin-red)',
  alert:     'var(--admin-alert)',
}

export interface LucroLiquidoProps {
  revenue:        number
  productCost:    number
  freightCost:    number
  /** parte do frete que o cliente pagou (entra e sai, não pesa no lucro) */
  freightPassThrough?: number
  logisticsCost:  number
  gatewayFee:     number
  yampiFee:       number
  yampiMonthly:   number
  mediaTax:       number
  salesTax:       number
  metaSpend:      number
  googleAdsSpend: number
  netProfit:      number
  margin:         number
  missingCostSources: string[]
  /** série do gráfico de barras do rodapé; sem ela, mantém o desenho decorativo antigo */
  sparkline?:     number[]
}

const fmt = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
const fmtExato = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export function LucroLiquidoCard(p: LucroLiquidoProps) {
  const [aberto, setAberto] = useState(false)

  const custos = [
    { label: 'Custo do produto (CMV)', valor: p.productCost },
    // O frete que o cliente pagou entra na receita e sai igual para a
    // transportadora — fica numa linha à parte pra não parecer gasto da loja.
    { label: 'Frete pago pela loja',   valor: p.freightCost - (p.freightPassThrough ?? 0) },
    { label: 'Frete repassado (pago pelo cliente)', valor: p.freightPassThrough ?? 0 },
    { label: 'Logística por pedido',   valor: p.logisticsCost },
    { label: 'Taxa AppMax (gateway)',  valor: p.gatewayFee },
    { label: 'Taxa Yampi (% pedido)',  valor: p.yampiFee },
    { label: 'Mensalidade Yampi',      valor: p.yampiMonthly },
    { label: 'Tributo sobre mídia',    valor: p.mediaTax },
    { label: 'Imposto s/ faturamento', valor: p.salesTax },
    { label: 'Meta Ads',               valor: p.metaSpend },
    { label: 'Google Ads',             valor: p.googleAdsSpend },
  ]
  const totalCustos = custos.reduce((s, c) => s + c.valor, 0)
  const pct = (v: number) => (p.revenue > 0 ? `${(v / p.revenue * 100).toFixed(1)}%` : '—')

  const barras = p.sparkline?.length ? p.sparkline : [30, 45, 20, 60, 40, 80, 50, 90, 70, 100]

  return (
    <div
      onMouseEnter={() => setAberto(true)}
      onMouseLeave={() => setAberto(false)}
      style={{
        position: 'relative',
        background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: '16px',
        padding: '28px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        boxShadow: '0 8px 30px rgba(0,0,0,0.3)', height: '100%',
      }}
    >
      <div>
        <div style={{ fontSize: '13px', fontWeight: 600, color: COLORS.textSec, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
          Lucro Líquido
        </div>
        <div style={{ fontSize: '36px', fontWeight: 800, color: p.netProfit >= 0 ? COLORS.textMain : COLORS.red, fontFamily: 'monospace', marginBottom: '8px' }}>
          {fmt(p.netProfit)}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '11px', fontWeight: 600, color: p.margin >= 0 ? COLORS.green : COLORS.red, background: p.margin >= 0 ? 'rgba(var(--admin-accent-rgb), 0.1)' : 'rgba(var(--admin-red-rgb), 0.1)', padding: '2px 6px', borderRadius: '4px' }}>
            {(p.margin * 100).toFixed(1)}% margem
          </span>
          <span style={{ fontSize: '13px', color: COLORS.textMuted }}>Receita {fmt(p.revenue)}</span>
        </div>
      </div>

      <div style={{ height: '60px', marginTop: '24px', display: 'flex', alignItems: 'flex-end', gap: '4px' }}>
        {barras.map((h, i) => (
          <div key={i} style={{ flex: 1, background: 'linear-gradient(to top, rgba(var(--admin-accent-rgb), 0.05), rgba(var(--admin-accent-rgb), 0.4))', height: `${h}%`, borderRadius: '2px 2px 0 0', borderTop: `1px solid ${COLORS.green}` }} />
        ))}
      </div>

      {aberto && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', left: 0,
          zIndex: 50, width: 'min(360px, calc(100vw - 32px))',
          background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: '12px',
          padding: '16px 18px', boxShadow: '0 16px 40px rgba(0,0,0,0.45)',
        }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
            Como chega nesse valor
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0' }}>
            <span style={{ fontSize: '12px', color: COLORS.textSec }}>Receita</span>
            <span style={{ fontSize: '12px', fontWeight: 700, color: COLORS.textMain, fontFamily: 'monospace' }}>{fmtExato(p.revenue)}</span>
          </div>

          <div style={{ borderTop: `1px solid ${COLORS.border}`, margin: '6px 0' }} />

          {custos.map((c) => {
            const zerado = c.valor === 0
            return (
              <div key={c.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', padding: '4px 0' }}>
                <span style={{ fontSize: '12px', color: zerado ? COLORS.textMuted : COLORS.textSec, display: 'flex', alignItems: 'center', gap: '5px' }}>
                  {c.label}
                  {zerado && <span title="Zerado — pode ser custo não configurado" style={{ color: COLORS.alert, fontSize: '11px' }}>*</span>}
                </span>
                <span style={{ fontSize: '12px', fontWeight: 600, color: zerado ? COLORS.textMuted : COLORS.red, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                  −{fmtExato(c.valor)}
                  <span style={{ color: COLORS.textMuted, fontWeight: 400, marginLeft: '6px' }}>{pct(c.valor)}</span>
                </span>
              </div>
            )
          })}

          <div style={{ borderTop: `1px solid ${COLORS.border}`, margin: '8px 0 6px' }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '2px 0' }}>
            <span style={{ fontSize: '12px', color: COLORS.textSec }}>Custo total</span>
            <span style={{ fontSize: '12px', fontWeight: 700, color: COLORS.red, fontFamily: 'monospace' }}>
              −{fmtExato(totalCustos)}<span style={{ color: COLORS.textMuted, fontWeight: 400, marginLeft: '6px' }}>{pct(totalCustos)}</span>
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', paddingTop: '8px', borderTop: `1px solid ${COLORS.border}` }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: COLORS.textMain }}>Lucro Líquido</span>
            <span style={{ fontSize: '14px', fontWeight: 800, color: p.netProfit >= 0 ? COLORS.green : COLORS.red, fontFamily: 'monospace' }}>
              {fmtExato(p.netProfit)}
            </span>
          </div>

          {custos.some(c => c.valor === 0) && (
            <div style={{ fontSize: '10px', color: COLORS.alert, marginTop: '8px', lineHeight: 1.4 }}>
              * linha zerada: ou a loja realmente não paga, ou o custo não está configurado.
            </div>
          )}

          {p.missingCostSources.length > 0 && (
            <div style={{ fontSize: '10px', color: COLORS.alert, marginTop: '6px', lineHeight: 1.4 }}>
              ⚠ Sem {p.missingCostSources.join(' e ')} — o lucro real é menor que este.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
