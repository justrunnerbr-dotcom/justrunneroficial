// Fechamento mensal com as regras do projeto financeiro do Matheus
// (jhf-financeiro, docs/HANDOFF.md, decisões D7–D10):
//
//   - DRE por competência: receita bruta Yampi (pedidos pagos, inclusive os que
//     foram estornados depois) − taxas antes do recebimento = líquido AppMax;
//     − perdas do extrato = receita líquida pós-perdas.
//   - Estornos e chargebacks entram no mês em que foram DEBITADOS no extrato
//     AppMax, pelo valor do extrato, mesmo se o pedido é de mês anterior (D9).
//   - Logística (Bruna) = R$ 10 por pedido pago (D7). Mensalidade da Yampi está
//     dentro dos custos fixos.
//   - Meta entra pelo valor da FATURA, que já traz o tributo de 13,8% (D8).
//   - Ticket = bruto ÷ pedidos pagos Yampi; CPA e lucro por pedido usam a base
//     financeira AppMax (aprovados + estornados + chargebacks); margem é sobre a
//     receita líquida pós-perdas.
//
// Conta feita em centavos inteiros para não acumular erro de ponto flutuante.
// Os valores digitados ficam em `fechamento_mensal.valores`; o que não foi
// digitado cai na sugestão calculada pelo sistema (quando `usarSistema`).

export type CampoFechamento =
  | 'receita_bruta' | 'pedidos_pagos' | 'pedidos_base_appmax' | 'taxas_pre_recebimento' | 'perdas'
  | 'cmv' | 'frete' | 'logistica' | 'yampi' | 'appmax_pos_liquido'
  | 'meta' | 'google' | 'fixos' | 'frete_cobrado'

export interface DefinicaoCampo {
  campo: CampoFechamento
  nome: string
  dica: string
  grupo: 'receita' | 'variaveis' | 'marketing' | 'fixos' | 'info'
  /** quantidade (pedidos), não dinheiro */
  quantidade?: boolean
}

export const CAMPOS: DefinicaoCampo[] = [
  { campo: 'receita_bruta', grupo: 'receita', nome: 'Vendas brutas Yampi', dica: 'pedidos pagos no mês, inclusive os estornados depois' },
  { campo: 'pedidos_pagos', grupo: 'receita', nome: 'Pedidos pagos (Yampi)', dica: 'base do ticket médio', quantidade: true },
  { campo: 'pedidos_base_appmax', grupo: 'receita', nome: 'Base financeira AppMax', dica: 'aprovados + estornados + chargebacks; base do CPA e do lucro por pedido', quantidade: true },
  { campo: 'taxas_pre_recebimento', grupo: 'receita', nome: 'Taxas AppMax antes do recebimento', dica: 'bruto Yampi − líquido AppMax (extrato)' },
  { campo: 'perdas', grupo: 'receita', nome: 'Estornos e chargebacks', dica: 'valor debitado no extrato AppMax no mês' },
  { campo: 'cmv', grupo: 'variaveis', nome: 'Custo dos produtos (CMV)', dica: 'custo dos óculos vendidos no mês' },
  { campo: 'frete', grupo: 'variaveis', nome: 'Frete', dica: 'fatura Melhor Envio + motoboy' },
  { campo: 'logistica', grupo: 'variaveis', nome: 'Logística — Bruna', dica: 'R$ 10 por pedido pago' },
  { campo: 'yampi', grupo: 'variaveis', nome: 'Yampi 1,5%', dica: 'cobrança por pedido pago' },
  { campo: 'appmax_pos_liquido', grupo: 'variaveis', nome: 'AppMax depois do líquido', dica: 'recuperação de vendas, antecipação, tarifa de saque, taxa de estorno' },
  { campo: 'meta', grupo: 'marketing', nome: 'Meta Ads (fatura)', dica: 'valor da fatura, já com o tributo de 13,8%' },
  { campo: 'google', grupo: 'marketing', nome: 'Google Ads', dica: 'valor cobrado no mês' },
  { campo: 'fixos', grupo: 'fixos', nome: 'Custos fixos', dica: 'inclui a mensalidade da Yampi' },
  { campo: 'frete_cobrado', grupo: 'info', nome: 'Frete cobrado dos clientes', dica: 'informativo: já está dentro da receita' },
]

