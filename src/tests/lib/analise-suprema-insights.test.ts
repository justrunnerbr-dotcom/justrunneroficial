import { describe, it, expect } from 'vitest'
import {
  detectProductSignals, detectCampaignSignals, detectDaySignals,
  narrate, buildFeed, pctChange,
  type Signal,
} from '@/lib/admin/analise-suprema-insights'
import type { ProductStat, CampaignPoint, DayStat } from '@/lib/admin/analise-suprema-source'

// units acima do piso de relevância (3) para os testes exercitarem a detecção;
// o piso em si é testado no bloco "piso de relevancia e lastro de historico".
const base: ProductStat = {
  key: 'x', title: 'X', revenue: 100, units: 5,
  views: 100, addToCarts: 10, revenuePrev: 100, viewsPrev: 100, unitCost: 50,
  costIsEstimate: false,
}

describe('pctChange', () => {
  it('calcula variacao normal', () => {
    expect(pctChange(200, 100)).toBe(100)
    expect(pctChange(50, 100)).toBe(-50)
  })

  it('nao devolve Infinity quando o anterior e zero', () => {
    expect(pctChange(50, 0)).toBe(100)
    expect(pctChange(0, 0)).toBe(0)
    expect(Number.isFinite(pctChange(999, 0))).toBe(true)
  })
})

describe('detectProductSignals', () => {
  it('detecta alta quando a receita sobe mais que o limiar', () => {
    const s = detectProductSignals([{ ...base, title: 'Modelo A', revenue: 200, revenuePrev: 100 }], 7)
    const alta = s.find(x => x.kind === 'produto_alta')
    expect(alta).toBeDefined()
    expect(alta!.subject).toBe('Modelo A')
    expect(alta!.delta).toBeCloseTo(100, 0)
    expect(alta!.severity).toBe('good')
  })

  it('ignora variacao abaixo do limiar', () => {
    const s = detectProductSignals([{ ...base, revenue: 110, revenuePrev: 100 }], 7)
    expect(s.find(x => x.kind === 'produto_alta')).toBeUndefined()
  })

  it('detecta queda relevante', () => {
    const s = detectProductSignals([{ ...base, title: 'Modelo B', revenue: 30, revenuePrev: 100 }], 7)
    const queda = s.find(x => x.kind === 'produto_queda')
    expect(queda).toBeDefined()
    expect(queda!.severity).toBe('warn')
  })

  it('nao gera alta nem queda quando nao havia periodo anterior', () => {
    const s = detectProductSignals([{ ...base, revenue: 500, revenuePrev: 0 }], 7)
    expect(s.find(x => x.kind === 'produto_alta')).toBeUndefined()
    expect(s.find(x => x.kind === 'produto_queda')).toBeUndefined()
  })

  it('todos os deltas sao finitos', () => {
    const s = detectProductSignals([{ ...base, revenue: 50, revenuePrev: 0 }, { ...base, revenue: 0, revenuePrev: 0 }], 7)
    expect(s.every(x => Number.isFinite(x.delta))).toBe(true)
  })

  it('detecta divergencia: muita visita, pouca venda', () => {
    const stats: ProductStat[] = [
      { ...base, key: 'a', title: 'A', views: 100, revenue: 100 },
      { ...base, key: 'b', title: 'B', views: 100, revenue: 100 },
      { ...base, key: 'c', title: 'C', views: 400, revenue: 10 },
    ]
    const div = detectProductSignals(stats, 7).find(x => x.kind === 'produto_divergente')
    expect(div).toBeDefined()
    expect(div!.subject).toBe('C')
  })

  it('lista vazia nao gera sinal', () => {
    expect(detectProductSignals([], 7)).toEqual([])
  })

  it('movimento de muito dinheiro tem prioridade maior que percentual alto de troco', () => {
    // Troco: 1 unidade virou 2 (+100%, mas R$ 300 de impacto).
    // Peso: R$ 20.000 viraram R$ 32.000 (+60%, R$ 12.000 de impacto).
    const stats: ProductStat[] = [
      { ...base, key: 'troco', title: 'Troco', revenue: 600, revenuePrev: 300, units: 3 },
      { ...base, key: 'peso',  title: 'Peso',  revenue: 32000, revenuePrev: 20000, units: 100 },
    ]
    const sinais = detectProductSignals(stats, 7).filter(s => s.kind === 'produto_alta')
    const troco = sinais.find(s => s.subject === 'Troco')!
    const peso = sinais.find(s => s.subject === 'Peso')!
    expect(troco.delta).toBeGreaterThan(peso.delta)      // percentual maior
    expect(peso.priority).toBeGreaterThan(troco.priority) // mas prioridade menor
  })
})

