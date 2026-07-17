import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getAdminSupabase } from '@/lib/admin-client'

async function checkAuth() {
  const cookieStore = await cookies()
  const token  = cookieStore.get('jhf_admin')?.value
  const secret = process.env.ADMIN_SECRET
  return !!secret && token === secret
}

type ItemInput = { productTitle?: string; quantity?: number; unitCost?: number; supplierId?: string }

export async function POST(req: Request) {
  if (!await checkAuth()) return NextResponse.json({ ok: false }, { status: 401 })

  const body = await req.json() as {
    orderNumber?: string; customerName?: string; total?: number; shippingAmount?: number
    paymentMethod?: string; installments?: number; notes?: string; createdAt?: string
    items?: ItemInput[]
  }

  if (!body.orderNumber?.trim() || typeof body.total !== 'number' || body.total < 0) {
    return NextResponse.json({ error: 'orderNumber e total (>=0) são obrigatórios.' }, { status: 400 })
  }
  if (!['pix', 'credit_card', 'boleto'].includes(body.paymentMethod ?? '')) {
    return NextResponse.json({ error: 'paymentMethod inválido.' }, { status: 400 })
  }
  const items = (body.items ?? []).filter(i => i.productTitle?.trim())
  if (items.length === 0) {
    return NextResponse.json({ error: 'Pelo menos 1 produto é obrigatório.' }, { status: 400 })
  }

  const db = getAdminSupabase()
  const { data: order, error: orderError } = await db
    .from('manual_orders')
    .insert({
      order_number:     body.orderNumber.trim(),
      customer_name:    body.customerName?.trim() || null,
      total:            body.total,
      shipping_amount:  body.shippingAmount ?? 0,
      payment_method:   body.paymentMethod,
      installments:     body.installments ?? 1,
      notes:            body.notes?.trim() || null,
      ...(body.createdAt ? { created_at: body.createdAt } : {}),
    })
    .select('id')
    .single()

  if (orderError) return NextResponse.json({ error: orderError.message }, { status: 500 })

  const { error: itemsError } = await db.from('manual_order_items').insert(
    items.map(i => ({
      manual_order_id: order.id,
      product_title:   i.productTitle!.trim(),
      quantity:        i.quantity ?? 1,
      unit_cost:       i.unitCost ?? 0,
      supplier_id:     i.supplierId || null,
    })),
  )
  if (itemsError) return NextResponse.json({ error: itemsError.message }, { status: 500 })

  return NextResponse.json({ ok: true, orderId: order.id })
}

export async function DELETE(req: Request) {
  if (!await checkAuth()) return NextResponse.json({ ok: false }, { status: 401 })

  const { id } = await req.json() as { id?: string }
  if (!id) return NextResponse.json({ error: 'id é obrigatório.' }, { status: 400 })

  const db = getAdminSupabase()
  const { error } = await db.from('manual_orders').delete().eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
