'use server'
import { checkAuth, currentActor } from '@/lib/admin/auth'
import { logAudit } from '@/lib/admin/audit'

/** Registra na auditoria que alguém exportou um recorte do admin. O arquivo é
 *  montado no navegador; aqui só fica o rastro de quem baixou o quê. */
export async function registrarExportacao(tabela: string, periodo: string, linhas: number): Promise<void> {
  if (!(await checkAuth())) return
  await logAudit({
    actor:      await currentActor(),
    action:     'exportacao',
    entityType: 'dashboard',
    entityId:   tabela,
    summary:    `Exportou "${tabela}" (${periodo}, ${linhas} linhas)`,
    metadata:   { tabela, periodo, linhas },
  })
}
