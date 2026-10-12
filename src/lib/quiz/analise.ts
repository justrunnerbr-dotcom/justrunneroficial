// Análise das respostas do quiz para o admin (/admin/quiz): contagens,
// cruzamentos, segmentos de remarketing, insights e dados de exemplo. Funções
// puras — rodam no navegador sobre as linhas que a página carrega.
// Mesma estrutura do admin da JHF, com as perguntas da Just Runner.

import { QUESTIONS, optionsOf, labelOf, SEGURANCA_GATILHOS, type Answers } from './perguntas'
import { QUIZ_BONUS } from './bonus'

export interface QuizRow {
  id: string
  created_at: string
  completo: boolean
  respostas: Answers
  nome: string | null
  whatsapp: string | null
  email: string | null
  cidade: string | null
  estado: string | null
  faixa_idade: string | null
  modelo_brinde: string | null
  cupom: string | null
  utm_source: string | null
  utm_campaign: string | null
}

export interface Bar { value: string; label: string; count: number; pct: number }

const arr = (v: unknown): string[] => Array.isArray(v) ? v.map(String) : typeof v === 'string' && v ? [v] : []
export const answersOf = (r: QuizRow, qid: string): string[] => arr(r.respostas?.[qid])

export function bonusNome(id: string | null): string {
  return QUIZ_BONUS.find(b => b.id === id)?.nome ?? id ?? '—'
}

/** Barras de uma pergunta. % sobre quem respondeu a pergunta (multi: % das pessoas). */
export function bars(rows: QuizRow[], qid: string, keepOrder = false): { bars: Bar[]; base: number } {
  const counts = new Map<string, number>()
  let base = 0
  for (const r of rows) {
    const a = answersOf(r, qid)
    if (!a.length) continue
    base++
    for (const v of new Set(a)) counts.set(v, (counts.get(v) ?? 0) + 1)
  }
  const q = QUESTIONS.find(x => x.id === qid)
  const order = q ? optionsOf(q).map(o => o[0]) : []
  // Opções que ninguém marcou também aparecem (zero é informação); valores
  // antigos fora da lista atual entram no fim.
  const values = [...order, ...[...counts.keys()].filter(v => !order.includes(v))]
  let out = values.map(v => ({ value: v, label: labelOf(qid, v), count: counts.get(v) ?? 0, pct: base ? (counts.get(v) ?? 0) / base : 0 }))
  if (!keepOrder) out = out.sort((a, b) => b.count - a.count)
  return { bars: out, base }
}

/** Barras de um campo da linha (estado, faixa de idade, bônus). */
export function fieldBars(rows: QuizRow[], get: (r: QuizRow) => string | null, label: (v: string) => string = v => v, limit = 99): { bars: Bar[]; base: number } {
  const counts = new Map<string, number>()
  let base = 0
  for (const r of rows) { const v = get(r); if (!v) continue; base++; counts.set(v, (counts.get(v) ?? 0) + 1) }
  const out = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit)
    .map(([v, c]) => ({ value: v, label: label(v), count: c, pct: base ? c / base : 0 }))
  return { bars: out, base }
}

export interface Cross { rows: string[]; cols: string[]; rowLabels: string[]; colLabels: string[]; cells: number[][]; rowTotals: number[]; pct: boolean }

/** Cruzamento: linhas = valores de `rowOf`, colunas = valores de `colOf`, contando pessoas. */
export function cross(
  data: QuizRow[], rowOf: (r: QuizRow) => string[], colOf: (r: QuizRow) => string[],
  rowLabel: (v: string) => string, colLabel: (v: string) => string, opts: { topRows?: number; topCols?: number; pct?: boolean } = {},
): Cross {
  const rc = new Map<string, number>(), cc = new Map<string, number>(), cell = new Map<string, number>()
  for (const r of data) {
    const rs = [...new Set(rowOf(r))], cs = [...new Set(colOf(r))]
    if (!rs.length || !cs.length) continue
    rs.forEach(x => rc.set(x, (rc.get(x) ?? 0) + 1))
    cs.forEach(y => cc.set(y, (cc.get(y) ?? 0) + 1))
    for (const x of rs) for (const y of cs) cell.set(`${x}|${y}`, (cell.get(`${x}|${y}`) ?? 0) + 1)
  }
  const rows = [...rc.entries()].sort((a, b) => b[1] - a[1]).slice(0, opts.topRows ?? 99).map(e => e[0])
  const cols = [...cc.entries()].sort((a, b) => b[1] - a[1]).slice(0, opts.topCols ?? 99).map(e => e[0])
  return {
    rows, cols, rowLabels: rows.map(rowLabel), colLabels: cols.map(colLabel), pct: !!opts.pct,
    cells: rows.map(x => cols.map(y => cell.get(`${x}|${y}`) ?? 0)),
    rowTotals: rows.map(x => rc.get(x) ?? 0),
  }
}

