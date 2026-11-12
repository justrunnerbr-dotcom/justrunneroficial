import { getAdminSupabase } from '@/lib/admin-client'

// Monitor externo do banco (12/11/2026): a Supabase pausou o projeto por fatura
// e nada avisou — o pg_cron e o /admin/alertas morrem junto com o banco. Quem
// chama esta rota é o GitHub Actions (.github/workflows/monitor-banco.yml) a
// cada 30 min; resposta diferente de 200 faz o job falhar e o GitHub manda
// e-mail. Não expõe dado nenhum além de "ok" e do tempo de resposta.
export const dynamic = 'force-dynamic'

export async function GET() {
  const t = Date.now()
  try {
    const consulta = getAdminSupabase().from('products').select('id', { count: 'exact', head: true }).eq('status', 'active')
    const limite = new Promise<never>((_, rej) => setTimeout(() => rej(new Error('sem resposta em 10 s')), 10_000))
    const { count, error } = await Promise.race([consulta, limite])
    if (error) throw new Error(error.message || 'erro na consulta')
    if (!count) throw new Error('nenhum produto ativo')
    return Response.json({ ok: true, ms: Date.now() - t }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (err) {
    const motivo = err instanceof Error ? err.message : String(err)
    return Response.json({ ok: false, ms: Date.now() - t, motivo: motivo.slice(0, 200) }, { status: 503, headers: { 'Cache-Control': 'no-store' } })
  }
}
