import { describe, it, expect } from 'vitest'
import { normalizeProductKey, matchModelKey, windowRanges, faixasDe, hasComparableHistory, diaBRT, mesCorrenteBRT, FATOR_TRIBUTO_META, normalizarCampanha, ehRecuperacao } from '@/lib/admin/analise-suprema-source'
import { TRIBUTO_MIDIA_PCT } from '@/lib/admin/cost-settings'

describe('normalizeProductKey', () => {
  it('remove prefixo de canal entre colchetes', () => {
    expect(normalizeProductKey('[SO] Minute   Preta Lentes Preta'))
      .toBe(normalizeProductKey('[OP] Minute   Preta Lentes Preta'))
  })

  it('remove prefixo de 4+ letras como [BUMP]', () => {
    expect(normalizeProductKey('[BUMP] Minute Preta')).toBe('minute preta')
  })

  it('colapsa espacos duplicados', () => {
    expect(normalizeProductKey('Dart   Gold')).toBe('dart gold')
  })

  it('ignora pontuacao final', () => {
    expect(normalizeProductKey('[SO] Minute   Marrom lente VR28.'))
      .toBe(normalizeProductKey('Minute Marrom lente VR28'))
  })

  it('e case-insensitive', () => {
    expect(normalizeProductKey('COMPULSIVE GOLD')).toBe(normalizeProductKey('compulsive gold'))
  })

  it('nao casa produtos genuinamente diferentes', () => {
    expect(normalizeProductKey('[SO] Dart Gold')).not.toBe(normalizeProductKey('[SO] Dart Preta'))
  })

  it('lida com null e string vazia sem quebrar', () => {
    expect(normalizeProductKey(null)).toBe('')
    expect(normalizeProductKey(undefined)).toBe('')
    expect(normalizeProductKey('')).toBe('')
  })

  it('nao deixa sobrar espaco nas bordas', () => {
    expect(normalizeProductKey('  [SO]   Penny  Carbon  ')).toBe('penny carbon')
  })

  it('dobra acento em vez de destruir a letra', () => {
    // Sem a dobra NFD, "Vilão" virava "vil o" e "Óculos" virava "culos".
    expect(normalizeProductKey('Lupinha do Vilão')).toBe('lupinha do vilao')
    expect(normalizeProductKey('Óculos de Sol')).toBe('oculos de sol')
    expect(normalizeProductKey('Ação Coração Ünïcô')).toBe('acao coracao unico')
  })

  it('acentuado e sem acento produzem a mesma chave', () => {
    expect(normalizeProductKey('Vilão')).toBe(normalizeProductKey('Vilao'))
  })
})

describe('matchModelKey', () => {
  const modelos = ['permian', 'juliet', 'romeo', 'romeo 1', 'double x', 'minute']

  it('casa a variante com o modelo por prefixo', () => {
    expect(matchModelKey('[OP] Permian   All Black', modelos)).toBe('permian')
    expect(matchModelKey('[SO] Juliet   X Metal Lente Ruby', modelos)).toBe('juliet')
  })

  it('prefere o prefixo mais longo', () => {
    // "Romeo 1" não pode ser capturado por "Romeo".
    expect(matchModelKey('[SO] Romeo 1   Xmetal Lente Gold', modelos)).toBe('romeo 1')
  })

  it('casa titulo identico ao modelo', () => {
    expect(matchModelKey('Minute', modelos)).toBe('minute')
  })

  it('nao casa prefixo parcial de palavra', () => {
    // "minutes" não é "minute"; exige limite de palavra.
    expect(matchModelKey('Minutes Extra', modelos)).toBeNull()
  })

  it('devolve null quando nenhum modelo corresponde', () => {
    expect(matchModelKey('Óculos de Sol Just Runner preto', modelos)).toBeNull()
    expect(matchModelKey('', modelos)).toBeNull()
  })

  it('ignora lista de modelos vazia', () => {
    expect(matchModelKey('[SO] Juliet Ruby', [])).toBeNull()
  })
})

describe('windowRanges', () => {
  const now = new Date('2026-08-12T00:00:00.000Z')
  const dias = (r: { startISO: string; endISO: string }) =>
    (Date.parse(r.endISO) - Date.parse(r.startISO)) / 86_400_000

  it('a janela atual tem exatamente o tamanho pedido', () => {
    expect(dias(windowRanges(7, now).current)).toBe(7)
    expect(dias(windowRanges(3, now).current)).toBe(3)
  })

  it('janela de uma semana ou mais compara com o periodo imediatamente anterior', () => {
    const { current, previous } = windowRanges(30, now)
    expect(dias(previous)).toBe(30)
    expect(previous.endISO).toBe(current.startISO)
  })

  it('janela de 3 dias compara com os mesmos dias da semana, 7 dias atras', () => {
    // Sem isso, 3 dias na terça compararia Sáb–Seg contra Qua–Sex.
    const { current, previous } = windowRanges(3, now)
    expect(dias(previous)).toBe(3)
    const deslocamento = (Date.parse(current.endISO) - Date.parse(previous.endISO)) / 86_400_000
    expect(deslocamento).toBe(7)
  })

  it('janela de 1 dia compara com o mesmo dia da semana anterior', () => {
    const { current, previous } = windowRanges(1, now)
    const deslocamento = (Date.parse(current.startISO) - Date.parse(previous.startISO)) / 86_400_000
    expect(deslocamento).toBe(7)
    expect(new Date(previous.startISO).getUTCDay()).toBe(new Date(current.startISO).getUTCDay())
  })

  it('as janelas nao se sobrepoem', () => {
    for (const w of [1, 3, 7, 14, 30, 60] as const) {
      const { current, previous } = windowRanges(w, now)
      expect(Date.parse(previous.endISO)).toBeLessThanOrEqual(Date.parse(current.startISO))
    }
  })
})

