import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/admin-client'
import { checkAuth } from '@/lib/admin/auth'

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
