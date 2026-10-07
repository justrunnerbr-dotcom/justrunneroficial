import { describe, it, expect } from 'vitest'
import { classificarOferta, razaoPaga, compararOfertas } from '@/lib/admin/analise-suprema-ofertas'

describe('classificarOferta', () => {
  it('reconhece as tres ofertas ativas', () => {
    expect(classificarOferta('[SO] Permian All Black')).toBe('leve2')
    expect(classificarOferta('[OP] Permian All Black')).toBe('avulso')
    expect(classificarOferta('[BUMP] Case + Microbag')).toBe('bump')
    // Prefixos da Just Runner
    expect(classificarOferta('[JR] Radar EV Preta   Lente Espelhada')).toBe('leve2')
    expect(classificarOferta('[JR OP] Flak Preta   Lente Preta')).toBe('avulso')
    expect(classificarOferta('[JR COMBO] Combo 10')).toBe('combo')
  })

  it('trata catalogo antigo como legado', () => {
    expect(classificarOferta('Óculos de Sol Just Runner preto')).toBe('legado')
    expect(classificarOferta(null)).toBe('legado')
    expect(classificarOferta('')).toBe('legado')
  })

  it('ignora caixa e espaco', () => {
    expect(classificarOferta('  [so] permian ')).toBe('leve2')
  })
})

describe('razaoPaga', () => {
  it('pedido 1L2 paga metade do preco de tabela', () => {
    // 2 itens de R$ 297 = R$ 594 de tabela, R$ 297 de desconto.
    expect(razaoPaga(594, 297)).toBeCloseTo(0.5, 5)
  })

  it('pedido sem desconto paga o preco cheio', () => {
    expect(razaoPaga(175, 0)).toBe(1)
  })

  it('desconto maior que o subtotal nao vira razao negativa', () => {
    expect(razaoPaga(100, 150)).toBe(0)
  })

  it('subtotal zero nao divide por zero', () => {
    expect(razaoPaga(0, 0)).toBe(1)
    expect(Number.isFinite(razaoPaga(0, 50))).toBe(true)
  })

  it('nunca passa de 1', () => {
    expect(razaoPaga(100, -50)).toBe(1)
  })
})

describe('compararOfertas', () => {
  const item = (over: Partial<Parameters<typeof compararOfertas>[0][number]> = {}) => ({
    oferta: 'leve2' as const, orderId: 'o1', paidRevenue: 148.5, units: 1, unitCost: 50, ...over,
  })

  it('revela que o 1L2 entrega o oculos mais barato que o avulso', () => {
    const r = compararOfertas([
      // 1L2: pedido de R$ 297 com 2 óculos → R$ 148,50 cada
      item({ oferta: 'leve2', orderId: 'a', paidRevenue: 148.5, units: 1 }),
      item({ oferta: 'leve2', orderId: 'a', paidRevenue: 148.5, units: 1 }),
      // Avulso: R$ 175 por 1 óculos
      item({ oferta: 'avulso', orderId: 'b', paidRevenue: 175, units: 1 }),
    ])
    const l2 = r.find(x => x.oferta === 'leve2')!
    const av = r.find(x => x.oferta === 'avulso')!
    expect(l2.revenuePerUnit).toBeCloseTo(148.5, 2)
    expect(av.revenuePerUnit).toBeCloseTo(175, 2)
    expect(l2.revenuePerUnit).toBeLessThan(av.revenuePerUnit)
  })

  it('conta pedidos distintos, nao itens', () => {
    const r = compararOfertas([
      item({ orderId: 'a' }), item({ orderId: 'a' }), item({ orderId: 'b' }),
    ])
    expect(r[0].orders).toBe(2)
    expect(r[0].units).toBe(3)
  })

  it('dobra o custo quando o pedido entrega dois oculos', () => {
    const r = compararOfertas([
      item({ orderId: 'a', paidRevenue: 148.5, units: 1, unitCost: 50 }),
      item({ orderId: 'a', paidRevenue: 148.5, units: 1, unitCost: 50 }),
    ])
    expect(r[0].cogs).toBe(100)          // dois óculos saíram do estoque
    expect(r[0].revenue).toBe(297)
    expect(r[0].marginPct).toBeCloseTo(66.33, 1)
  })

  it('exclui catalogo legado da comparacao', () => {
    const r = compararOfertas([item({ oferta: 'legado' }), item({ oferta: 'avulso' })])
    expect(r.map(x => x.oferta)).toEqual(['avulso'])
  })

  it('oferta sem custo cadastrado devolve margem null, nao zero', () => {
    const r = compararOfertas([item({ unitCost: null })])
    expect(r[0].cogs).toBeNull()
    expect(r[0].marginPct).toBeNull()
    expect(r[0].costPerUnit).toBeNull()
  })

  it('lista vazia nao quebra', () => {
    expect(compararOfertas([])).toEqual([])
  })

  it('receita zero nao gera NaN', () => {
    const r = compararOfertas([item({ paidRevenue: 0, units: 0 })])
    expect(Number.isFinite(r[0].revenuePerUnit)).toBe(true)
  })
})
