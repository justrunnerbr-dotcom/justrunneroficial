'use client'

import { useState, useEffect, useCallback } from 'react'
import { MessageCircle } from 'lucide-react'
import type { ConversationRow } from '../page'
import { ConversationList } from './conversation-list'
import { ConversationThread } from './conversation-thread'

export function ConversationView({ initialConversations }: { initialConversations: ConversationRow[] }) {
  const [conversations, setConversations] = useState(initialConversations)
  const [selectedId, setSelectedId]       = useState<string | null>(initialConversations[0]?.id ?? null)

  const refreshList = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/whatsapp/conversations')
      const json = await res.json() as { conversations?: ConversationRow[] }
      if (json.conversations) setConversations(json.conversations)
    } catch { /* mantém o estado anterior em caso de falha pontual */ }
  }, [])

  useEffect(() => {
    const interval = setInterval(refreshList, 8000)
    return () => clearInterval(interval)
  }, [refreshList])

  function handleSelect(id: string) {
    setSelectedId(id)
    setConversations(prev => prev.map(c => c.id === id ? { ...c, unread_count: 0 } : c))
  }

  const selected = conversations.find(c => c.id === selectedId)

  return (
    <div style={{
      display: 'flex', flex: 1, minHeight: 0,
      background: 'var(--admin-card)', border: '1px solid var(--admin-border)', borderRadius: '16px', overflow: 'hidden',
    }}>
      <div style={{ width: '300px', flexShrink: 0, borderRight: '1px solid var(--admin-border)', display: 'flex', flexDirection: 'column' }}>
        <ConversationList conversations={conversations} selectedId={selectedId} onSelect={handleSelect} />
      </div>

      {selected ? (
        <ConversationThread
          key={selected.id}
          conversationId={selected.id}
          customerLabel={selected.customer_name ?? selected.customer_phone}
        />
      ) : (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: 'var(--admin-text-muted)' }}>
          <MessageCircle size={32} style={{ opacity: 0.3, marginBottom: '12px' }} />
          <div style={{ fontSize: '13px' }}>Selecione uma conversa</div>
        </div>
      )}
    </div>
  )
}
