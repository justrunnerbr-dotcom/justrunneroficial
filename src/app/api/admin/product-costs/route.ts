import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/admin-client'
import { checkAuth, unauthorized, currentActor, clientIp } from '@/lib/admin/auth'
import { logAudit } from '@/lib/admin/audit'

export async function POST(req: Request) {
  if (!(await checkAuth())) return unauthorized()

  const { supplierId, modelName, cost, notes } = await req.json() as {
    supplierId?: string; modelName?: string; cost?: number; notes?: string
  }
  if (!supplierId || !modelName?.trim() || typeof cost !== 'number' || cost < 0) {
    return NextResponse.json({ error: 'supplierId, modelName e cost (>=0) são obrigatórios.' }, { status: 400 })
  }

  const db = getAdminSupabase()
  const { error } = await db
    .from('product_costs')
    .upsert(
      { supplier_id: supplierId, model_name: modelName.trim(), cost, notes: notes ?? null, updated_at: new Date().toISOString() },
      { onConflict: 'store_id,supplier_id,model_name' },
    )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await logAudit({
    actor:      await currentActor(),
    action:     'custo_produto',
    entityType: 'product_cost',
    entityId:   modelName.trim(),
    summary:    `Definiu custo de "${modelName.trim()}" em R$ ${cost.toFixed(2)}`,
    metadata:   { supplierId, cost, notes: notes ?? null },
    ip:         clientIp(req),
  })

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request) {
  if (!(await checkAuth())) return unauthorized()

  const { id } = await req.json() as { id?: string }
  if (!id) return NextResponse.json({ error: 'id é obrigatório.' }, { status: 400 })

  const db = getAdminSupabase()
  const { error } = await db.from('product_costs').delete().eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await logAudit({
    actor:      await currentActor(),
    action:     'custo_produto',
    entityType: 'product_cost',
    entityId:   id,
    summary:    `Removeu o custo cadastrado ${id}`,
    ip:         clientIp(req),
  })

  return NextResponse.json({ ok: true })
}
