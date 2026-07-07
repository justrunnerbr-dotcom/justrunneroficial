import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getAdminSupabase } from '@/lib/admin-client'
import { JHF_STORE_ID } from '@/lib/yampi/sync'

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
    .from('whatsapp_conversations')
    .select('id, customer_phone, customer_name, last_message_at, last_message_preview, unread_count')
    .eq('store_id', JHF_STORE_ID)
    .order('last_message_at', { ascending: false })

  return NextResponse.json({ conversations: data ?? [] })
}