// ── segmentos de remarketing ─────────────────────────────────────────────────

export interface Segment { id: string; nome: string; regra: string; acao: string; match: (r: QuizRow) => boolean }

const has = (r: QuizRow, qid: string, ...vs: string[]) => answersOf(r, qid).some(v => vs.includes(v))

export const SEGMENTS: Segment[] = [
  { id: 'carrinho', nome: 'Abandonaram o carrinho', regra: 'Começou o pedido e não finalizou',
    acao: 'Remarketing com o bônus do quiz e lembrete do carrinho.', match: r => has(r, 'status_cliente', 'abandonou_carrinho') },
  { id: 'preco', nome: 'Acham caro', regra: 'Preço "um pouco caro" ou "caro", ou preço como impedimento',
    acao: 'Anúncio com o preço por óculos da promoção e o bônus.', match: r => has(r, 'percepcao_preco', 'um_pouco_caro', 'caro') || has(r, 'impedimentos', 'preco') },
  { id: 'confianca', nome: 'Falta confiança', regra: 'Impedimento de confiança, qualidade ou troca',
    acao: 'Criativos com avaliações com foto, garantia de troca e atendimento no WhatsApp.', match: r => has(r, 'impedimentos', 'confianca', 'qualidade', 'troca') },
  { id: 'tecnico', nome: 'Dúvida técnica', regra: 'Dúvida se fica firme no treino, sobre a lente ou falta de info técnica',
    acao: 'Vídeos de atleta treinando com o óculos e ficha técnica (peso, UV400, lente).', match: r => has(r, 'impedimentos', 'firmeza', 'lente', 'info') },
  { id: 'parceiro', nome: 'Levariam pro parceiro de treino', regra: 'Segundo óculos pra parceiro(a) de treino ou presente',
    acao: 'Anúncio do Compre 1, leve 2 como "um pra você, um pro seu parceiro de treino".', match: r => has(r, 'segundo_oculos', 'parceiro_treino', 'presente') },
]

// ── insights ─────────────────────────────────────────────────────────────────

export interface Insight { titulo: string; texto: string; acao?: string }

const pct = (v: number) => `${Math.round(v * 100)}%`
const top = (b: Bar[]) => b.filter(x => x.count > 0).sort((a, z) => z.count - a.count)

