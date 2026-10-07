import { describe, it, expect } from 'vitest'
import { computeSalesTax, type CostSettings } from '@/lib/admin/cost-settings'

// A distinção entre "alíquota zero" e "alíquota não configurada" é o ponto
// inteiro deste cálculo. Tratar nulo como zero afirma que a loja não paga
// imposto e infla o Lucro Líquido em 4 a 11 pontos do faturamento — a mesma
// classe de erro que o custo de mídia sumindo já causou.

const base: CostSettings = {
  yampi_fee_pct: 2.5, appmax_pix_pct: 1, appmax_pix_fixed: 0.99,
  appmax_card_pct: 4.98, appmax_boleto_fixed: 3.49, appmax_gateway_fixed: 0.99,
  appmax_installment_pct: 1.89, default_installments: 3, frete_gratis_custo: 25,
  custo_logistica_pedido: 10,
  imposto_pct: null,
}

describe('computeSalesTax', () => {
  it('devolve null quando a aliquota nao esta configurada', () => {
    expect(computeSalesTax(10_000, base)).toBeNull()
  })

  it('nao confunde null com zero', () => {
    expect(computeSalesTax(10_000, base)).not.toBe(0)
  })

  it('aplica a aliquota sobre o faturamento', () => {
    expect(computeSalesTax(10_000, { ...base, imposto_pct: 8.5 })).toBeCloseTo(850, 6)
  })

  it('aceita aliquota zero explicita como zero, nao como lacuna', () => {
    expect(computeSalesTax(10_000, { ...base, imposto_pct: 0 })).toBe(0)
  })

  it('faturamento zero nao gera imposto', () => {
    expect(computeSalesTax(0, { ...base, imposto_pct: 8.5 })).toBe(0)
  })

  it('cobre a faixa usual do Simples sem distorcer', () => {
    for (const [pct, esperado] of [[4, 400], [8.5, 850], [11.3, 1130]] as const) {
      expect(computeSalesTax(10_000, { ...base, imposto_pct: pct })).toBeCloseTo(esperado, 6)
    }
  })
})