export type Valores = Partial<Record<CampoFechamento, number>>
export type Fonte = 'digitado' | 'sistema' | 'padrao' | 'vazio'

export interface Efetivo { valor: number; fonte: Fonte }

export interface Rastreado {
  valor: number | null
  formula: string
  entradas: { rotulo: string; valor: string }[]
}

export interface ResultadoFechamento {
  efetivos: Record<CampoFechamento, Efetivo>
  receitaProcessador: number
  receitaLiquida: number
  variaveis: number
  marketing: number
  contribuicao: number
  antesDosFixos: number
  lucro: number
  freteLiquido: number
  margem: Rastreado
  ticket: Rastreado
  cpa: Rastreado
  lucroPorPedido: Rastreado
  cpaEquilibrio: Rastreado
  /** campos de dinheiro que entraram com a sugestão do sistema, não digitados */
  usandoSistema: CampoFechamento[]
}

const c = (v: number) => Math.round(v * 100)
const r = (centavos: number) => centavos / 100
const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

/** Valor efetivo de cada campo: digitado > sistema (se ligado) > padrão > 0. */
export function efetivos(digitados: Valores, sistema: Valores, usarSistema: boolean): Record<CampoFechamento, Efetivo> {
  const out = {} as Record<CampoFechamento, Efetivo>
  for (const { campo } of CAMPOS) {
    const d = digitados[campo]
    if (typeof d === 'number' && Number.isFinite(d)) { out[campo] = { valor: d, fonte: 'digitado' }; continue }
    const s = sistema[campo]
    if (usarSistema && typeof s === 'number' && Number.isFinite(s)) { out[campo] = { valor: s, fonte: 'sistema' }; continue }
    out[campo] = { valor: 0, fonte: 'vazio' }
  }
  // Sem base AppMax informada, a base cai nos pedidos pagos (é a melhor aproximação disponível).
  if (out.pedidos_base_appmax.fonte === 'vazio' && out.pedidos_pagos.valor > 0) {
    out.pedidos_base_appmax = { valor: out.pedidos_pagos.valor, fonte: 'padrao' }
  }
  return out
}

