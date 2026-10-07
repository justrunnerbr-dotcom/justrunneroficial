import { describe, it, expect } from 'vitest'
import {
  indiceDeEstimativa, resolverCusto, chaveModelo,
} from '@/lib/admin/analise-suprema-custo-estimado'

// Reflete a distribuição real: flak é barato, eye jacket é caro.
const custos = new Map<string, number>([
  ['flak 2 0 preta lente ruby', 12],
  ['flak 2 0 preta lente azul escuro', 12],
  ['flak 2 0 cooper lente preta', 14],
  ['eye jacket preta lente roxa', 50],
  ['eye jacket preta lente preta', 50],
  ['eye jacket cooper lente vr28', 20],
])

describe('chaveModelo', () => {
  it('usa a primeira palavra como modelo', () => {
    expect(chaveModelo('flak 2 0 preta lente ruby')).toBe('flak')
    expect(chaveModelo('')).toBe('')
  })
})

describe('indiceDeEstimativa', () => {
  it('calcula mediana por modelo', () => {
    const i = indiceDeEstimativa(custos)
    expect(i.porModelo.get('flak')).toBe(12)
    expect(i.porModelo.get('eye')).toBe(50)
  })

  it('calcula a mediana geral', () => {
    expect(indiceDeEstimativa(custos).geral).toBe(17)  // mediana de 12,12,14,20,50,50
  })

  it('ignora custo zero ou negativo', () => {
    const i = indiceDeEstimativa(new Map([['x a', 0], ['x b', 10]]))
    expect(i.porModelo.get('x')).toBe(10)
  })

  it('mapa vazio nao quebra', () => {
    const i = indiceDeEstimativa(new Map())
    expect(i.geral).toBe(0)
    expect(i.porModelo.size).toBe(0)
  })
})

describe('resolverCusto', () => {
  const idx = indiceDeEstimativa(custos)

  it('cadastro sempre vence a estimativa', () => {
    const r = resolverCusto('flak 2 0 preta lente azul', 99, idx)!
    expect(r.value).toBe(99)
    expect(r.estimated).toBe(false)
    expect(r.source).toBe('cadastro')
  })

  it('estima pelo modelo, nao pela media global', () => {
    // Sem isto, um Flak (R$12) receberia a mediana geral de R$17.
    const r = resolverCusto('flak 2 0 preta lente azul', null, idx)!
    expect(r.value).toBe(12)
    expect(r.estimated).toBe(true)
    expect(r.source).toBe('modelo')
  })

  it('modelo desconhecido cai na mediana geral, ainda marcado', () => {
    const r = resolverCusto('xsquared 24k lente gold', null, idx)!
    expect(r.value).toBe(17)
    expect(r.estimated).toBe(true)
    expect(r.source).toBe('geral')
  })

  it('custo zero cadastrado e respeitado, nao vira estimativa', () => {
    const r = resolverCusto('flak 2 0 x', 0, idx)!
    expect(r.value).toBe(0)
    expect(r.estimated).toBe(false)
  })

  it('sem nenhum custo na base devolve null em vez de inventar', () => {
    const vazio = indiceDeEstimativa(new Map())
    expect(resolverCusto('qualquer coisa', null, vazio)).toBeNull()
  })

  it('estimativa nunca se confunde com cadastro', () => {
    const cadastrado = resolverCusto('eye jacket preta lente roxa', 50, idx)!
    const estimado = resolverCusto('eye jacket roxa lente preta', null, idx)!
    expect(cadastrado.value).toBe(estimado.value)   // mesmo número...
    expect(cadastrado.estimated).not.toBe(estimado.estimated)  // ...origem diferente
  })
})
