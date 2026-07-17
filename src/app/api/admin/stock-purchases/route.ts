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

  const { purchasedAt, supplierId, modelName, quantity, unitCost, notes } = await req.json() as {
    purchasedAt?: string; supplierId?: string | null; modelName?: string
    quantity?: number; unitCost?: number; notes?: string
  }
  if (!modelName?.trim() || !quantity || quantity <= 0 || typeof unitCost !== 'number' || unitCost < 0) {
    return NextResponse.json({ error: 'modelName, quantity (>0) e unitCost (>=0) são obrigatórios.' }, { status: 400 })
  }

  const db = getAdminSupabase()
  const { error } = await db.from('stock_purchases').insert({
    purchased_at: purchasedAt || new Date().toISOString().slice(0, 10),
    supplier_id:  supplierId || null,
    model_name:   modelName.trim(),
    quantity,
    unit_cost:    unitCost,
    notes:        notes ?? null,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request) {
  if (!await checkAuth()) return NextResponse.json({ ok: false }, { status: 401 })

  const { id } = await req.json() as { id?: string }
  if (!id) return NextResponse.json({ error: 'id é obrigatório.' }, { status: 400 })

  const db = getAdminSupabase()
  const { error } = await db.from('stock_purchases').delete().eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