export function calcularFechamento(digitados: Valores, sistema: Valores, usarSistema = true): ResultadoFechamento {
  const e = efetivos(digitados, sistema, usarSistema)
  const v = (k: CampoFechamento) => c(e[k].valor)

  const processador = v('receita_bruta') - v('taxas_pre_recebimento')
  const liquida = processador - v('perdas')
  const variaveis = v('cmv') + v('frete') + v('logistica') + v('yampi') + v('appmax_pos_liquido')
  const marketing = v('meta') + v('google')
  const contribuicao = liquida - variaveis
  const antesDosFixos = contribuicao - marketing
  const lucro = antesDosFixos - v('fixos')

  const pagos = e.pedidos_pagos.valor
  const base = e.pedidos_base_appmax.valor
  const div = (num: number, den: number) => (den > 0 ? Math.round(num / den) / 100 : null)

  const usandoSistema = CAMPOS.filter(f => !f.quantidade && f.grupo !== 'info' && e[f.campo].fonte === 'sistema').map(f => f.campo)

  return {
    efetivos: e,
    receitaProcessador: r(processador),
    receitaLiquida: r(liquida),
    variaveis: r(variaveis),
    marketing: r(marketing),
    contribuicao: r(contribuicao),
    antesDosFixos: r(antesDosFixos),
    lucro: r(lucro),
    freteLiquido: r(v('frete') - v('frete_cobrado')),
    margem: {
      valor: liquida > 0 ? Math.round((lucro / liquida) * 10000) / 100 : null,
      formula: 'lucro operacional ÷ receita líquida pós-perdas',
      entradas: [{ rotulo: 'Lucro operacional', valor: brl(r(lucro)) }, { rotulo: 'Receita líquida pós-perdas', valor: brl(r(liquida)) }],
    },
    ticket: {
      valor: div(v('receita_bruta'), pagos),
      formula: 'vendas brutas Yampi ÷ pedidos pagos (Yampi)',
      entradas: [{ rotulo: 'Vendas brutas', valor: brl(e.receita_bruta.valor) }, { rotulo: 'Pedidos pagos', valor: String(pagos) }],
    },
    cpa: {
      valor: div(marketing, base),
      formula: 'marketing (Meta pela fatura + Google) ÷ base financeira AppMax',
      entradas: [{ rotulo: 'Marketing', valor: brl(r(marketing)) }, { rotulo: 'Base AppMax', valor: String(base) }],
    },
    lucroPorPedido: {
      valor: div(lucro, base),
      formula: 'lucro operacional ÷ base financeira AppMax',
      entradas: [{ rotulo: 'Lucro operacional', valor: brl(r(lucro)) }, { rotulo: 'Base AppMax', valor: String(base) }],
    },
    cpaEquilibrio: {
      valor: div(liquida - variaveis - v('fixos'), base),
      formula: '(receita líquida − custos variáveis − fixos) ÷ base AppMax: o CPA em que o lucro zera',
      entradas: [
        { rotulo: 'Receita líquida', valor: brl(r(liquida)) },
        { rotulo: 'Custos variáveis', valor: brl(r(variaveis)) },
        { rotulo: 'Custos fixos', valor: brl(e.fixos.valor) },
        { rotulo: 'Base AppMax', valor: String(base) },
      ],
    },
    usandoSistema,
  }
}

/** Mês no formato YYYY-MM; inválido ou ausente → mês anterior ao atual (BRT). */
export function mesValido(mes: string | undefined, hoje = new Date()): string {
  if (mes && /^\d{4}-(0[1-9]|1[0-2])$/.test(mes)) return mes
  const brt = new Date(hoje.getTime() - 3 * 3600e3)
  const d = new Date(Date.UTC(brt.getUTCFullYear(), brt.getUTCMonth() - 1, 1))
  return d.toISOString().slice(0, 7)
}

export function limitesDoMes(mes: string): { from: string; to: string } {
  const [y, m] = mes.split('-').map(Number)
  const fim = new Date(Date.UTC(y, m, 0)).getUTCDate()
  return { from: `${mes}-01`, to: `${mes}-${String(fim).padStart(2, '0')}` }
}

export function mesVizinho(mes: string, delta: number): string {
  const [y, m] = mes.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1 + delta, 1)).toISOString().slice(0, 7)
}

/** Limpa o que veio do formulário: só campos conhecidos, números finitos, faixa plausível. */
export function sanitizarValores(entrada: unknown): Valores {
  const out: Valores = {}
  if (!entrada || typeof entrada !== 'object') return out
  for (const { campo } of CAMPOS) {
    const x = (entrada as Record<string, unknown>)[campo]
    if (typeof x === 'number' && Number.isFinite(x) && Math.abs(x) < 1e9) out[campo] = Math.round(x * 100) / 100
  }
  return out
}

/** Erro do Supabase de tabela ainda não criada (a migration da `fechamento_mensal` não rodou). */
export function tabelaAusente(err: { code?: string; message?: string } | null): boolean {
  if (!err) return false
  if (err.code === '42P01' || err.code === 'PGRST205') return true
  const msg = err.message ?? ''
  return /fechamento_mensal/.test(msg) && /does not exist|schema cache/.test(msg)
}
