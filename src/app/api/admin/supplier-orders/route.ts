import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getAdminSupabase } from '@/lib/admin-client'

async function checkAuth() {
  const cookieStore = await cookies()
  const token  = cookieStore.get('jhf_admin')?.value
  const secret = process.env.ADMIN_SECRET
  return !!secret && token === secret
}

type DraftItem = {
  supplierId: string
  orderDate: string
  modelName: string
  quantityOrdered: number
  unitCost: number
  notes?: string
}

export async function POST(req: Request) {
  if (!await checkAuth()) return NextResponse.json({ ok: false }, { status: 401 })

  const { items } = await req.json() as { items?: DraftItem[] }
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'items (array não vazio) é obrigatório.' }, { status: 400 })
  }
  for (const item of items) {
    if (!item.supplierId || !item.orderDate || !item.modelName?.trim() || !item.quantityOrdered || item.quantityOrdered <= 0
      || typeof item.unitCost !== 'number' || item.unitCost < 0) {
      return NextResponse.json({ error: 'Cada item precisa de supplierId, orderDate, modelName, quantityOrdered (>0) e unitCost (>=0).' }, { status: 400 })
    }
  }

  const db = getAdminSupabase()
  const { error } = await db.from('supplier_order_items').insert(items.map(item => ({
    supplier_id:      item.supplierId,
    order_date:       item.orderDate,
    model_name:       item.modelName.trim(),
    quantity_ordered: item.quantityOrdered,
    unit_cost:        item.unitCost,
    notes:            item.notes ?? null,
  })))

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function PATCH(req: Request) {
  if (!await checkAuth()) return NextResponse.json({ ok: false }, { status: 401 })

  const { id, quantityReceived, modelName, quantityOrdered, unitCost, notes } = await req.json() as {
    id?: string; quantityReceived?: number | null; modelName?: string
    quantityOrdered?: number; unitCost?: number; notes?: string | null
  }
  if (!id) return NextResponse.json({ error: 'id é obrigatório.' }, { status: 400 })

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (quantityReceived !== undefined) updates.quantity_received = quantityReceived
  if (modelName !== undefined) updates.model_name = modelName.trim()
  if (quantityOrdered !== undefined) updates.quantity_ordered = quantityOrdered
  if (unitCost !== undefined) updates.unit_cost = unitCost
  if (notes !== undefined) updates.notes = notes

  const db = getAdminSupabase()
  const { error } = await db.from('supplier_order_items').update(updates).eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request) {
  if (!await checkAuth()) return NextResponse.json({ ok: false }, { status: 401 })

  const { id } = await req.json() as { id?: string }
  if (!id) return NextResponse.json({ error: 'id é obrigatório.' }, { status: 400 })

  const db = getAdminSupabase()
  const { error } = await db.from('supplier_order_items').delete().eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
