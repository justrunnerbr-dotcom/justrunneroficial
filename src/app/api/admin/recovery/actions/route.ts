import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getAdminSupabase } from '@/lib/admin-client'
import { STORE_ID } from '@/lib/yampi/sync'

async function checkAuth() {
  const cookieStore = await cookies()
  const token  = cookieStore.get('jhf_admin')?.value
  const secret = process.env.ADMIN_SECRET
  return !!secret && token === secret
}

export async function GET() {
  if (!await checkAuth()) return NextResponse.json({ ok: false }, { status: 401 })

  const db = getAdminSupabase()
  const { data } = await db
    .from('recovery_actions')
    .select('yampi_cart_id, status, contacted_at')
    .eq('store_id', STORE_ID)

  return NextResponse.json({ actions: data ?? [] })
}

export async function POST(req: Request) {
  if (!await checkAuth()) return NextResponse.json({ ok: false }, { status: 401 })

  const { yampiCartId, status } = await req.json() as { yampiCartId?: string; status?: string }
  if (!yampiCartId || !['contacted', 'ignored', 'recovered_manual'].includes(status ?? '')) {
    return NextResponse.json({ error: 'yampiCartId e status válido são obrigatórios.' }, { status: 400 })
  }

  const db = getAdminSupabase()
  const { error } = await db.from('recovery_actions').upsert(
    {
      store_id:      STORE_ID,
      yampi_cart_id: yampiCartId,
      status,
      contacted_at:  status === 'contacted' ? new Date().toISOString() : undefined,
      updated_at:    new Date().toISOString(),
    },
    { onConflict: 'store_id,yampi_cart_id' },
  )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// Desfaz uma marcação manual (ex: cliente desistiu ou pediu estorno depois de marcado
// como recuperado) — some a linha, voltando pro estado padrão "Abandonado".
export async function DELETE(req: Request) {
  if (!await checkAuth()) return NextResponse.json({ ok: false }, { status: 401 })

  const { yampiCartId } = await req.json() as { yampiCartId?: string }
  if (!yampiCartId) {
    return NextResponse.json({ error: 'yampiCartId é obrigatório.' }, { status: 400 })
  }

  const db = getAdminSupabase()
  const { error } = await db
    .from('recovery_actions')
    .delete()
    .eq('store_id', STORE_ID)
    .eq('yampi_cart_id', yampiCartId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
