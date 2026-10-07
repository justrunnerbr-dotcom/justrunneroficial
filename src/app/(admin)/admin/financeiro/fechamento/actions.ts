'use server'
import { getAdminSupabase } from '@/lib/admin-client'
import { checkAuth, currentActor } from '@/lib/admin/auth'
import { logAudit } from '@/lib/admin/audit'
import { sanitizarValores, tabelaAusente } from '@/lib/admin/fechamento'

const STORE_ID = 'b0000000-0000-0000-0000-000000000001'

export type ResultadoSalvar =
  | { ok: true; atualizadoEm: string }
  | { ok: false; erro: 'nao_autorizado' | 'mes_invalido' | 'tabela_ausente' | 'falhou'; mensagem?: string }

export async function salvarFechamento(
  mes: string,
  valoresBrutos: unknown,
  usarSistema: boolean,
  observacoes: string,
): Promise<ResultadoSalvar> {
  if (!(await checkAuth())) return { ok: false, erro: 'nao_autorizado' }
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(mes)) return { ok: false, erro: 'mes_invalido' }

  const valores = sanitizarValores(valoresBrutos)
  const actor = await currentActor()
  const atualizadoEm = new Date().toISOString()
  const db = getAdminSupabase()

  const { error } = await db.from('fechamento_mensal').upsert({
    store_id: STORE_ID,
    mes,
    valores,
    usar_sistema: !!usarSistema,
    observacoes: String(observacoes ?? '').slice(0, 5000),
    atualizado_em: atualizadoEm,
    atualizado_por: actor,
  }, { onConflict: 'store_id,mes' })

  if (error) {
    if (tabelaAusente(error)) return { ok: false, erro: 'tabela_ausente' }
    console.error('[fechamento] não salvou:', error.message)
    return { ok: false, erro: 'falhou', mensagem: error.message }
  }

  await logAudit({
    actor,
    action: 'fechamento_alterado',
    entityType: 'fechamento_mensal',
    entityId: mes,
    summary: `Fechamento ${mes}: ${Object.keys(valores).length} valores digitados`,
    metadata: { mes, valores, usarSistema: !!usarSistema },
  })
  return { ok: true, atualizadoEm }
}
