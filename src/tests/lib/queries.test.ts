import { describe, it, expect } from 'vitest'

describe('query utilities', () => {
  it('formatPrice formats BRL correctly', async () => {
    const { formatPrice } = await import('@/lib/utils')
    // pt-BR locale uses U+00A0 (non-breaking space) between 'R$' and digits
    const actual349 = formatPrice(349.9)
    const actual1000 = formatPrice(1000)
    expect(actual349.replace(/\s/g, ' ').replace(/ /g, ' ')).toBe('R$ 349,90')
    expect(actual1000.replace(/\s/g, ' ').replace(/ /g, ' ')).toBe('R$ 1.000,00')
  })

  it('buildProductSlug normalizes correctly', async () => {
    const { buildProductSlug } = await import('@/lib/utils')
    expect(buildProductSlug('Flak 2.0 XL')).toBe('flak-20-xl')
    expect(buildProductSlug('Oculos Preto')).toBe('oculos-preto')
  })
})
