'use client'

import type { ConversationRow } from '../page'

function timeSince(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const mins   = Math.floor(diffMs / 60000)
  if (mins < 1)    return 'agora'
  if (mins < 60)   return `${mins}min`
  const hours  = Math.floor(mins / 60)
  if (hours < 24)  return `${hours}h`
  const days   = Math.floor(hours / 24)
  return `${days}d`
}

export function ConversationList({
  conversations,
  selectedId,
  onSelect,
}: {
  conversations: ConversationRow[]
  selectedId:    string | null
  onSelect:      (id: string) => void
}) {
  if (conversations.length === 0) {
    return (
      <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--admin-text-muted)', fontSize: '13px' }}>
        Nenhuma conversa ainda.
      </div>
    )
  }

  return (
    <div style={{ overflowY: 'auto', flex: 1 }}>
      {conversations.map(c => {
        const active = c.id === selectedId
        return (
          <button
            key={c.id}
            onClick={() => onSelect(c.id)}
            style={{
              display: 'block', width: '100%', textAlign: 'left',
              padding: '12px 16px', background: active ? 'var(--admin-card-hover)' : 'transparent',
              border: 'none', borderBottom: '1px solid var(--admin-border)', cursor: 'pointer',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--admin-text-main)' }}>
                {c.customer_name ?? c.customer_phone}
              </span>
              <span style={{ fontSize: '10px', color: 'var(--admin-text-muted)', flexShrink: 0, marginLeft: '8px' }}>
                {timeSince(c.last_message_at)}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
              <span style={{
                fontSize: '12px', color: 'var(--admin-text-muted)', overflow: 'hidden',
                textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
              }}>
                {c.last_message_preview ?? ''}
              </span>
              {c.unread_count > 0 && (
                <span style={{
                  fontSize: '10px', fontWeight: 700, color: '#fff', background: 'var(--admin-accent)',
                  borderRadius: '10px', padding: '2px 6px', flexShrink: 0, minWidth: '16px', textAlign: 'center',
                }}>
                  {c.unread_count}
                </span>
              )}
            </div>
          </button>
        )
      })}
    </div>
  )
}
