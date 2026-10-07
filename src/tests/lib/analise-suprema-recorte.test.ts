import { describe, it, expect } from 'vitest'
import { recortarJanela, windowRanges, type DayStat, type WindowDays } from '@/lib/admin/analise-suprema-source'

// O recorte em memória substituiu uma consulta por janela. Se ele divergir do
// corte que `windowRanges` faz, o painel passa a mostrar números diferentes dos
// que mostrava antes — sem erro nenhum, só valores errados.

const AGORA = new Date('2026-08-19T12:00:00Z')

const dia = (date: string, revenue = 100): DayStat => ({
  date, weekday: 'Qua', revenue, orders: 1, spend: 0, roas: 0, aov: revenue,
})

// 70 dias terminando em 2026-08-19, cobrindo folgadamente a maior janela.
const serie: DayStat[] = Array.from({ length: 70 }, (_, i) => {
  const d = new Date(AGORA.getTime() - (69 - i) * 86_400_000)
  return dia(d.toISOString().slice(0, 10), 100 + i)
})

describe('recortarJanela', () => {
  it('devolve a mesma fronteira que windowRanges', () => {
    for (const w of [1, 3, 7, 14, 30, 60] as WindowDays[]) {
      const { current } = windowRanges(w, AGORA)
      const recorte = recortarJanela(serie, w, AGORA)
      expect(recorte.every(d => d.date >= current.startISO.slice(0, 10))).toBe(true)
      expect(recorte.every(d => d.date <= current.endISO.slice(0, 10))).toBe(true)
    }
  })

  it('janela maior contem a menor', () => {
    const j7 = recortarJanela(serie, 7, AGORA).map(d => d.date)
    const j30 = recortarJanela(serie, 30, AGORA).map(d => d.date)
    expect(j7.every(d => j30.includes(d))).toBe(true)
    expect(j30.length).toBeGreaterThan(j7.length)
  })

  it('nao inventa dias que nao existem na serie', () => {
    const esparsa = [dia('2026-08-18'), dia('2026-08-10')]
    expect(recortarJanela(esparsa, 30, AGORA)).toHaveLength(2)
    expect(recortarJanela(esparsa, 1, AGORA).map(d => d.date)).toEqual(['2026-08-18'])
  })

  it('serie vazia devolve vazio, nao quebra', () => {
    expect(recortarJanela([], 7, AGORA)).toEqual([])
  })

  it('descarta dia fora da janela', () => {
    const antigo = [dia('2026-01-01'), dia('2026-08-18')]
    expect(recortarJanela(antigo, 7, AGORA).map(d => d.date)).toEqual(['2026-08-18'])
  })

  it('preserva os valores do dia, so filtra', () => {
    const r = recortarJanela([dia('2026-08-18', 777)], 7, AGORA)
    expect(r[0].revenue).toBe(777)
  })
})