describe('detectCampaignSignals', () => {
  const mk = (date: string, spend: number, roas: number, id = 'c1', nome = 'Campanha 1'): CampaignPoint => ({
    campaignId: id, campaignName: nome, date, spend, revenue: spend * roas, roas,
  })

  // Dia 01..12 de agosto. O último dia da série é o "hoje" do detector.
  const dia = (n: number) => `2026-08-${String(n).padStart(2, '0')}`

  /** Série de 12 dias: `baixos` nos dias ímpares, `altos` nos pares. */
  const serie = (gastoBaixo: number, roasBaixo: number, gastoAlto: number, roasAlto: number) =>
    Array.from({ length: 12 }, (_, i) =>
      i % 2 === 0 ? mk(dia(i + 1), gastoBaixo, roasBaixo) : mk(dia(i + 1), gastoAlto, roasAlto))

  it('detecta saturacao quando os dias de gasto alto rendem menos que os de gasto baixo', () => {
    // Padrão medido em produção em 19/08: 22 de 27 campanhas rendiam menos no
    // tercil superior de gasto. Ex.: R$22/dia com ROAS 8,6 vs R$70/dia com 1,25.
    const sat = detectCampaignSignals(serie(30, 8.0, 120, 2.0), 30)
      .find(x => x.kind === 'campanha_saturada')
    expect(sat).toBeDefined()
    expect(sat!.subject).toBe('Campanha 1')
    expect(sat!.delta).toBeLessThan(0)
  })

  it('nao marca saturacao quando o retorno se sustenta na escala', () => {
    expect(detectCampaignSignals(serie(30, 5.0, 120, 4.8), 30)
      .find(x => x.kind === 'campanha_saturada')).toBeUndefined()
  })

  it('nao marca saturacao quando escalar melhora o retorno', () => {
    expect(detectCampaignSignals(serie(30, 4.0, 120, 6.0), 30)
      .find(x => x.kind === 'campanha_saturada')).toBeUndefined()
  })

  it('exige dias suficientes para separar gasto alto de baixo', () => {
    // Com menos de 9 dias os tercis não têm massa: qualquer diferença é ruído.
    const curta = Array.from({ length: 6 }, (_, i) =>
      i % 2 === 0 ? mk(dia(i + 1), 30, 8.0) : mk(dia(i + 1), 120, 1.0))
    expect(detectCampaignSignals(curta, 30)
      .find(x => x.kind === 'campanha_saturada')).toBeUndefined()
  })

  it('ignora campanha parada, que nao esta saturada e sim desligada', () => {
    // Metade das campanhas que a regressão antiga acusava se chamava "OFF":
    // ROAS caindo a zero porque foi pausada. Alertar sobre isso é ruído.
    const pausada = serie(30, 8.0, 120, 2.0).filter(p => p.date <= dia(6))
    const outra   = Array.from({ length: 12 }, (_, i) => mk(dia(i + 1), 50, 3.0, 'c2', 'Ativa'))
    expect(detectCampaignSignals([...pausada, ...outra], 30)
      .find(x => x.kind === 'campanha_saturada' && x.subject === 'Campanha 1')).toBeUndefined()
  })

  it('ignora campanha que nunca vendeu', () => {
    expect(detectCampaignSignals(serie(30, 0, 120, 0), 30)
      .find(x => x.kind === 'campanha_saturada')).toBeUndefined()
  })

  it('respeita o piso de gasto', () => {
    expect(detectCampaignSignals(serie(1, 8.0, 4, 2.0), 30)
      .find(x => x.kind === 'campanha_saturada')).toBeUndefined()
  })

  it('serie vazia nao gera sinal', () => {
    expect(detectCampaignSignals([], 7)).toEqual([])
  })
})

