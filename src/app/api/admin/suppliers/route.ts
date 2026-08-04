import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/admin-client'
import { checkAuth } from '@/lib/admin/auth'

export async function POST(req: Request) {
  if (!await checkAuth()) return NextResponse.json({ ok: false }, { status: 401 })

  const { name } = await req.json() as { name?: string }
  if (!name?.trim()) {
    return NextResponse.json({ error: 'Nome do fornecedor é obrigatório.' }, { status: 400 })
  }

  const db = getAdminSupabase()
  const { data, error } = await db
    .from('suppliers')
    .upsert({ name: name.trim() }, { onConflict: 'store_id,name' })
    .select('id, name')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, supplier: data })
}
