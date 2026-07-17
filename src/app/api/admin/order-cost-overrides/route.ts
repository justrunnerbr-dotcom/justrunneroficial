import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getAdminSupabase } from '@/lib/admin-client'

async function checkAuth() {
  const cookieStore = await cookies()
  const token  = cookieStore.get('jhf_admin')?.value
  const secret = process.env.ADMIN_SECRET
  return !!secret && token === secret
}

export async function POST(req: Request) {
  if (!await checkAuth()) return NextResponse.json({ ok: false }, { status: 401 })

  const { orderId, custoOverride, notes } = await req.json() as {
    orderId?: string; custoOverride?: number; notes?: string
  }
  if (!orderId || typeof custoOverride !== 'number' || custoOverride < 0) {
    return NextResponse.json({ error: 'orderId e custoOverride (>=0) são obrigatórios.' }, { status: 400 })
  }

  const db = getAdminSupabase()
  const { error } = await db
    .from('order_cost_overrides')
    .upsert(
      { order_id: orderId, custo_override: custoOverride, notes: notes ?? null, updated_at: new Date().toISOString() },
      { onConflict: 'store_id,order_id' },
    )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request) {
  if (!await checkAuth()) return NextResponse.json({ ok: false }, { status: 401 })

  const { orderId } = await req.json() as { orderId?: string }
  if (!orderId) return NextResponse.json({ error: 'orderId é obrigatório.' }, { status: 400 })

  const db = getAdminSupabase()
  const { error } = await db.from('order_cost_overrides').delete().eq('order_id', orderId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
