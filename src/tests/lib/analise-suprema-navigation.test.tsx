import { describe, expect, it, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import type { ComponentProps } from 'react'
import { AnaliseSupremaTabs } from '@/app/(admin)/admin/analise-suprema/_components/analise-suprema-tabs'

const props: ComponentProps<typeof AnaliseSupremaTabs> = {
  configured: false, accountsData: [], rangeLabel: 'Hoje', feedPorJanela: {}, produtos: [], periodoLabel: 'Últimos 7 dias',
  margem: { revenue: 0, cogs: 0, fees: 0, shipping: 0, logistics: 0, marketing: 0, netProfit: 0, coveragePct: 0, itemsWithoutCost: 0, itemsTotal: 0, cogsEstimado: 0 },
  canais: { channels: [], attributedRevenue: 0, unattributedRevenue: 0, coveragePct: 0 }, regioes: [],
  funil: { steps: [], sessions: 0, orders: 0, revenue: 0, conversionRate: 0, aov: 0, bottleneck: null, countedBy: 'event' },
  clientes: { totalCustomers: 0, repeatCustomers: 0, repeatRatePct: 0, avgLtv: 0, avgOrdersPerCustomer: 0, revenueFromRepeat: 0, revenueFromSingle: 0, atRisk: [] },
  ofertas: [], devolucoes: { naoPagos: { orders: 0, value: 0 }, estornosMes: { mes: '', valor: null, receitaBruta: 0 } },
  mes: { revenue: 0, dayOfMonth: 1, daysInMonth: 30 }, metaMes: 200000,
  midia: { spend: 0, attributedRevenue: 0, unattributedRevenue: 0, attributedOrders: 0, unattributedOrders: 0, roasMin: 0, roasMax: 0, cpaMin: 0, cpaMax: 0, declaredRoas: null, declaredCpa: null },
  financeiro: { revenue: 0, productCost: 0, freightCost: 0, freightPassThrough: 0, logisticsCost: 0, gatewayFee: 0, yampiFee: 0, yampiMonthly: 0, mediaTax: 0, salesTax: 0, salesTaxConfigured: false, metaSpend: 0, googleAdsSpend: 0, netProfit: 0, margin: 0, metaTrusted: false, googleAdsTrusted: false, missingCostSources: ['Meta'] },
  linhasDoMes: [], sinaisCampanha: [],
  referencias: null, calendario: null, vendasPorCampanha: {},
}

const modules = ['Resumo', 'Visão Diária', 'Produtos', 'Canais & Região', 'Ofertas & Devolução', 'Supremo', 'Calendário & Sazonalidade', 'Funil TOFU/MOFU/BOFU', 'Saúde do Criativo', 'Alertas & Recomendações']

describe('Navegação e estados vazios da Análise Suprema', () => {
  beforeEach(() => window.history.replaceState(null, '', '/admin/analise-suprema'))
  it.each(modules)('abre %s sem dados e sem quebrar a renderização', name => {
    const { container } = render(<AnaliseSupremaTabs {...props} />)
    fireEvent.click(screen.getByRole('link', { name }))
    expect(screen.getByRole('region', { name })).toBeInTheDocument()
    expect(container.innerHTML).not.toMatch(/NaN|Infinity/)
  })
  it('restaura a seção indicada no endereço', () => {
    window.history.replaceState(null, '', '#produtos')
    render(<AnaliseSupremaTabs {...props} />)
    expect(screen.getByRole('region', { name: 'Produtos' })).toBeInTheDocument()
    act(() => { window.history.replaceState(null, '', '#diaria'); window.dispatchEvent(new HashChangeEvent('hashchange')) })
    expect(screen.getByRole('region', { name: 'Visão Diária' })).toBeInTheDocument()
  })
  it('abas com dados reais (referências, calendário e vendas) não mostram NaN nem Infinity', () => {
    const cheio = {
      ...props,
      referencias: { mes: '2026-09', ticket: 291.24, cpaEquilibrio: 122.95, cpaEscala: 78.14, merEquilibrio: 2.37, merEscala: 3.73, comFixos: true, estimado: false },
      calendario: {
        periodo: { start: '2026-07-08', endExclusive: '2026-10-06', dias: 90 },
        diasDaSemana: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((label, i) => ({ label, avgSpend: 1500 + i, mer: i === 6 ? null : 3 + i / 10, dias: i === 6 ? 0 : 12 })),
        pagamento: { merDias5e20: null, merDemais: 3.4, ocorrencias: 2, confirmado: false, nota: 'Hipótese não confirmada.' },
        meses: [{ mes: '2025-12', label: 'Dez/25', receita: 410191.27, midia: 129967.92, mer: 3.16, fonte: 'historico' as const, parcial: false }],
      },
      linhasDoMes: [{ date: '2026-10-01', day: 1, weekday: 'Qui', lucro: 1200, investimento: 3800, roas: 2.7, ticketMedio: 285, vendas: 36, receita: 10264, cliques: 0, compras: 36, horarioPico: '—', vsHistorico: { status: 'media' as const, pct: 0 }, isToday: false, isFuture: false }],
    }
    for (const hash of ['#diaria', '#calendario', '#alertas', '#supremo', '#ofertas']) {
      window.history.replaceState(null, '', hash)
      const { container, unmount } = render(<AnaliseSupremaTabs {...cheio} />)
      expect(container.innerHTML).not.toMatch(/NaN|Infinity/)
      unmount()
    }
  })

  it('não inventa comparação com mês anterior', () => {
    window.history.replaceState(null, '', '#supremo')
    render(<AnaliseSupremaTabs {...props} />)
    // A comparação mensal não é inventada aqui: aponta para os meses fechados do Calendário.
    expect(screen.getByText('Veja os meses fechados em Calendário & Sazonalidade')).toBeInTheDocument()
  })
})