describe('detectDaySignals', () => {
  const dia = (date: string, weekday: string, revenue: number, orders: number): DayStat => ({
    date, weekday, revenue, orders, spend: 0, roas: 0, aov: orders ? revenue / orders : 0,
  })

  const HOJE = '2026-08-10'

  it('identifica melhor e pior dia', () => {
    const s = detectDaySignals([
      dia('2026-08-01', 'Sex', 100, 2),
      dia('2026-08-02', 'Sáb', 900, 9),
      dia('2026-08-03', 'Dom', 400, 4),
    ], 7, HOJE)
    expect(s.find(x => x.kind === 'melhor_dia')!.subject).toContain('2026-08-02')
    expect(s.find(x => x.kind === 'pior_dia')!.subject).toContain('2026-08-01')
  })

  it('ignora dias sem venda', () => {
    const s = detectDaySignals([
      dia('2026-08-01', 'Sex', 0, 0),
      dia('2026-08-02', 'Sáb', 900, 9),
      dia('2026-08-03', 'Dom', 400, 4),
    ], 7, HOJE)
    expect(s.find(x => x.kind === 'pior_dia')!.subject).toContain('2026-08-03')
  })

  it('exclui o dia corrente, que esta incompleto', () => {
    // Sem a exclusão, o dia de hoje (parcial, R$ 12) seria eleito "pior dia".
    const s = detectDaySignals([
      dia('2026-08-08', 'Sex', 500, 5),
      dia('2026-08-09', 'Sáb', 900, 9),
      dia('2026-08-10', 'Dom', 12, 1),
    ], 7, '2026-08-10')
    expect(s.find(x => x.kind === 'pior_dia')!.subject).toContain('2026-08-08')
    expect(s.every(x => !x.subject.includes('2026-08-10'))).toBe(true)
  })

  it('nao gera sinal sem dias suficientes', () => {
    expect(detectDaySignals([dia('2026-08-01', 'Sex', 100, 2)], 7, HOJE)).toEqual([])
    expect(detectDaySignals([], 7, HOJE)).toEqual([])
  })
})

describe('narrate', () => {
  const sig = (over: Partial<Signal>): Signal => ({
    kind: 'produto_alta', severity: 'good', window: 7,
    subject: 'Modelo A', delta: 42, metrics: { receita: 1000 }, priority: 42, ...over,
  })

  it('manchete carrega o numero e o corpo cita o assunto', () => {
    const n = narrate(sig({}))
    expect(n.headline).toContain('42')
    expect(n.body).toContain('Modelo A')
  })

  it('usa linguagem de queda em sinal negativo', () => {
    const n = narrate(sig({ kind: 'produto_queda', severity: 'warn', delta: -55 }))
    expect(n.body.toLowerCase()).toContain('caiu')
  })

  it('saturacao mostra os dois pontos de gasto e os dois roas, nao so o rotulo', () => {
    // "Está saturada" não diz onde o retorno virou. O gestor precisa do número
    // para decidir em que patamar segurar o budget.
    const n = narrate(sig({
      kind: 'campanha_saturada', subject: 'Campanha 1', delta: -62,
      metrics: { gastoBaixo: 22, gastoAlto: 70, roasBaixo: 8.62, roasAlto: 1.25 },
    }))
    expect(n.body).toContain('8.62x')
    expect(n.body).toContain('1.25x')
    expect(n.body.toLowerCase()).toContain('escala')
    expect(n.actionHint).toBeDefined()
  })

  it('todo tipo de sinal produz narrativa nao vazia', () => {
    const kinds: Signal['kind'][] = [
      'produto_alta', 'produto_queda', 'produto_divergente',
      'melhor_dia', 'pior_dia', 'campanha_queda', 'campanha_saturada', 'anomalia_cpa',
    ]
    for (const kind of kinds) {
      const n = narrate(sig({ kind }))
      expect(n.headline.length).toBeGreaterThan(0)
      expect(n.body.length).toBeGreaterThan(0)
    }
  })

  it('insight puramente informativo nao sugere acao', () => {
    expect(narrate(sig({ kind: 'melhor_dia' })).actionHint).toBeUndefined()
    expect(narrate(sig({ kind: 'produto_alta' })).actionHint).toBeUndefined()
  })
})

