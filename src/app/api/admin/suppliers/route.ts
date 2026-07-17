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
