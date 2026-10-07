'use client'

import { useState } from 'react'
import { Card, MiniStat } from './shared'
import type { FeedItem } from '@/lib/admin/analise-suprema-insights'
import type { MarginBreakdown, WindowDays } from '@/lib/admin/analise-suprema-source'
import type { FunnelWindow } from '@/lib/admin/analise-suprema-funil'
import type { CustomerStats } from '@/lib/admin/analise-suprema-clientes'
import type { FinancialBreakdown } from '@/lib/admin/financial-breakdown'
import { FunilCard, ClientesCard } from './funil-clientes'
import { WINDOWS } from '@/lib/admin/analise-suprema-source'

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const COR: Record<string, string> = {
  good: 'var(--admin-green)',
  warn: 'var(--admin-alert)',
  crit: 'var(--admin-red)',
}

type Props = {
  feedPorJanela: Record<number, FeedItem[]>
  margem: MarginBreakdown
  periodoLabel: string
  funil: FunnelWindow
  clientes: CustomerStats
  financeiro: FinancialBreakdown
}

export function ResumoTab({ feedPorJanela, margem, periodoLabel, funil, clientes, financeiro }: Props) {
  const [janela, setJanela] = useState<WindowDays>(7)
  const [expandido, setExpandido] = useState(false)

  const prioridade: Record<string, number> = { crit: 0, warn: 1, good: 2 }
  const feed = [...(feedPorJanela[janela] ?? [])].sort((a, b) => (prioridade[a.severity] ?? 3) - (prioridade[b.severity] ?? 3))
  const visiveis = expandido ? feed : feed.slice(0, 3)

  const pctEstimado = margem.cogs > 0 ? (margem.cogsEstimado / margem.cogs) * 100 : 0
  const custoImpreciso = margem.coveragePct < 100 || margem.cogsEstimado > 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
      <Card
        title="Prioridades do período"
        desc="Cada item compara a janela escolhida com o período anterior de mesmo tamanho."
        action={
          <div style={{ display: 'flex', gap: 'var(--sp-1)', overflowX: 'auto', maxWidth: '100%' }}>
            {WINDOWS.map(w => {
              const ativo = w === janela
              return (
                <button
                  key={w}
                  onClick={() => { setJanela(w); setExpandido(false) }}
                  style={{
                    minHeight: '36px', padding: '6px 10px', fontSize: 'var(--fs-xs)', fontWeight: ativo ? 700 : 500,
                    borderRadius: '999px', whiteSpace: 'nowrap', cursor: 'pointer',
                    border: `1px solid ${ativo ? 'var(--admin-accent)' : 'var(--admin-border)'}`,
                    background: ativo ? 'color-mix(in srgb, var(--admin-accent) 10%, transparent)' : 'transparent',
                    color: ativo ? 'var(--admin-accent)' : 'var(--admin-text-muted)',
                  }}
                >
                  {w}d
                </button>
              )
            })}
          </div>
        }
      >
        {visiveis.length === 0 ? (
          <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--admin-text-muted)', padding: '10px 0', lineHeight: 'var(--lh-normal)' }}>
            Nada fugiu do padrão nesta janela. Ou o período é curto demais para comparar,
            ou a operação está estável.
          </div>
        ) : (
          <div key={janela} className="as-anim" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
            {visiveis.map((item, idx) => {
              const cor = COR[item.severity] ?? 'var(--admin-text-main)'
              return (
                <div
                  key={`${item.kind}-${item.subject}-${idx}`}
                  style={{ display: 'flex', gap: 'var(--sp-4)', alignItems: 'flex-start' }}
                >
                  <div style={{
                    minWidth: '84px', fontSize: 'var(--fs-md)', fontWeight: 700, color: cor,
                    fontFamily: 'monospace', lineHeight: 1.3,
                  }}>
                    {item.narrative.headline}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      margin: 0, fontSize: 'var(--fs-sm)', color: 'var(--admin-text-sec)',
                      lineHeight: 1.65, fontWeight: 400,
                    }}>
                      {item.narrative.body}
                    </p>
                    {item.narrative.actionHint && (
                      <div style={{ marginTop: 'var(--sp-1)', fontSize: 'var(--fs-xs)', color: 'var(--admin-text-muted)' }}>
                        Sugestão: {item.narrative.actionHint} · <a href="#alertas" style={{ color: 'var(--admin-accent)' }}>Ver alertas</a>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}

            {feed.length > 3 && (
              <button
                onClick={() => setExpandido(v => !v)}
                style={{
                  alignSelf: 'flex-start', fontSize: 'var(--fs-xs)', color: 'var(--admin-accent)',
                  background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px 0',
                }}
              >
                {expandido ? 'Ver menos' : `Ver mais ${feed.length - 3}`}
              </button>
            )}
          </div>
        )}
      </Card>



      {custoImpreciso && (
        <div style={{
          background: 'var(--admin-alert-soft)', border: '1px solid var(--admin-alert)',
          borderRadius: 'var(--r-md)', padding: '12px 16px', fontSize: 'var(--fs-sm)',
          color: 'var(--admin-text-sec)', lineHeight: 'var(--lh-normal)',
        }}>
          <strong style={{ color: 'var(--admin-alert)' }}>Parte do custo é estimada.</strong>{' '}
          {margem.itemsWithoutCost > 0 && (
            <>{margem.itemsWithoutCost} de {margem.itemsTotal} itens não têm custo nem cadastro nem modelo
            irmão para estimar, e não foram descontados do CMV. O lucro pode estar superestimado. </>
          )}
          {margem.cogsEstimado > 0 && (
            <>{brl(margem.cogsEstimado)} do custo de produto ({pctEstimado.toFixed(0)}%)
            vem de estimativa pela mediana do mesmo modelo, não de cadastro. Completar os custos das variantes torna esse valor exato.</>
          )}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: 'var(--sp-4)' }}>
        <MiniStat
          label="Taxa de conversão"
          value={`${funil.conversionRate.toFixed(2)}%`}
          sub={`${funil.orders} pedidos em ${funil.sessions.toLocaleString('pt-BR')} sessões`}
          color="var(--admin-text-main)"
        />
        <MiniStat
          label="Ticket médio real"
          value={brl(funil.aov)}
          sub={periodoLabel}
          color="var(--admin-text-main)"
        />
      </div>

      <FunilCard funil={funil} />

      <details style={{ border: '1px solid var(--admin-border)', borderRadius: 'var(--r-md)', padding: '12px 16px' }}>
        <summary style={{ cursor: 'pointer', fontWeight: 600, color: 'var(--admin-text-main)', minHeight: '32px' }}>Composição do lucro e custos</summary>
        <div style={{ marginTop: '12px' }}>
      <Card title="De onde sai o lucro" desc="Todas as linhas que o admin desconta da receita, na mesma conta usada no Dashboard.">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: 'var(--sp-3)', fontSize: 'var(--fs-sm)' }}>
          {[
            ['Receita', financeiro.revenue, 'var(--admin-accent)'],
            ['Produto', -financeiro.productCost, 'var(--admin-text-sec)'],
            ['Frete pago pela loja', -(financeiro.freightCost - financeiro.freightPassThrough), 'var(--admin-text-sec)'],
            ['Frete repassado (pago pelo cliente)', -financeiro.freightPassThrough, 'var(--admin-text-muted)'],
            ['Logística (por pedido)', -financeiro.logisticsCost, 'var(--admin-text-sec)'],
            ['Gateway', -financeiro.gatewayFee, 'var(--admin-text-sec)'],
            ['Taxa Yampi', -financeiro.yampiFee, 'var(--admin-text-sec)'],
            ['Mensalidade Yampi', -financeiro.yampiMonthly, 'var(--admin-text-sec)'],
            ['Mídia', -(financeiro.metaSpend + financeiro.googleAdsSpend), 'var(--admin-text-sec)'],
            ['Tributo da mídia', -financeiro.mediaTax, 'var(--admin-text-sec)'],
            // Imposto sem alíquota configurada aparece como lacuna, não como
            // R$ 0,00 — zero aqui leria como "não paga imposto".
            financeiro.salesTaxConfigured
              ? ['Imposto sobre vendas', -financeiro.salesTax, 'var(--admin-text-sec)']
              : ['Imposto sobre vendas', null, 'var(--admin-alert)'],
            ['Lucro líquido', financeiro.netProfit, financeiro.netProfit > 0 ? 'var(--admin-green)' : 'var(--admin-red)'],
          ].map(([label, valor, cor]) => (
            <div key={label as string} style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--sp-2)', padding: '6px 0', borderBottom: '1px solid var(--admin-border)' }}>
              <span style={{ color: 'var(--admin-text-muted)' }}>{label as string}</span>
              <strong style={{ fontFamily: 'monospace', color: cor as string }}>
                {valor === null ? 'não configurado' : brl(valor as number)}
              </strong>
            </div>
          ))}
        </div>
      </Card>
        </div>
      </details>
      <details style={{ border: '1px solid var(--admin-border)', borderRadius: 'var(--r-md)', padding: '12px 16px' }}>
        <summary style={{ cursor: 'pointer', fontWeight: 600, color: 'var(--admin-text-main)', minHeight: '32px' }}>Base de clientes e recorrência</summary>
        <div style={{ marginTop: '12px' }}><ClientesCard clientes={clientes} /></div>
      </details>


    </div>
  )
}
