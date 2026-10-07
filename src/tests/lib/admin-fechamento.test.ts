import { describe, expect, it } from 'vitest'
import { calcularFechamento, efetivos, limitesDoMes, mesValido, mesVizinho, sanitizarValores, type Valores } from '@/lib/admin/fechamento'

// Setembro/2026 do projeto jhf-financeiro (Matheus): mesmos lançamentos da
// fixture oficial dele (tests/finance/fixtures/setembro-2026.ts).
const SETEMBRO_REFERENCIA: Valores = {
  receita_bruta: 248139.37, pedidos_pagos: 852, pedidos_base_appmax: 868,
  taxas_pre_recebimento: 13121.50, perdas: 6772.52,
  cmv: 63257.00, frete: 25875.57, logistica: 8580.00, yampi: 3722.09, appmax_pos_liquido: 2812.52,
  meta: 67821.55, google: 0, fixos: 17275.24,
}

describe('fechamento mensal — regras do jhf-financeiro', () => {
  it('reproduz a referência de setembro: lucro R$ 38.901,38, margem 17,04%, CPA R$ 78,14', () => {
    const f = calcularFechamento(SETEMBRO_REFERENCIA, {})
    expect(f.receitaProcessador).toBe(235017.87)
    expect(f.receitaLiquida).toBe(228245.35)
    expect(f.variaveis).toBe(104247.18)
    expect(f.lucro).toBe(38901.38)
    expect(f.margem.valor).toBe(17.04)
    expect(f.ticket.valor).toBe(291.24)
    expect(f.cpa.valor).toBe(78.14)
    expect(f.lucroPorPedido.valor).toBe(44.82)
    expect(f.cpaEquilibrio.valor).toBe(122.95)
  })

  it('com as perdas do extrato real (R$ 7.926,46) o lucro de setembro é R$ 37.747,44', () => {
    const f = calcularFechamento({ ...SETEMBRO_REFERENCIA, perdas: 7926.46 }, {})
    expect(f.receitaLiquida).toBe(227091.41)
    expect(f.lucro).toBe(37747.44)
  })

  it('digitado vence o sistema; campo vazio usa o sistema só se a opção estiver ligada', () => {
    const sistema: Valores = { receita_bruta: 1000, cmv: 200 }
    const ligado = efetivos({ cmv: 250 }, sistema, true)
    expect(ligado.cmv).toEqual({ valor: 250, fonte: 'digitado' })
    expect(ligado.receita_bruta).toEqual({ valor: 1000, fonte: 'sistema' })
    expect(efetivos({}, sistema, false).receita_bruta).toEqual({ valor: 0, fonte: 'vazio' })
  })

  it('sem base AppMax, CPA e lucro por pedido usam os pedidos pagos', () => {
    const f = calcularFechamento({ receita_bruta: 3000, pedidos_pagos: 10, meta: 500 }, {})
    expect(f.efetivos.pedidos_base_appmax).toEqual({ valor: 10, fonte: 'padrao' })
    expect(f.cpa.valor).toBe(50)
  })

  it('sem pedidos, indicadores por pedido ficam nulos em vez de dividir por zero', () => {
    const f = calcularFechamento({ receita_bruta: 0 }, {})
    expect(f.ticket.valor).toBeNull()
    expect(f.cpa.valor).toBeNull()
    expect(f.margem.valor).toBeNull()
  })

  it('frete cobrado é informativo: não entra no lucro, só no frete líquido', () => {
    const base = calcularFechamento({ ...SETEMBRO_REFERENCIA }, {})
    const comCobrado = calcularFechamento({ ...SETEMBRO_REFERENCIA, frete_cobrado: 10736.94 }, {})
    expect(comCobrado.lucro).toBe(base.lucro)
    expect(comCobrado.freteLiquido).toBe(15138.63)
  })

  it('sanitiza o que vem do formulário', () => {
    expect(sanitizarValores({ cmv: 10.555, xpto: 3, meta: Number.NaN, fixos: '100', perdas: 1e12 })).toEqual({ cmv: 10.56 })
    expect(sanitizarValores(null)).toEqual({})
  })

  it('meses', () => {
    expect(mesValido('2026-09')).toBe('2026-09')
    expect(mesValido('2026-13', new Date('2026-10-05T15:00:00Z'))).toBe('2026-09')
    expect(mesValido(undefined, new Date('2026-01-10T15:00:00Z'))).toBe('2025-12')
    expect(limitesDoMes('2026-02')).toEqual({ from: '2026-02-01', to: '2026-02-28' })
    expect(mesVizinho('2026-01', -1)).toBe('2025-12')
  })
})
