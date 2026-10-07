import { describe, it, expect } from 'vitest'
import { computeLogisticsCost, type CostSettings } from '@/lib/admin/cost-settings'

// O custo de logística é por PEDIDO PAGO — não por item, não por unidade, e não
// sobre pedido gerado que nunca foi pago. Em agosto/2026 eram 695 pedidos pagos
// contra 803 gerados: contar a base errada inventaria R$ 1.080 de custo no mês.

const base: CostSettings = {
  yampi_fee_pct: 1.5, appmax_pix_pct: 1, appmax_pix_fixed: 0.99,
  appmax_card_pct: 4.98, appmax_boleto_fixed: 3.49, appmax_gateway_fixed: 0.99,
  appmax_installment_pct: 1.89, default_installments: 3, frete_gratis_custo: 25,
  custo_logistica_pedido: 10,
  imposto_pct: 0,
}

describe('computeLogisticsCost', () => {
  it('multiplica o valor fixo pela quantidade de pedidos pagos', () => {
    expect(computeLogisticsCost(695, base)).toBe(6_950)
  })

  it('nao cobra nada quando nao houve pedido no periodo', () => {
    expect(computeLogisticsCost(0, base)).toBe(0)
  })

  it('some do calculo enquanto o valor nao esta configurado', () => {
    expect(computeLogisticsCost(695, { ...base, custo_logistica_pedido: 0 })).toBe(0)
  })

  it('e por pedido, nao por item — dez oculos num pedido pagam uma vez so', () => {
    expect(computeLogisticsCost(1, base)).toBe(10)
  })
})
