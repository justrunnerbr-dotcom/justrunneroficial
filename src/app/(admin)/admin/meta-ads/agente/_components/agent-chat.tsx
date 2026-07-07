'use client'

import { useEffect, useRef, useState } from 'react'
import { Bot, Loader2, Send, User } from 'lucide-react'

interface ChatImage {
  url:   string
  label: string
}

interface ChatMessage {
  role:    'user' | 'assistant'
  content: string
  images?: ChatImage[]
}

export function AgentChat() {
  const [messages,  setMessages]  = useState<ChatMessage[]>([])
  const [input,     setInput]     = useState('')
  const [loading,   setLoading]   = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [error,     setError]     = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/admin/meta-ads/agent')
      .then(res => res.json())
      .then((data: { messages?: ChatMessage[] }) => setMessages(data.messages ?? []))
      .catch(() => setError('Não foi possível carregar o histórico.'))
      .finally(() => setLoadingHistory(false))
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function send() {
    const text = input.trim()
    if (!text || loading) return

    setInput('')
    setError(null)
    setMessages(prev => [...prev, { role: 'user', content: text }])
    setLoading(true)

    try {
      const res  = await fetch('/api/admin/meta-ads/agent', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ message: text }),
      })
      const data = await res.json() as { reply?: string; error?: string; viewedImages?: ChatImage[] }
      if (data.error) { setError(data.error); return }
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply ?? '', images: data.viewedImages }])
    } catch {
      setError('Erro de conexão. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <div style={{ background: 'var(--admin-card)', border: '1px solid var(--admin-border)', borderRadius: '16px', display: 'flex', flexDirection: 'column', height: '70vh', minHeight: '480px' }}>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {loadingHistory && (
          <div style={{ textAlign: 'center', padding: '32px' }}>
            <Loader2 size={20} color="var(--admin-accent)" style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        )}

        {!loadingHistory && messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <Bot size={28} color="var(--admin-text-muted)" style={{ marginBottom: '12px' }} />
            <div style={{ fontSize: '13px', color: 'var(--admin-text-muted)', lineHeight: 1.6, maxWidth: '360px', margin: '0 auto' }}>
              Pergunte sobre campanhas, conjuntos ou criativos de qualquer conta — ex: &quot;quais campanhas da Conta 4 estão gastando mais essa semana?&quot;. Ele vai aprendendo sua estratégia conforme você for ensinando.
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', gap: '10px', flexDirection: m.role === 'user' ? 'row-reverse' : 'row' }}>
            <div style={{
              width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
              background: m.role === 'user' ? 'var(--admin-accent)' : 'var(--admin-card-hover)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {m.role === 'user' ? <User size={14} color="#fff" /> : <Bot size={14} color="var(--admin-text-muted)" />}
            </div>
            <div style={{
              maxWidth: '75%', padding: '10px 14px', borderRadius: '12px',
              background: m.role === 'user' ? 'var(--admin-accent)' : 'var(--admin-bg)',
              color: m.role === 'user' ? '#fff' : 'var(--admin-text-sec)',
              fontSize: '13px', lineHeight: 1.6, whiteSpace: 'pre-wrap',
            }}>
              {m.images && m.images.length > 0 && (
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
                  {m.images.map((img, idx) => (
                    <div key={idx} style={{ width: '120px' }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img.url}
                        alt={img.label}
                        style={{ width: '120px', height: '120px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--admin-border)', display: 'block' }}
                      />
                      <div style={{ fontSize: '10px', color: 'var(--admin-text-muted)', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={img.label}>
                        {img.label}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {m.content}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', gap: '10px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--admin-card-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Bot size={14} color="var(--admin-text-muted)" />
            </div>
            <div style={{ padding: '10px 14px', borderRadius: '12px', background: 'var(--admin-bg)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Loader2 size={13} color="var(--admin-text-muted)" style={{ animation: 'spin 1s linear infinite' }} />
              <span style={{ fontSize: '12px', color: 'var(--admin-text-muted)' }}>analisando...</span>
            </div>
          </div>
        )}

        {error && (
          <div style={{ padding: '12px 14px', background: 'rgba(239,68,68,0.06)', borderRadius: '10px', border: '1px solid rgba(239,68,68,0.2)', fontSize: '12px', color: '#ef4444' }}>
            {error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ borderTop: '1px solid var(--admin-border)', padding: '14px 16px', display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Pergunte ou ensine algo sobre sua estratégia..."
          rows={1}
          style={{
            flex: 1, resize: 'none', background: 'var(--admin-bg)', border: '1px solid var(--admin-border)',
            borderRadius: '10px', padding: '10px 12px', fontSize: '13px', color: 'var(--admin-text-main)',
            fontFamily: 'inherit', maxHeight: '120px',
          }}
        />
        <button
          onClick={send}
          disabled={loading || !input.trim()}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: '38px', height: '38px', borderRadius: '10px', flexShrink: 0,
            background: (loading || !input.trim()) ? 'var(--admin-bg)' : 'var(--admin-accent)',
            color: (loading || !input.trim()) ? 'var(--admin-text-muted)' : '#fff',
            border: 'none', cursor: (loading || !input.trim()) ? 'not-allowed' : 'pointer',
          }}
        >
          <Send size={16} />
        </button>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
