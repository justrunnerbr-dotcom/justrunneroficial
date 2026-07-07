import { getAdminSupabase } from '@/lib/admin-client'
import { JHF_STORE_ID } from '@/lib/yampi/sync'
import { ConversationView } from './_components/conversation-view'

export const metadata = { title: 'Conversas · JHF Admin' }

export interface ConversationRow {
  id:                    string
  customer_phone:        string
  customer_name:         string | null
  last_message_at:       string
  last_message_preview:  string | null
  unread_count:          number
}

export default async function WhatsappPage() {
  const db = getAdminSupabase()

  const { data } = await db
    .from('whatsapp_conversations')
    .select('id, customer_phone, customer_name, last_message_at, last_message_preview, unread_count')
    .eq('store_id', JHF_STORE_ID)
    .order('last_message_at', { ascending: false })

  return (
    <div style={{ padding: '32px', height: '100vh', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
      <div style={{ marginBottom: '20px', flexShrink: 0 }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--admin-text-main)', marginBottom: '4px' }}>Conversas</h1>
        <p style={{ fontSize: '14px', color: 'var(--admin-text-muted)' }}>
          Mensagens recebidas e enviadas pelo WhatsApp Business
        </p>
      </div>

      <ConversationView initialConversations={data ?? []} />
    </div>
  )
}
