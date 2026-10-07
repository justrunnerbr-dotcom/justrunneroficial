import { describe, expect, it } from 'vitest'
import { derive, type Totals } from '@/lib/admin/dashboard-data'

const base: Totals = {
  revenue: 243653.38, paid: 837, profit: 50000, media: 60290.31, meta: 60290.31, google: 0, mediaTax: 8320.06,
  sessions: 130000, productSessions: null, cartSessions: null, checkoutSessions: null, purchaseSessions: 800,
  noSessionPaid: 37, recurring: 0, withCustomer: 0, costOk: 837, yampiPaid: 837, attributed: 0,
}

describe('mídia com o tributo do Meta: custo por pedido, MER e ROI', () => {
  it('inclui o tributo de 13,8% sobre o Meta (setembro: R$ 81,97, não R$ 72,03)', () => {
    expect(derive(base).cpa).toBeCloseTo((60290.31 + 8320.06) / 837, 6)
    expect(Math.round(derive(base).cpa! * 100) / 100).toBe(81.97)
  })
  it('a margem não muda: o lucro já desconta o tributo', () => {
    expect(derive(base).margin).toBe(50000 / 243653.38)
  })
  it('MER e ROI usam o investimento com o tributo', () => {
    const efetiva = 60290.31 + 8320.06
    expect(derive(base).mer).toBeCloseTo(243653.38 / efetiva, 9)
    expect(derive(base).roi).toBeCloseTo(50000 / efetiva, 9)
    expect(Math.round(derive(base).mer! * 100) / 100).toBe(3.55)
  })
  it('Google não leva tributo', () => {
    const d = derive({ ...base, media: 60290.31 + 1000, google: 1000 })
    expect(d.cpa).toBeCloseTo((61290.31 + 8320.06) / 837, 6)
  })
  it('sem mídia calculada, fica nulo', () => {
    const d = derive({ ...base, media: null, mediaTax: null })
    expect(d.cpa).toBeNull(); expect(d.mer).toBeNull(); expect(d.roi).toBeNull()
  })
})
