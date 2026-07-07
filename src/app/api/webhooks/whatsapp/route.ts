import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyWhatsappSignature } from '@/lib/whatsapp/api'
import { JHF_STORE_ID } from '@/lib/yampi/sync'

function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  )
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const mode      = url.searchParams.get('hub.mode')
  const token     = url.searchParams.get('hub.verify_token')
  const challenge = url.searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN && challenge) {
    return new NextResponse(challenge, { status: 200 })
  }
  return NextResponse.json({ ok: false }, { status: 403 })
}

interface WhatsappMessage {
  from: string
  id:   string
  timestamp: string
  type: string
  text?: { body?: string }
}

interface WhatsappStatus {
  id:     string
  status: string
}

interface WhatsappChangeValue {
  metadata?:  { phone_number_id?: string }
  contacts?:  Array<{ profile?: { name?: string }; wa_id?: string }>
  messages?:  WhatsappMessage[]
  statuses?:  WhatsappStatus[]
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.text()
    const signature = request.headers.get('x-hub-signature-256')

    if (!verifyWhatsappSignature(rawBody, signature)) {
      return NextResponse.json({ ok: false }, { status: 401 })
    }

    const body = JSON.parse(rawBody) as {
      entry?: Array<{ changes?: Array<{ value?: WhatsappChangeValue }> }>
    }

    const db = getDb()

    for (const entry of body.entry ?? []) {
      for (const change of entry.changes ?? []) {
        const value = change.value
        if (!value) continue

        const phoneNumberId = value.metadata?.phone_number_id
        if (!phoneNumberId) continue

        for (const msg of value.messages ?? []) {
          const customerPhone = msg.from
          const customerName  = value.contacts?.find(c => c.wa_id === customerPhone)?.profile?.name ?? null
          const preview        = msg.text?.body ?? `[${msg.type}]`

          const { data: existing } = await db
            .from('whatsapp_conversations')
            .select('id, unread_count')
            .eq('store_id', JHF_STORE_ID)
            .eq('wa_phone_number_id', phoneNumberId)
            .eq('customer_phone', customerPhone)
            .maybeSingle()

          let conversationId = existing?.id as string | undefined

          if (conversationId) {
            await db.from('whatsapp_conversations').update({
              customer_name:         customerName ?? undefined,
              last_message_at:       new Date().toISOString(),
              last_message_preview:  preview,
              unread_count:          (existing?.unread_count ?? 0) + 1,
            }).eq('id', conversationId)
          } else {
            const { data: created } = await db.from('whatsapp_conversations').insert({
              store_id:              JHF_STORE_ID,
              wa_phone_number_id:    phoneNumberId,
              customer_phone:        customerPhone,
              customer_name:         customerName,
              last_message_at:       new Date().toISOString(),
              last_message_preview:  preview,
              unread_count:          1,
            }).select('id').single()
            conversationId = created?.id
          }

          if (conversationId) {
            await db.from('whatsapp_messages').insert({
              conversation_id: conversationId,
              direction:       'inbound',
              body:            msg.text?.body ?? preview,
              wa_message_id:   msg.id,
              status:          'received',
            })
          }
        }

        for (const status of value.statuses ?? []) {
          await db.from('whatsapp_messages').update({ status: status.status }).eq('wa_message_id', status.id)
        }
      }
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[whatsapp-webhook]', err)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
