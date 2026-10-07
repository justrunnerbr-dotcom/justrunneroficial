import { getAdminSupabase } from '@/lib/admin-client'
import { getDateRangeFromSearchParams } from '@/lib/admin/date-range'
import { getFinancialBreakdown, loadOrderEconomics } from '@/lib/admin/financial-breakdown'
import {
  calcularFechamento, limitesDoMes, mesValido, sanitizarValores, tabelaAusente,
  type ResultadoFechamento, type Valores,
} from '@/lib/admin/fechamento'

// Leitura do Fechamento do Mês, compartilhada pela aba de fechamento e pela
// Análise Suprema. As duas precisam usar a MESMA conta: se cada tela calculasse
// o equilíbrio do seu jeito, o admin mostraria dois números para a mesma pergunta.

const STORE_ID = 'b0000000-0000-0000-0000-000000000001'
const r2 = (v: number) => Math.round(v * 100) / 100

/** O que o sistema calcula para o mês, na mesma conta do Dashboard. */
export async function sugestoesDoSistema(mes: string): Promise<{ sistema: Valores; fontesFaltando: string[] }> {
  const range = getDateRangeFromSearchParams(limitesDoMes(mes))
  const { orders, settings } = await loadOrderEconomics(range)
  const fin = await getFinancialBreakdown(range, { orders, settings })
  return {
    sistema: {
      receita_bruta: r2(fin.revenue),
      pedidos_pagos: orders.length,
      taxas_pre_recebimento: r2(fin.gatewayFee),
      cmv: r2(fin.productCost),
      frete: r2(fin.freightCost),
      logistica: r2(fin.logisticsCost),
      yampi: r2(fin.yampiFee),
      meta: r2(fin.metaSpend + fin.mediaTax),
      google: r2(fin.googleAdsSpend),
      frete_cobrado: r2(fin.freightPassThrough),
    },
    fontesFaltando: fin.missingCostSources,
  }
}

export interface FechamentoSalvo {
  digitados: Valores
  usarSistema: boolean
  observacoes: string
  atualizadoEm: string | null
  atualizadoPor: string | null
  tabelaExiste: boolean
}

/** Valores digitados do mês. Sem a tabela (migration não rodada), devolve vazio e avisa. */
export async function fechamentoSalvo(mes: string): Promise<FechamentoSalvo> {
  const { data, error } = await getAdminSupabase().from('fechamento_mensal')
    .select('valores, usar_sistema, observacoes, atualizado_em, atualizado_por')
    .eq('store_id', STORE_ID).eq('mes', mes).maybeSingle()
  const tabelaExiste = !tabelaAusente(error)
  if (error && tabelaExiste) console.error('[fechamento] leitura falhou:', error.message)
  return {
    digitados: data ? sanitizarValores(data.valores) : {},
    usarSistema: data?.usar_sistema ?? true,
    observacoes: data?.observacoes ?? '',
    atualizadoEm: data?.atualizado_em ?? null,
    atualizadoPor: data?.atualizado_por ?? null,
    tabelaExiste,
  }
}

export interface UltimoFechamento {
  mes: string
  resultado: ResultadoFechamento
  /** fixos e perdas só valem quando vieram do fechamento (fatura/extrato), não de sugestão */
  fixosDigitados: boolean
  perdasDigitadas: boolean
  tabelaExiste: boolean
}

/** Mês anterior ao atual (Brasília), pelas regras do fechamento oficial. */
export async function ultimoFechamento(agora = new Date()): Promise<UltimoFechamento> {
  const mes = mesValido(undefined, agora)
  const [{ sistema }, salvo] = await Promise.all([sugestoesDoSistema(mes), fechamentoSalvo(mes)])
  const resultado = calcularFechamento(salvo.digitados, sistema, salvo.usarSistema)
  return {
    mes,
    resultado,
    fixosDigitados: resultado.efetivos.fixos.fonte === 'digitado',
    perdasDigitadas: resultado.efetivos.perdas.fonte === 'digitado',
    tabelaExiste: salvo.tabelaExiste,
  }
}
