import type { SupabaseClient } from '@supabase/supabase-js'

// Rotinas frequentes chamadas pelo pg_cron do Supabase (o plano Hobby da Vercel
// só agenda 1×/dia). Na JHF o pg_cron já parou uma vez sem aviso, então cada
// rota grava aqui quando termina bem e o /admin/alertas avisa se alguma parar.
// minutos = intervalo agendado em 20261026000003_pg_cron_rotinas.sql.
export const ROTINAS: { nome: string; minutos: number }[] = [
  { nome: 'yampi-sync',        minutos: 10 },
  { nome: 'analytics-refresh', minutos: 5 },
]

export async function marcarRotina(db: SupabaseClient, nome: string, detalhe?: string): Promise<void> {
  await db.from('rotinas_heartbeat').upsert({ rotina: nome, ultimo_ok: new Date().toISOString(), detalhe: detalhe ?? null })
}
