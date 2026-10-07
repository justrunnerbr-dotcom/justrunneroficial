import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/admin-client'
import { checkAuth, unauthorized, currentActor, clientIp } from '@/lib/admin/auth'
import { logAudit } from '@/lib/admin/audit'

const FIELDS = [
  'yampi_fee_pct', 'appmax_pix_pct', 'appmax_pix_fixed', 'appmax_card_pct',
  'appmax_boleto_fixed', 'appmax_gateway_fixed', 'frete_gratis_custo',
  'custo_logistica_pedido',
] as const

export async function POST(req: Request) {
  if (!(await checkAuth())) return unauthorized()

  const body = await req.json() as Partial<Record<(typeof FIELDS)[number], number>>
  const update: Record<string, number> = {}
  for (const f of FIELDS) {
    if (typeof body[f] === 'number' && body[f]! >= 0) update[f] = body[f]!
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Nenhum campo válido enviado.' }, { status: 400 })
  }

  const db = getAdminSupabase()
  const { error } = await db
    .from('cost_settings')
    .update({ ...update, updated_at: new Date().toISOString() })
    .eq('store_id', 'b0000000-0000-0000-0000-000000000001')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Taxa de gateway e custo de frete entram no cálculo de Lucro Líquido de
  // TODOS os pedidos do período — mudar isso reescreve a leitura financeira
  // inteira, então precisa saber quem mudou e para quanto.
  await logAudit({
    actor:      await currentActor(),
    action:     'custo_config',
    entityType: 'cost_settings',
    summary:    `Alterou parâmetros de custo: ${Object.keys(update).join(', ')}`,
    metadata:   update,
    ip:         clientIp(req),
  })

  return NextResponse.json({ ok: true })
}
