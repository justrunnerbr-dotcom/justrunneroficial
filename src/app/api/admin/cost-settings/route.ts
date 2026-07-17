import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getAdminSupabase } from '@/lib/admin-client'

const STORE_ID = 'b0000000-0000-0000-0000-000000000001'

async function checkAuth() {
  const cookieStore = await cookies()
  const token  = cookieStore.get('jhf_admin')?.value
  const secret = process.env.ADMIN_SECRET
  return !!secret && token === secret
}

const FIELDS = [
  'yampi_fee_pct', 'appmax_pix_pct', 'appmax_pix_fixed', 'appmax_card_pct',
  'appmax_boleto_fixed', 'appmax_gateway_fixed', 'frete_gratis_custo',
] as const

export async function POST(req: Request) {
  if (!await checkAuth()) return NextResponse.json({ ok: false }, { status: 401 })

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
    .eq('store_id', STORE_ID)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
