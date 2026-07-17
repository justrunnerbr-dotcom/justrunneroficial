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
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request) {
  if (!await checkAuth()) return NextResponse.json({ ok: false }, { status: 401 })

  const { id } = await req.json() as { id?: string }
  if (!id) return NextResponse.json({ error: 'id é obrigatório.' }, { status: 400 })

  const db = getAdminSupabase()
  const { error } = await db.from('product_costs').delete().eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