export function insights(rows: QuizRow[]): { resumo: string[]; cards: Insight[] } {
  const cards: Insight[] = []
  const resumo: string[] = []
  const comResposta = rows.filter(r => Object.keys(r.respostas ?? {}).length > 0)
  resumo.push(`${comResposta.length} respostas, ${rows.filter(r => r.completo).length} com contato e ${rows.filter(r => r.cupom).length} cupons de bônus gerados.`)
  if (comResposta.length === 0) return { resumo, cards }

  // Esporte
  const esp = top(bars(rows, 'esporte').bars)
  if (esp.length) {
    const top2 = esp.slice(0, 2)
    const partes = top2.map(e => {
      const sub = rows.filter(r => has(r, 'esporte', e.value))
      const fav = fieldBars(sub, r => r.modelo_brinde, bonusNome).bars[0]
      const lente = top(bars(sub, 'lente_preferida').bars)[0]
      return `${e.label}: ${pct(e.pct)}${fav ? ` · bônus mais escolhido: ${fav.label}` : ''}${lente ? ` · lente: ${lente.label}` : ''}`
    })
    cards.push({
      titulo: 'Quem é o público',
      texto: partes.join(' — '),
      acao: `Um criativo por esporte (${top2.map(e => e.label.toLowerCase()).join(', ')}) com o modelo e a lente mais escolhidos de cada um.`,
    })
    resumo.push(`Esporte principal: ${top2.map(e => `${e.label} (${pct(e.pct)})`).join(' e ')}.`)
  }

  // Frequência de treino
  const fr = bars(rows, 'freq_treino', true)
  if (fr.base) {
    const forte = fr.bars.filter(b => b.value === '3_4' || b.value === '5_mais').reduce((s, b) => s + b.pct, 0)
    cards.push({
      titulo: 'Frequência de treino',
      texto: `${pct(forte)} treinam 3 vezes por semana ou mais.`,
      acao: forte > 0.5 ? 'Público de treino frequente: falar de durabilidade, firmeza e reserva de treino.' : undefined,
    })
  }

  // Impedimento × o que daria segurança
  const imp = top(bars(rows, 'impedimentos').bars)[0]
  const seg = top(bars(rows, 'seguranca').bars)[0]
  if (imp) {
    const acoes: Record<string, string> = {
      preco: 'Reforçar o preço por óculos da promoção.', prazo: 'Mostrar prazo e rastreio no anúncio e na página.',
      confianca: 'Avaliações com foto e CNPJ/contato visíveis.', firmeza: 'Vídeo de atleta correndo/pedalando com o óculos.',
      lente: 'Explicar lente, UV400 e polarização com comparativo.', rosto: 'Fotos de rosto de frente em várias pessoas.',
      modelo: 'Ver quais modelos pedem na resposta aberta.', fotos: 'Trocar fotos do site por foto em uso.',
      info: 'Ficha técnica completa na página do produto.', qualidade: 'Vídeos de resistência e avaliações.',
      troca: 'Deixar a garantia de troca visível perto do botão de compra.',
    }
    cards.push({
      titulo: 'O que impede a compra',
      texto: `${imp.label}: ${pct(imp.pct)} das pessoas.` + (seg ? ` O que daria mais segurança: ${seg.label} (${pct(seg.pct)} de quem respondeu).` : ''),
      acao: acoes[imp.value],
    })
    resumo.push(`Maior motivo de não compra: ${imp.label} (${pct(imp.pct)}).`)
  }

  // Preço
  const pp = bars(rows, 'percepcao_preco', true)
  const pm = bars(rows, 'preco_max', true)
  if (pp.base) {
    const caro = pp.bars.filter(b => b.value === 'um_pouco_caro' || b.value === 'caro').reduce((s, b) => s + b.pct, 0)
    const ate100 = pm.bars.find(b => b.value === '100')?.pct ?? 0
    cards.push({
      titulo: 'Preço',
      texto: `${pct(caro)} acham R$ 148,50 por óculos caro ou um pouco caro.` + (pm.base ? ` ${pct(ate100)} pagariam no máximo R$ 100.` : ''),
      acao: caro > 0.4 ? 'Anunciar o preço por óculos, não o total do kit.' : undefined,
    })
    resumo.push(`Preço: ${pct(caro)} acham caro.`)
  }

  // Oferta preferida
  const of = top(bars(rows, 'oferta_preferida').bars)
  if (of.length) {
    const acoes: Record<string, string> = {
      compre1leve2: 'Manter o Compre 1, leve 2 como oferta principal nos anúncios.',
      progressiva: 'Dar mais destaque à Oferta Progressiva (1 por R$ 175, 2 por R$ 297).',
      compra_unica: 'Testar anúncio de 1 óculos com preço unitário.',
    }
    cards.push({ titulo: 'Oferta preferida', texto: of.map(o => `${o.label}: ${pct(o.pct)}`).join(' · '), acao: acoes[of[0].value] })
    resumo.push(`Oferta preferida: ${of[0].label} (${pct(of[0].pct)}).`)
  }

  // Segundo óculos
  const so = top(bars(rows, 'segundo_oculos').bars)[0]
  if (so) cards.push({ titulo: 'Segundo óculos', texto: `Mais comum: ${so.label} (${pct(so.pct)}).`,
    acao: so.value === 'parceiro_treino' || so.value === 'presente' ? 'Criativo "um pra você, um pro seu parceiro de treino".'
      : so.value === 'outra_lente' ? 'Criativo de duas lentes (sol forte e fim de tarde) no mesmo kit.' : undefined })

  return { resumo, cards }
}

// ── CSV ──────────────────────────────────────────────────────────────────────

