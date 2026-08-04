import { getAdminSupabase } from '@/lib/admin-client'

// Registro de quem fez o quê no admin.
//
// Regra de ouro deste módulo: auditar NUNCA pode quebrar a ação auditada. Se a
// tabela não existir (migration não rodada) ou a gravação falhar, a ação do
// usuário segue normalmente e o problema vai pro log do servidor. Um painel que
// deixa de pausar campanha porque o log de auditoria caiu seria pior do que não
// ter log nenhum.
//
// A contrapartida é que a ausência de registro não prova ausência de ação —
// por isso /admin/saude checa se a tabela existe.

export type AuditAction =
  | 'login_ok'
  | 'login_falhou'
  | 'logout'
  | 'campanha_status'
  | 'custo_produto'
  | 'custo_config'
  | 'produto_editado'
  | 'produto_criado'
  | 'variante_editada'
  | 'pedido_sync'
  | 'pedido_custo_override'
  | 'mapeamento_legado'
  | 'config_alterada'
  | 'campanha_criada'
  | 'cliente_contatado'

export interface AuditEntry {
  actor:       string
  action:      AuditAction
  entityType?: string
  entityId?:   string
  summary?:    string
  metadata?:   Record<string, unknown>
  ip?:         string
}

export async function logAudit(entry: AuditEntry): Promise<void> {
  try {
    const db = getAdminSupabase()
    const { error } = await db.from('admin_audit_log').insert({
      actor:       entry.actor,
      action:      entry.action,
      entity_type: entry.entityType ?? null,
      entity_id:   entry.entityId   ?? null,
      summary:     entry.summary    ?? null,
      metadata:    entry.metadata   ?? null,
      ip:          entry.ip         ?? null,
    })
    if (error) {
      console.error('[auditoria] não gravou:', error.message, '·', entry.action, entry.summary ?? '')
    }
  } catch (err) {
    console.error('[auditoria] não gravou:', err)
  }
}

/**
 * Quantas tentativas de login falharam neste IP na janela informada.
 *
 * Substitui o limitador anterior, que vivia num `Map` em memória — em
 * serverless cada instância tinha o próprio Map e cold start zerava a
 * contagem, então na prática o limite quase não existia.
 *
 * Em caso de falha na leitura devolve 0 (não bloqueia ninguém): preferimos
 * deixar passar a trancar o dono do painel para fora por um erro de banco.
 */
export async function countRecentLoginFailures(ip: string, windowMinutes: number): Promise<number> {
  if (!ip || ip === 'unknown') return 0

  try {
    const since = new Date(Date.now() - windowMinutes * 60_000).toISOString()
    const db = getAdminSupabase()
    const { count, error } = await db
      .from('admin_audit_log')
      .select('id', { count: 'exact', head: true })
      .eq('action', 'login_falhou')
      .eq('ip', ip)
      .gte('created_at', since)

    if (error) {
      console.error('[auditoria] contagem de falhas de login indisponível:', error.message)
      return 0
    }
    return count ?? 0
  } catch (err) {
    console.error('[auditoria] contagem de falhas de login indisponível:', err)
    return 0
  }
}

export interface AuditRow {
  id:          string
  actor:       string
  action:      string
  entity_type: string | null
  entity_id:   string | null
  summary:     string | null
  ip:          string | null
  created_at:  string
}

/** Últimas entradas, pra exibir na tela de auditoria. */
export async function getRecentAudit(limit = 200): Promise<{ rows: AuditRow[]; available: boolean }> {
  try {
    const db = getAdminSupabase()
    const { data, error } = await db
      .from('admin_audit_log')
      .select('id, actor, action, entity_type, entity_id, summary, ip, created_at')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) return { rows: [], available: false }
    return { rows: (data ?? []) as AuditRow[], available: true }
  } catch {
    return { rows: [], available: false }
  }
}
