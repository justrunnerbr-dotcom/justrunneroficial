'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Send } from 'lucide-react'

interface Message {
  id:         string
  direction:  'inbound' | 'outbound'
  body:       string | null
  status:     string
  created_at: string
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export function ConversationThread({ conversationId, customerLabel }: { conversationId: string; customerLabel: string }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [draft, setDraft]       = useState('')
  const [sending, setSending]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/whatsapp/conversations/${conversationId}/messages`)
      const json = await res.json() as { messages?: Message[] }
      setMessages(json.messages ?? [])
    } catch { /* mantém o estado anterior em caso de falha pontual */ }
  }, [conversationId])

  useEffect(() => {
    load()
    const interval = setInterval(load, 8000)
    return () => clearInterval(interval)
  }, [load])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  async function handleSend() {
    const body = draft.trim()
    if (!body || sending) return
    setSending(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/whatsapp/conversations/${conversationId}/reply`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ body }),
      })
      const json = await res.json() as { ok?: boolean; error?: string }
      if (!json.ok) {
        setError(json.error ?? 'Falha ao enviar')
      } else {
        setDraft('')
        await load()
      }
    } catch {
      setError('Falha ao enviar')
    } finally {
      setSending(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
      <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--admin-border)', flexShrink: 0 }}>
        <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--admin-text-main)' }}>{customerLabel}</div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {messages.map(m => (
          <div key={m.id} style={{ display: 'flex', justifyContent: m.direction === 'outbound' ? 'flex-end' : 'flex-start' }}>
            <div style={{
              maxWidth: '70%', padding: '8px 12px', borderRadius: '12px',
              background: m.direction === 'outbound' ? 'var(--admin-accent)' : 'var(--admin-card)',
              color: m.direction === 'outbound' ? '#fff' : 'var(--admin-text-main)',
              border: m.direction === 'outbound' ? 'none' : '1px solid var(--admin-border)',
              fontSize: '13px', lineHeight: 1.4,
            }}>
              <div style={{ whiteSpace: 'pre-wrap' }}>{m.body}</div>
              <div style={{
                fontSize: '10px', marginTop: '4px', textAlign: 'right',
                color: m.direction === 'outbound' ? 'rgba(255,255,255,0.75)' : 'var(--admin-text-muted)',
              }}>
                {fmtTime(m.created_at)}
              </div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {error && (
        <div style={{ padding: '8px 20px', fontSize: '12px', color: '#ef4444', background: 'rgba(239,68,68,0.08)' }}>{error}</div>
      )}

      <div style={{ display: 'flex', gap: '8px', padding: '14px 20px', borderTop: '1px solid var(--admin-border)', flexShrink: 0 }}>
        <textarea
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
          placeholder="Digite uma resposta..."
          rows={1}
          style={{
            flex: 1, resize: 'none', padding: '10px 14px', borderRadius: '10px',
            border: '1px solid var(--admin-border)', background: 'var(--admin-bg)',
            color: 'var(--admin-text-main)', fontSize: '13px', fontFamily: 'inherit',
          }}
        />
        <button
          onClick={handleSend}
          disabled={sending || !draft.trim()}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0,
            background: 'var(--admin-accent)', color: '#fff', border: 'none', borderRadius: '10px',
            padding: '0 16px', fontSize: '13px', fontWeight: 600,
            cursor: sending || !draft.trim() ? 'not-allowed' : 'pointer',
            opacity: sending || !draft.trim() ? 0.6 : 1,
          }}
        >
          <Send size={14} />
        </button>
      </div>
    </div>
  )
}