describe('buildFeed', () => {
  const sig = (p: number): Signal => ({
    kind: 'produto_alta', severity: 'good', window: 7,
    subject: 'X', delta: p, metrics: {}, priority: p,
  })

  it('ordena por prioridade decrescente', () => {
    expect(buildFeed([sig(10), sig(90), sig(50)]).map(f => f.priority)).toEqual([90, 50, 10])
  })

  it('respeita o limite', () => {
    expect(buildFeed(Array.from({ length: 20 }, (_, i) => sig(i)), 5)).toHaveLength(5)
  })

  it('lista vazia devolve feed vazio', () => {
    expect(buildFeed([])).toEqual([])
  })

  it('cada item carrega a narrativa', () => {
    expect(buildFeed([sig(50)])[0].narrative.body.length).toBeGreaterThan(0)
  })
})

describe('piso de relevancia e lastro de historico', () => {
  const p = (over: Partial<ProductStat>): ProductStat => ({
    key: 'x', title: 'X', revenue: 100, units: 1, views: 10, addToCarts: 1,
    revenuePrev: 100, viewsPrev: 10, unitCost: 50, costIsEstimate: false, ...over,
  })

  it('produto de baixo volume e baixo impacto nao entra no feed', () => {
    // 1 unidade, impacto de R$ 200 — abaixo dos dois pisos.
    const s = detectProductSignals([p({ revenue: 300, revenuePrev: 100, units: 1 })], 7)
    expect(s.find(x => x.kind === 'produto_alta')).toBeUndefined()
  })

  it('volume suficiente passa mesmo com impacto pequeno', () => {
    const s = detectProductSignals([p({ revenue: 300, revenuePrev: 100, units: 3 })], 7)
    expect(s.find(x => x.kind === 'produto_alta')).toBeDefined()
  })

  it('impacto grande passa mesmo com pouca unidade', () => {
    const s = detectProductSignals([p({ revenue: 1200, revenuePrev: 100, units: 1 })], 7)
    expect(s.find(x => x.kind === 'produto_alta')).toBeDefined()
  })

  it('sem lastro de historico nao emite sinal de variacao', () => {
    const s = detectProductSignals(
      [p({ revenue: 5000, revenuePrev: 100, units: 20 })],
      60,
      { hasComparableHistory: false },
    )
    expect(s.find(x => x.kind === 'produto_alta')).toBeUndefined()
    expect(s.find(x => x.kind === 'produto_queda')).toBeUndefined()
  })

  it('divergencia continua sendo detectada sem lastro (nao depende de comparacao)', () => {
    const stats = [
      p({ key: 'a', title: 'A', views: 100, revenue: 100 }),
      p({ key: 'b', title: 'B', views: 100, revenue: 100 }),
      p({ key: 'c', title: 'C', views: 400, revenue: 10 }),
    ]
    const s = detectProductSignals(stats, 60, { hasComparableHistory: false })
    expect(s.find(x => x.kind === 'produto_divergente')).toBeDefined()
  })
})

describe('piso de gasto em campanha', () => {
  const mk = (id: string, nome: string, date: string, spend: number, roas: number): CampaignPoint => ({
    campaignId: id, campaignName: nome, date, spend, revenue: spend * roas, roas,
  })

  it('campanha de gasto irrisorio nao vira sinal', () => {
    // R$ 18 de gasto total: zerar o ROAS aqui não é notícia.
    const pts = [mk('c1', 'Teste', '2026-08-01', 9, 3), mk('c1', 'Teste', '2026-08-02', 9, 0)]
    expect(detectCampaignSignals(pts, 7)).toEqual([])
  })

  it('campanha de gasto relevante gera sinal', () => {
    const pts = [mk('c1', 'Grande', '2026-08-01', 2000, 3), mk('c1', 'Grande', '2026-08-02', 2000, 0.5)]
    expect(detectCampaignSignals(pts, 7).find(s => s.kind === 'campanha_queda')).toBeDefined()
  })

  it('quem queima mais dinheiro tem prioridade maior', () => {
    const pts = [
      mk('peq', 'Pequena', '2026-08-01', 200, 3), mk('peq', 'Pequena', '2026-08-02', 200, 0.2),
      mk('gde', 'Grande',  '2026-08-01', 5000, 3), mk('gde', 'Grande',  '2026-08-02', 5000, 0.6),
    ]
    const s = detectCampaignSignals(pts, 7).filter(x => x.kind === 'campanha_queda')
    const peq = s.find(x => x.subject === 'Pequena')!
    const gde = s.find(x => x.subject === 'Grande')!
    expect(peq.delta).toBeLessThan(gde.delta)        // queda percentual maior
    expect(gde.priority).toBeGreaterThan(peq.priority) // mas prioridade menor
  })
})
