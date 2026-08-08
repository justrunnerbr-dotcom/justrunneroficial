import { describe, it, expect } from 'vitest'
import { CUPOM, cupomElegivel, subtotalElegivel } from '@/lib/coupon'

const item = (sku: string, price: number, quantity = 1) => ({ sku, price, quantity })

const principal = (q = 1) => item('JR-FLAK-PRETA', 297, q)
const op = (q = 1) => item('JROP-FLAK-PRETA-OP', 175, q)
const combo = (q = 1) => item('JRC-COMBO-1', 327, q)

// Antes de expirar (o cupom morre em 31/08/2026 16:19 -03:00)
const ANTES = new Date('2026-08-08T12:00:00-03:00').getTime()

describe('cupom RUN10', () => {
  // Cada caso abaixo foi conferido no checkout real da Yampi em 2026-08-08;
  // se algum quebrar, o carrinho passou a divergir do que o checkout cobra.
  describe('elegibilidade medida no checkout real', () => {
    it('aceita 1 óculos do catálogo principal (R$297, bate o mínimo exato)', () => {
      expect(cupomElegivel([principal()], ANTES)).toBe(true)
    })

    it('aceita 2 do catálogo principal, junto com o 2º grátis', () => {
      expect(cupomElegivel([principal(2)], ANTES)).toBe(true)
    })

    it('aceita 1 combo (R$327)', () => {
      expect(cupomElegivel([combo()], ANTES)).toBe(true)
    })

    it('recusa carrinho só de Oferta Progressiva, mesmo acima do mínimo', () => {
      expect(cupomElegivel([op()], ANTES)).toBe(false)
      expect(cupomElegivel([op(2)], ANTES)).toBe(false) // R$350, total R$297
      expect(cupomElegivel([op(4)], ANTES)).toBe(false) // R$700
    })

    it('aceita carrinho misto — 1 item do principal já sustenta o cupom', () => {
      expect(cupomElegivel([principal(), op()], ANTES)).toBe(true)
    })
  })

  describe('mínimo', () => {
    it('mede o mínimo só sobre os itens cobertos, ignorando a Oferta Progressiva', () => {
      // R$700 de OP não contam nada
      expect(subtotalElegivel([op(4)])).toBe(0)
      expect(subtotalElegivel([principal(), op(4)])).toBe(297)
    })

    it('recusa item coberto abaixo do mínimo', () => {
      expect(cupomElegivel([item('JR-BARATO', 100)], ANTES)).toBe(false)
    })

    it('soma itens cobertos para chegar no mínimo', () => {
      expect(cupomElegivel([item('JR-A', 150), item('JR-B', 147)], ANTES)).toBe(true)
    })
  })

  describe('validade', () => {
    it('para de oferecer depois que o cupom expira na Yampi', () => {
      const depois = new Date('2026-09-01T00:00:00-03:00').getTime()
      expect(cupomElegivel([principal()], depois)).toBe(false)
    })
  })

  describe('configuração espelhada do painel', () => {
    it('é desconto de valor fixo de R$10, não percentual', () => {
      expect(CUPOM.valor).toBe(10)
    })

    it('não cobre a Oferta Progressiva até ser estendido no painel da Yampi', () => {
      expect(CUPOM.cobreOfertaProgressiva).toBe(false)
    })
  })
})
