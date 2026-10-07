import { describe, it, expect } from 'vitest'
import { productMargins, portfolioMarginPct, type MarginInput } from '@/lib/admin/analise-suprema-margem'
 import { buscarCusto, chavesPorTamanho } from '@/lib/admin/analise-suprema-queries'

const item = (over: Partial<MarginInput> = {}): MarginInput => ({
  key: 'a', title: 'A', revenue: 1000, units: 10, unitCost: 50, ...over,
})

describe('productMargins', () => {
  it('produto sem custo cadastrado devolve margem null, nunca zero', () => {
    const r = productMargins([item({ unitCost: null })], 0)
    expect(r[0].cogs).toBeNull()
    expect(r[0].margin).toBeNull()
    expect(r[0].marginPct).toBeNull()
  })

  it('calcula margem descontando custo e taxa rateada', () => {
    const r = productMargins([item({ revenue: 1000, units: 10, unitCost: 50 })], 100)
    expect(r[0].cogs).toBe(500)
    expect(r[0].feesShare).toBe(100)      // único produto leva a taxa inteira
    expect(r[0].margin).toBe(400)
    expect(r[0].marginPct).toBeCloseTo(40, 5)
  })

  it('rateia a taxa proporcional a participacao na receita', () => {
    const r = productMargins([
      item({ key: 'a', revenue: 750, units: 1, unitCost: 0 }),
      item({ key: 'b', revenue: 250, units: 1, unitCost: 0 }),
    ], 100)
    expect(r.find(x => x.key === 'a')!.feesShare).toBeCloseTo(75, 5)
    expect(r.find(x => x.key === 'b')!.feesShare).toBeCloseTo(25, 5)
  })

  it('drag identifica quem puxa a margem para baixo', () => {
    const r = productMargins([
      { key: 'bom',  title: 'Bom',  revenue: 1000, units: 10, unitCost: 20 },
      { key: 'ruim', title: 'Ruim', revenue: 1000, units: 10, unitCost: 95 },
    ], 0)
    const bom = r.find(x => x.key === 'bom')!
    const ruim = r.find(x => x.key === 'ruim')!
    expect(ruim.marginPct!).toBeLessThan(bom.marginPct!)
    expect(ruim.drag).toBeGreaterThan(bom.drag)
    expect(bom.drag).toBe(0)   // acima da média não puxa nada
  })

  it('volume importa: produto ruim que vende pouco puxa menos', () => {
    const r = productMargins([
      { key: 'bom',       title: 'Bom',       revenue: 10000, units: 100, unitCost: 20 },
      { key: 'ruim-alto', title: 'Ruim alto', revenue: 5000,  units: 50,  unitCost: 95 },
      { key: 'ruim-baixo',title: 'Ruim baixo',revenue: 100,   units: 1,   unitCost: 95 },
    ], 0)
    const alto = r.find(x => x.key === 'ruim-alto')!
    const baixo = r.find(x => x.key === 'ruim-baixo')!
    // Mesma margem percentual ruim, mas o de volume alto é o problema real.
    expect(alto.drag).toBeGreaterThan(baixo.drag)
  })

  it('produto sem custo tem drag zero, nao penaliza nem beneficia', () => {
    const r = productMargins([
      { key: 'a', title: 'A', revenue: 1000, units: 10, unitCost: 20 },
      { key: 'b', title: 'B', revenue: 1000, units: 10, unitCost: null },
    ], 0)
    expect(r.find(x => x.key === 'b')!.drag).toBe(0)
  })

  it('receita zero nao divide por zero', () => {
    const r = productMargins([item({ revenue: 0, units: 0, unitCost: 10 })], 0)
    expect(r[0].marginPct).toBeNull()
    expect(Number.isFinite(r[0].drag)).toBe(true)
  })

  it('lista vazia nao quebra', () => {
    expect(productMargins([], 100)).toEqual([])
  })

  it('taxa zero mantem margem igual a receita menos custo', () => {
    const r = productMargins([item({ revenue: 1000, units: 10, unitCost: 30 })], 0)
    expect(r[0].margin).toBe(700)
  })

  it('margem negativa e possivel e nao e truncada', () => {
    const r = productMargins([item({ revenue: 100, units: 10, unitCost: 50 })], 0)
    expect(r[0].margin).toBe(-400)
    expect(r[0].marginPct).toBeCloseTo(-400, 5)
  })
})

describe('portfolioMarginPct', () => {
  it('ignora produtos sem custo no calculo da carteira', () => {
    const m = productMargins([
      { key: 'a', title: 'A', revenue: 1000, units: 10, unitCost: 40 },  // margem 600
      { key: 'b', title: 'B', revenue: 5000, units: 10, unitCost: null }, // fora da conta
    ], 0)
    expect(portfolioMarginPct(m)).toBeCloseTo(60, 5)
  })

  it('devolve null quando nenhum produto tem custo', () => {
    const m = productMargins([{ key: 'a', title: 'A', revenue: 1000, units: 1, unitCost: null }], 0)
    expect(portfolioMarginPct(m)).toBeNull()
  })

  it('lista vazia devolve null', () => {
    expect(portfolioMarginPct([])).toBeNull()
  })
})

describe('buscarCusto — variante exata com reserva de modelo', () => {
  const custos = new Map<string, number>([
    ['gascan', 50],                          // cadastro "(GERAL)" — vale pro modelo
    ['straight jacket', 60],                 // idem, nome puro
    ['straight jacket cooper lente preta', 75], // variante específica, mais cara
    ['eye jacket preta lente roxa', 50],
  ])
  const chaves = chavesPorTamanho(custos)

  it('prefere a variante exata quando existe', () => {
    expect(buscarCusto('[SO] Straight Jacket   Cooper Lente Preta', custos, chaves)).toBe(75)
  })

  it('cai no cadastro de modelo quando a variante nao existe', () => {
    expect(buscarCusto('[SO] Gascan   Preto', custos, chaves)).toBe(50)
    expect(buscarCusto('[SO] Straight Jacket   Padrão', custos, chaves)).toBe(60)
  })

  it('devolve null quando nem modelo nem variante existem', () => {
    expect(buscarCusto('[SO] X Squared   24K Lentes Gold', custos, chaves)).toBeNull()
  })

  it('nao casa modelo diferente que comeca parecido', () => {
    // "Gascanera" não é variante de "Gascan" — exige limite de palavra.
    expect(buscarCusto('Gascanera Preta', custos, chaves)).toBeNull()
  })

  it('titulo vazio nao quebra', () => {
    expect(buscarCusto('', custos, chaves)).toBeNull()
  })
})