export function toCsv(rows: QuizRow[]): string {
  const qs = QUESTIONS.map(q => q.id)
  const head = ['data', 'completo', 'nome', 'whatsapp', 'email', 'cidade', 'estado', 'faixa_idade', 'bonus', 'cupom', 'utm_source', 'utm_campaign', ...qs]
  const esc = (v: unknown) => { const s = v == null ? '' : String(v); return /[";\n,]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s }
  const lines = rows.map(r => [
    r.created_at, r.completo ? 'sim' : 'não', r.nome, r.whatsapp, r.email, r.cidade, r.estado, r.faixa_idade,
    r.modelo_brinde ? bonusNome(r.modelo_brinde) : '', r.cupom, r.utm_source, r.utm_campaign,
    ...qs.map(q => answersOf(r, q).map(v => q === 'resposta_aberta' ? v : labelOf(q, v)).join(' | ')),
  ].map(esc).join(';'))
  return '﻿' + [head.join(';'), ...lines].join('\n')
}

// ── dados de exemplo ─────────────────────────────────────────────────────────
// Só pra visualizar o painel antes de ter volume. Pesos pensados no público
// esportivo da loja. Gerador com semente: sempre o mesmo.

function rng(seed: number) {
  return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296 }
}

export function sampleRows(n = 240): QuizRow[] {
  const rand = rng(20261007)
  const pick = (w: Record<string, number>) => {
    const tot = Object.values(w).reduce((s, x) => s + x, 0); let x = rand() * tot
    for (const [k, v] of Object.entries(w)) { x -= v; if (x <= 0) return k }
    return Object.keys(w)[0]
  }
  const pickN = (w: Record<string, number>, k: number) => {
    const out = new Set<string>(); let guard = 0
    while (out.size < k && guard++ < 50) out.add(pick(w))
    return [...out]
  }
  const UFS: Record<string, number> = { SP: 34, RJ: 12, MG: 10, PR: 7, SC: 7, RS: 6, DF: 5, GO: 4, BA: 4, PE: 3, ES: 3, CE: 3 }
  const rows: QuizRow[] = []
  for (let i = 0; i < n; i++) {
    const esporte = pick({ corrida: 34, ciclismo: 24, mtb: 16, trail: 9, triatlo: 6, beach_tennis: 7, outro: 4 })
    const pedal = esporte === 'ciclismo' || esporte === 'mtb'
    const impedimentos = pickN({ preco: 28, prazo: 9, confianca: 15, firmeza: pedal ? 8 : 18, lente: 12, rosto: 8, modelo: 5, fotos: 3, info: 6, qualidade: 12, troca: 6, marketplace: 3, ja_tenho: 6, curioso: 6 }, 1 + Math.floor(rand() * 3))
    const r: Answers = {
      status_cliente: pick({ cliente: 30, nunca_comprou: 50, abandonou_carrinho: 20 }),
      origem: pick({ instagram: 40, tiktok: 8, anuncio: 24, grupo_treino: 14, indicacao: 8, google: 4, outro: 2 }),
      esporte,
      freq_treino: pick({ '1_2': 18, '3_4': 44, '5_mais': 30, eventual: 8 }),
      freq_anuncios: pick({ quase_todo_dia: 36, semana: 34, raramente: 22, nunca: 8 }),
      impedimentos,
      percepcao_preco: pick({ barato: 14, justo: 48, um_pouco_caro: 28, caro: 10 }),
      preco_max: pick({ 100: 26, 150: 46, 200: 28 }),
      oferta_preferida: pick({ compre1leve2: 46, compra_unica: 14, progressiva: 40 }),
      segundo_oculos: pick({ outra_lente: 22, reserva: 18, parceiro_treino: 30, presente: 16, nao: 14 }),
      lente_preferida: pick(pedal ? { escura: 20, espelhada: 26, fotocromatica: 34, clara: 12, nao_sei: 8 } : { escura: 30, espelhada: 34, fotocromatica: 20, clara: 6, nao_sei: 10 }),
    }
    if (impedimentos.some(x => SEGURANCA_GATILHOS.includes(x))) {
      r.seguranca = pickN({ avaliacoes: 26, videos: 24, whatsapp: 12, garantia: 18, ficha: 14, cnpj: 6 }, 1 + Math.floor(rand() * 2))
    }
    const completo = rand() < 0.82
    const bonus = completo && rand() < 0.85 ? QUIZ_BONUS[Math.floor(rand() * QUIZ_BONUS.length)].id : null
    rows.push({
      id: `exemplo-${i}`, created_at: new Date(Date.UTC(2026, 9, 7, 12) - i * 3_600_000).toISOString(), completo, respostas: r,
      nome: completo ? `Cliente exemplo ${i + 1}` : null, whatsapp: completo ? '11900000000' : null, email: completo ? `exemplo${i + 1}@exemplo.com` : null,
      cidade: completo ? 'Cidade exemplo' : null, estado: completo ? pick(UFS) : null,
      faixa_idade: completo ? pick({ '18 a 24': 18, '25 a 34': 38, '35 a 44': 28, '45 ou mais': 16 }) : null,
      modelo_brinde: bonus, cupom: bonus ? `QUIZEX${String(i).padStart(4, '0')}` : null,
      utm_source: pick({ ig: 60, fb: 15, '': 25 }) || null, utm_campaign: null,
    })
  }
  return rows
}
