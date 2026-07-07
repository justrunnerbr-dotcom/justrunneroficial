import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getAdminSupabase } from '@/lib/admin-client'
import { sendWhatsappText } from '@/lib/whatsapp/api'

async function checkAuth() {
  const cookieStore = await cookies()
  const token  = cookieStore.get('jhf_admin')?.value
  const secret = process.env.ADMIN_SECRET
  return !!secret && token === secret
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await checkAuth()) return NextResponse.json({ ok: false }, { status: 401 })

  const { id } = await params
  const { body } = await req.json() as { body?: string }
  if (!body?.trim()) return NextResponse.json({ error: 'mensagem vazia' }, { status: 400 })

  const db = getAdminSupabase()
  const { data: conversation } = await db
    .from('whatsapp_conversations')
    .select('wa_phone_number_id, customer_phone')
    .eq('id', id)
    .single()

  if (!conversation) return NextResponse.json({ error: 'conversa não encontrada' }, { status: 404 })

  const result = await sendWhatsappText(conversation.wa_phone_number_id, conversation.customer_phone, body)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 502 })

  await db.from('whatsapp_messages').insert({
    conversation_id: id,
    direction:       'outbound',
    body,
    wa_message_id:   result.waMessageId,
    status:          'sent',
  })
  await db.from('whatsapp_conversations').update({
    last_message_at:      new Date().toISOString(),
    last_message_preview: body,
    unread_count:         0,
  }).eq('id', id)

  return NextResponse.json({ ok: true })
}
