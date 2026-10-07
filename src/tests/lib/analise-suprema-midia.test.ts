import { describe, it, expect } from 'vitest'
import { midiaRange, inflacaoDeclarada, riscoDeEscala, type MidiaInput } from '@/lib/admin/analise-suprema-midia'

// Números reais medidos em 24/06–17/08 de 2026.
const real: MidiaInput = {
  spend: 47240.61,
  attributedRevenue: 121359.08,
  attributedOrders: 411,
  unattributedRevenue: 86971,
  unattributedOrders: 289,
  declaredRevenue: 256116.78,
  declaredPurchases: 862,
}

describe('midiaRange', () => {
  it('devolve faixa, nao valor unico', () => {
    const r = midiaRange(real)
    expect(r.roasMin).toBeCloseTo(2.57, 1)
    expect(r.roasMax).toBeCloseTo(4.41, 1)
    expect(r.roasMin).toBeLessThan(r.roasMax)
  })

  it('CPA do pior caso usa so os pedidos atribuidos', () => {
    const r = midiaRange(real)
    expect(r.cpaMax).toBeCloseTo(114.94, 1)
    expect(r.cpaMin).toBeCloseTo(67.49, 1)
    expect(r.cpaMin).toBeLessThan(r.cpaMax)
  })

  it('guarda o que a Meta declara para expor a divergencia', () => {
    const r = midiaRange(real)
    expect(r.declaredRoas).toBeCloseTo(5.42, 1)
    expect(r.declaredCpa).toBeCloseTo(54.8, 1)
  })

  it('sem investimento nao divide por zero', () => {
    const r = midiaRange({ ...real, spend: 0 })
    expect(r.roasMin).toBe(0)
    expect(r.roasMax).toBe(0)
    expect(r.declaredRoas).toBeNull()
  })

  it('sem pedido nenhum nao gera Infinity', () => {
    const r = midiaRange({ ...real, attributedOrders: 0, unattributedOrders: 0 })
    expect(Number.isFinite(r.cpaMin)).toBe(true)
    expect(Number.isFinite(r.cpaMax)).toBe(true)
  })

  it('sem dado declarado devolve null em vez de inventar', () => {
    const r = midiaRange({ ...real, declaredRevenue: undefined, declaredPurchases: undefined })
    expect(r.declaredRoas).toBeNull()
    expect(r.declaredCpa).toBeNull()
  })

  it('atribuicao completa fecha a faixa num ponto', () => {
    const r = midiaRange({ ...real, unattributedRevenue: 0, unattributedOrders: 0 })
    expect(r.roasMin).toBeCloseTo(r.roasMax, 5)
    expect(r.cpaMin).toBeCloseTo(r.cpaMax, 5)
  })
})

describe('inflacaoDeclarada', () => {
  it('mede o quanto a Meta reivindica a mais', () => {
    const inf = inflacaoDeclarada(midiaRange(real))!
    expect(inf).toBeGreaterThan(100)   // declara mais que o dobro
  })

  it('null quando nao ha numero declarado', () => {
    expect(inflacaoDeclarada(midiaRange({ ...real, declaredRevenue: undefined }))).toBeNull()
  })
})

describe('riscoDeEscala', () => {
  const BREAKEVEN = 125

  it('CPA do pior caso acima do breakeven e critico', () => {
    // R$ 114,94 de piso... não: cpaMax é 114,94, abaixo de 125 -> atenção
    expect(riscoDeEscala(midiaRange(real), BREAKEVEN)).toBe('atencao')
  })

  it('marca critico quando o pior caso passa do breakeven', () => {
    const r = midiaRange({ ...real, attributedOrders: 300 })  // CPA pior sobe pra ~157
    expect(riscoDeEscala(r, BREAKEVEN)).toBe('critico')
  })

  it('marca seguro com folga real', () => {
    const r = midiaRange({ ...real, attributedOrders: 1000 })  // CPA pior ~47
    expect(riscoDeEscala(r, BREAKEVEN)).toBe('seguro')
  })

  it('sem pedido nao acusa risco falso', () => {
    const r = midiaRange({ ...real, attributedOrders: 0, unattributedOrders: 0 })
    expect(riscoDeEscala(r, BREAKEVEN)).toBe('seguro')
  })
})
