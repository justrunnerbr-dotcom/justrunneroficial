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
    .from('customer_contact_log')
    .select('email, bucket, contacted_at')
    .eq('store_id', STORE_ID)

  return NextResponse.json({ contacts: data ?? [] })
}

export async function POST(req: Request) {
  if (!await checkAuth()) return NextResponse.json({ ok: false }, { status: 401 })

  const { email, bucket } = await req.json() as { email?: string; bucket?: string }
  if (!email || !bucket) {
    return NextResponse.json({ error: 'email e bucket são obrigatórios.' }, { status: 400 })
  }

  const db = getAdminSupabase()
  const { error } = await db.from('customer_contact_log').upsert(
    { store_id: STORE_ID, email: email.toLowerCase(), bucket, contacted_at: new Date().toISOString() },
    { onConflict: 'store_id,email' },
  )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
