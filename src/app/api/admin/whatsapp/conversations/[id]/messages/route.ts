import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getAdminSupabase } from '@/lib/admin-client'

async function checkAuth() {
  const cookieStore = await cookies()
  const token  = cookieStore.get('jhf_admin')?.value
  const secret = process.env.ADMIN_SECRET
  return !!secret && token === secret
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await checkAuth()) return NextResponse.json({ ok: false }, { status: 401 })

  const { id } = await params
  const db = getAdminSupabase()

  const { data } = await db
    .from('whatsapp_messages')
    .select('id, direction, body, status, created_at')
    .eq('conversation_id', id)
    .order('created_at', { ascending: true })

  await db.from('whatsapp_conversations').update({ unread_count: 0 }).eq('id', id)

  return NextResponse.json({ messages: data ?? [] })
}
