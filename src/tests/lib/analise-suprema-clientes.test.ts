import { describe, it, expect } from 'vitest'
import { customerStats, type CustomerRow } from '@/lib/admin/analise-suprema-clientes'

const HOJE = new Date('2026-08-14T00:00:00.000Z')
const diasAtras = (n: number) => new Date(HOJE.getTime() - n * 86_400_000).toISOString()

const cli = (over: Partial<CustomerRow> = {}): CustomerRow => ({
  email: 'a@x.com', name: 'A', totalSpent: 300, ordersCount: 1,
  lastOrderAt: diasAtras(10), whatsappLink: null, ...over,
})

describe('customerStats', () => {
  it('base vazia nao divide por zero', () => {
    const s = customerStats([], HOJE)
    expect(s.totalCustomers).toBe(0)
    expect(s.repeatRatePct).toBe(0)
    expect(s.avgLtv).toBe(0)
    expect(s.atRisk).toEqual([])
  })

  it('calcula taxa de recompra', () => {
    const s = customerStats([
      cli({ email: '1@x', ordersCount: 1 }),
      cli({ email: '2@x', ordersCount: 3 }),
      cli({ email: '3@x', ordersCount: 2 }),
      cli({ email: '4@x', ordersCount: 1 }),
    ], HOJE)
    expect(s.repeatCustomers).toBe(2)
    expect(s.repeatRatePct).toBeCloseTo(50, 5)
  })

  it('calcula LTV medio e pedidos por cliente', () => {
    const s = customerStats([
      cli({ email: '1@x', totalSpent: 100, ordersCount: 1 }),
      cli({ email: '2@x', totalSpent: 500, ordersCount: 3 }),
    ], HOJE)
    expect(s.avgLtv).toBe(300)
    expect(s.avgOrdersPerCustomer).toBe(2)
  })

  it('separa receita de recorrente e de comprador unico', () => {
    const s = customerStats([
      cli({ email: '1@x', totalSpent: 100, ordersCount: 1 }),
      cli({ email: '2@x', totalSpent: 900, ordersCount: 4 }),
    ], HOJE)
    expect(s.revenueFromSingle).toBe(100)
    expect(s.revenueFromRepeat).toBe(900)
  })

  it('nao marca como risco quem comprou uma vez so', () => {
    // Cliente de compra única sumido não é "em risco" — nunca teve recorrência.
    const s = customerStats([cli({ ordersCount: 1, lastOrderAt: diasAtras(400) })], HOJE)
    expect(s.atRisk).toEqual([])
  })

  it('marca recorrente sumido alem do limiar', () => {
    const s = customerStats([
      cli({ email: 'ok1@x', ordersCount: 2, lastOrderAt: diasAtras(10) }),
      cli({ email: 'sumido@x', ordersCount: 3, lastOrderAt: diasAtras(200), totalSpent: 1500 }),
    ], HOJE)
    expect(s.atRisk.map(c => c.email)).toContain('sumido@x')
    expect(s.atRisk.find(c => c.email === 'sumido@x')!.daysSinceLastOrder).toBe(200)
  })

  it('nao alarma antes do limiar', () => {
    const s = customerStats([
      cli({ email: 'a@x', ordersCount: 2, lastOrderAt: diasAtras(10) }),
      cli({ email: 'b@x', ordersCount: 2, lastOrderAt: diasAtras(44) }),
    ], HOJE)
    expect(s.atRisk).toEqual([])
  })

  it('o limiar e configuravel', () => {
    const base = [cli({ email: 'a@x', ordersCount: 2, lastOrderAt: diasAtras(20) })]
    expect(customerStats(base, HOJE, 45).atRisk).toHaveLength(0)
    expect(customerStats(base, HOJE, 10).atRisk).toHaveLength(1)
  })

  it('base majoritariamente dormente ainda sinaliza risco', () => {
    // Com critério relativo à mediana, isto devolvia lista vazia justamente
    // quando o problema era maior.
    const todos = Array.from({ length: 20 }, (_, i) =>
      cli({ email: `s${i}@x`, ordersCount: 2, lastOrderAt: diasAtras(300) }))
    expect(customerStats(todos, HOJE).atRisk.length).toBeGreaterThan(0)
  })

  it('ordena risco por quanto o cliente ja gastou', () => {
    const s = customerStats([
      cli({ email: 'pequeno@x', ordersCount: 2, lastOrderAt: diasAtras(300), totalSpent: 200 }),
      cli({ email: 'grande@x',  ordersCount: 2, lastOrderAt: diasAtras(300), totalSpent: 5000 }),
    ], HOJE)
    expect(s.atRisk[0].email).toBe('grande@x')
  })

  it('cliente sem data de ultimo pedido nao quebra nem entra em risco', () => {
    const s = customerStats([
      cli({ email: 'a@x', ordersCount: 2, lastOrderAt: null }),
      cli({ email: 'b@x', ordersCount: 2, lastOrderAt: diasAtras(5) }),
    ], HOJE)
    expect(s.atRisk.every(c => c.email !== 'a@x')).toBe(true)
    expect(Number.isFinite(s.avgLtv)).toBe(true)
  })

  it('limita a lista de risco a 10', () => {
    const sumidos = Array.from({ length: 20 }, (_, i) =>
      cli({ email: `s${i}@x`, ordersCount: 2, lastOrderAt: diasAtras(300), totalSpent: 100 + i }))
    expect(customerStats(sumidos, HOJE).atRisk).toHaveLength(10)
  })
})