describe('hasComparableHistory', () => {
  const now = new Date('2026-08-12T00:00:00.000Z')
  const primeiroPedido = new Date('2026-06-24T00:00:00.000Z')

  it('janela de 7 dias tem lastro', () => {
    expect(hasComparableHistory(7, now, primeiroPedido)).toBe(true)
  })

  it('janela de 60 dias nao tem lastro com so ~50 dias de historico', () => {
    // A janela anterior de 60d começaria em 2026-04-14, muito antes do primeiro pedido.
    expect(hasComparableHistory(60, now, primeiroPedido)).toBe(false)
  })

  it('janela de 30 dias nao tem lastro suficiente para o periodo anterior', () => {
    // Anterior iria de 13/06 a 13/07; o primeiro pedido é 24/06.
    expect(hasComparableHistory(30, now, primeiroPedido)).toBe(false)
  })
})

describe('normalizeProductKey — variações reais de cadastro', () => {
  it('ignora o sufixo (GERAL), que é anotação de cadastro', () => {
    expect(normalizeProductKey('Radar + Kit (GERAL)')).toBe(normalizeProductKey('[SO] Radar   + Kit'))
    expect(normalizeProductKey('Double X Plasma (GERAL)')).toBe(normalizeProductKey('[SO] Double X   Plasma'))
  })

  it('casa plural e singular de lente', () => {
    expect(normalizeProductKey('Eye Jacket Preta Lente Roxa'))
      .toBe(normalizeProductKey('[SO] Eye Jacket   Preta Lentes Roxa'))
  })

  it('NAO casa modelos diferentes que so parecem parecidos', () => {
    // Radar EV é outro modelo, não uma grafia de Radar. Atribuir o custo de um
    // ao outro seria pior que deixar sem custo.
    expect(normalizeProductKey('Radar Cinza Lente Preta'))
      .not.toBe(normalizeProductKey('[SO] Radar EV   Cinza Lente Preta'))
    expect(normalizeProductKey('Permian Lente VR28'))
      .not.toBe(normalizeProductKey('[SO] Permian   Bege Lentes VR28'))
  })

  it('geral no meio do nome nao e removido', () => {
    expect(normalizeProductKey('Geral Preta')).toBe('geral preta')
  })
})

describe('janelas em dias de Brasília (mesma convenção do Dashboard)', () => {
  // 06/10/2026 00:30 em Brasília = 03:30 UTC.
  const agora = new Date('2026-10-06T03:30:00Z')

  it('janela de N dias são N dias completos terminando ontem, sem hoje', () => {
    const { current } = windowRanges(7, agora)
    expect(current.start).toBe('2026-09-29')
    expect(current.endExclusive).toBe('2026-10-06')
    expect(windowRanges(1, agora).current.start).toBe('2026-10-05')
  })

  it('o corte é meia-noite de Brasília, não de UTC', () => {
    const { current } = windowRanges(7, agora)
    expect(current.startISO).toBe('2026-09-29T03:00:00.000Z')
    expect(current.endISO).toBe('2026-10-06T03:00:00.000Z')
  })

  it('pedido às 22h de Brasília fica no próprio dia', () => {
    expect(diaBRT('2026-10-05T01:00:00+00:00')).toBe('2026-10-04')
    expect(diaBRT('2026-10-05T03:00:00+00:00')).toBe('2026-10-05')
  })

  it('mês corrente conta só os dias completos', () => {
    const m = mesCorrenteBRT(new Date('2026-10-05T15:00:00Z'))
    expect(m.range.start).toBe('2026-10-01')
    expect(m.diasCompletos).toBe(4)
    expect(m.diasNoMes).toBe(31)
    expect(mesCorrenteBRT(new Date('2026-10-01T15:00:00Z')).diasCompletos).toBe(0)
  })

  it('o tributo das abas de campanha é o mesmo do cálculo de custos', () => {
    expect(FATOR_TRIBUTO_META).toBeCloseTo(1 + TRIBUTO_MIDIA_PCT / 100, 10)
  })

  it('nome de campanha e recuperação de carrinho', () => {
    expect(normalizarCampanha('  [CBO] VALIDADOS   Lançamento_07.09 ')).toBe('[cbo] validados lançamento_07.09')
    expect(ehRecuperacao('WhatsApp_Yampi carrinho_abandonado')).toBe(true)
    expect(ehRecuperacao('[ABO] VENDAS')).toBe(false)
  })
})

describe('período escolhido no filtro (dia a dia)', () => {
  it('um dia só compara com o mesmo dia da semana anterior', () => {
    const { current, previous } = faixasDe({ start: '2026-10-04', endExclusive: '2026-10-05' })
    expect(current.start).toBe('2026-10-04')
    expect(current.endExclusive).toBe('2026-10-05')
    expect(previous.start).toBe('2026-09-27')
    expect(previous.endExclusive).toBe('2026-09-28')
    expect(current.startISO).toBe('2026-10-04T03:00:00.000Z')
  })

  it('intervalo de 30 dias compara com os 30 dias anteriores, sem sobreposição', () => {
    const { current, previous } = faixasDe({ start: '2026-09-01', endExclusive: '2026-10-01' })
    expect(previous.start).toBe('2026-08-02')
    expect(previous.endExclusive).toBe(current.start)
  })

  it('janela fixa continua igual a windowRanges', () => {
    const agora = new Date('2026-10-06T15:00:00Z')
    expect(faixasDe(7, agora)).toEqual(windowRanges(7, agora))
  })
})
