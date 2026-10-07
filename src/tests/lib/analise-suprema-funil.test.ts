import { describe, it, expect } from 'vitest'
import { buildFunnel, type DailyAnalyticsRow, type SessionUniqueCounts } from '@/lib/admin/analise-suprema-funil'

const dia = (over: Partial<DailyAnalyticsRow> = {}): DailyAnalyticsRow => ({
  date: '2026-08-12', sessions: 1000, productViews: 4000, addToCarts: 100,
  checkoutStarts: 40, orders: 10, revenue: 3000, ...over,
})

describe('buildFunnel', () => {
  it('soma os dias da janela', () => {
    const f = buildFunnel([dia(), dia({ date: '2026-08-13' })])
    expect(f.sessions).toBe(2000)
    expect(f.orders).toBe(20)
    expect(f.revenue).toBe(6000)
  })

  it('calcula taxa de conversao sobre sessoes', () => {
    const f = buildFunnel([dia({ sessions: 1000, orders: 15 })])
    expect(f.conversionRate).toBeCloseTo(1.5, 5)
  })

  it('calcula ticket medio', () => {
    const f = buildFunnel([dia({ orders: 10, revenue: 3000 })])
    expect(f.aov).toBe(300)
  })

  it('nao calcula taxa para visualizacao de produto', () => {
    // productViews conta evento, não sessão: a taxa passaria de 100% e não
    // significaria nada.
    const f = buildFunnel([dia({ sessions: 1000, productViews: 4000 })])
    expect(f.steps.find(s => s.key === 'productViews')!.rateFromPrev).toBeNull()
  })

  it('calcula taxa entre os passos comparaveis', () => {
    const f = buildFunnel([dia({ productViews: 1000, addToCarts: 100, checkoutStarts: 50, orders: 25 })])
    expect(f.steps.find(s => s.key === 'addToCarts')!.rateFromPrev).toBeCloseTo(10, 5)
    expect(f.steps.find(s => s.key === 'checkoutStarts')!.rateFromPrev).toBeCloseTo(50, 5)
    expect(f.steps.find(s => s.key === 'orders')!.rateFromPrev).toBeCloseTo(50, 5)
  })

  it('identifica o gargalo como a pior taxa', () => {
    const f = buildFunnel([dia({ productViews: 1000, addToCarts: 20, checkoutStarts: 15, orders: 12 })])
    expect(f.bottleneck!.key).toBe('addToCarts')  // 2% é bem pior que 75% e 80%
  })

  it('conta quantos se perderam em cada passo', () => {
    const f = buildFunnel([dia({ productViews: 1000, addToCarts: 100 })])
    expect(f.steps.find(s => s.key === 'addToCarts')!.dropoff).toBe(900)
  })

  it('dia sem sessao nao gera NaN nem Infinity', () => {
    const f = buildFunnel([dia({ sessions: 0, productViews: 0, addToCarts: 0, checkoutStarts: 0, orders: 0, revenue: 0 })])
    expect(f.conversionRate).toBe(0)
    expect(f.aov).toBe(0)
    expect(f.steps.every(s => s.rateFromPrev === null || Number.isFinite(s.rateFromPrev))).toBe(true)
  })

  it('janela vazia nao quebra', () => {
    const f = buildFunnel([])
    expect(f.sessions).toBe(0)
    expect(f.conversionRate).toBe(0)
    expect(f.steps).toHaveLength(5)
  })

  it('dropoff nunca e negativo mesmo com dado inconsistente', () => {
    // ATC maior que views acontece quando o evento de view falha em gravar.
    const f = buildFunnel([dia({ productViews: 10, addToCarts: 50 })])
    expect(f.steps.find(s => s.key === 'addToCarts')!.dropoff).toBe(0)
  })
})

describe('buildFunnel com contagem por sessao unica', () => {
  const unicos = (over: Partial<SessionUniqueCounts> = {}): SessionUniqueCounts => ({
    productViews: 600, addToCarts: 50, checkoutStarts: 30, ...over,
  })

  it('mantem a contagem por evento em value e a por sessao em uniqueValue', () => {
    const f = buildFunnel([dia({ addToCarts: 100 })], unicos({ addToCarts: 50 }))
    const atc = f.steps.find(s => s.key === 'addToCarts')!
    expect(atc.value).toBe(100)        // evento: C1L2 dispara 2x por sessão
    expect(atc.uniqueValue).toBe(50)   // gente de verdade
  })

  it('calcula as taxas sobre sessao, nao sobre evento', () => {
    // 50 sessões com ATC de 600 que viram produto = 8,33%. Pela contagem de
    // evento seria 100/4000 = 2,5% — número que não descreve pessoa nenhuma.
    const f = buildFunnel([dia({ productViews: 4000, addToCarts: 100 })], unicos({ productViews: 600, addToCarts: 50 }))
    expect(f.steps.find(s => s.key === 'addToCarts')!.rateFromPrev).toBeCloseTo(8.3333, 3)
  })

  it('passa a calcular taxa de visualizacao de produto, que por evento era impossivel', () => {
    const f = buildFunnel([dia({ sessions: 1000, productViews: 4000 })], unicos({ productViews: 600 }))
    expect(f.steps.find(s => s.key === 'productViews')!.rateFromPrev).toBeCloseTo(60, 5)
  })

  it('o gargalo muda quando a promocao infla o add to cart', () => {
    // Compre 1 Leve 2: 2 eventos de ATC por sessão. Pela contagem de evento o
    // funil acusa o checkout como gargalo; por sessão o gargalo real é o ATC.
    const linha = dia({ sessions: 1000, productViews: 4000, addToCarts: 400, checkoutStarts: 120, orders: 60 })

    const porEvento = buildFunnel([linha])
    expect(porEvento.bottleneck!.key).toBe('addToCarts')

    const porSessao = buildFunnel([linha], unicos({ productViews: 900, addToCarts: 200, checkoutStarts: 120 }))
    expect(porSessao.bottleneck!.key).toBe('addToCarts')
    // A taxa que a decisão usa deixa de ser a inflada pela promoção.
    expect(porSessao.bottleneck!.rateFromPrev).toBeCloseTo(22.2222, 3)
  })

  it('sem contagem por sessao o comportamento antigo e preservado', () => {
    const f = buildFunnel([dia()])
    expect(f.steps.every(s => s.uniqueValue === null)).toBe(true)
    expect(f.countedBy).toBe('event')
  })

  it('marca a unidade de contagem em uso', () => {
    expect(buildFunnel([dia()], unicos()).countedBy).toBe('session')
  })

  it('sessao zerada nao gera taxa infinita', () => {
    const f = buildFunnel([dia({ sessions: 0 })], unicos({ productViews: 0, addToCarts: 0, checkoutStarts: 0 }))
    expect(f.steps.every(s => s.rateFromPrev === null || Number.isFinite(s.rateFromPrev))).toBe(true)
  })
})
