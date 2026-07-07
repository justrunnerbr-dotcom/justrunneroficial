'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Cpu } from 'lucide-react'

export function RunBrainButton() {
  const router = useRouter()
  const [running, setRunning] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  async function run() {
    setRunning(true)
    setMsg(null)
    try {
      const res  = await fetch('/api/admin/brain/run', { method: 'POST' })
      const data = await res.json() as { ok: boolean; signals?: number; recommendations?: number; message?: string }
      if (data.ok) {
        const n = data.recommendations ?? 0
        setMsg(n > 0 ? `${n} recomendação(ões) gerada(s)` : 'Análise concluída')
        router.refresh()
      } else {
        setMsg('Erro ao executar análise')
      }
    } catch {
      setMsg('Falha na conexão')
    } finally {
      setRunning(false)
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      {msg && (
        <span style={{ fontSize: '13px', color: 'var(--admin-text-muted)' }}>{msg}</span>
      )}
      <button
        onClick={run}
        disabled={running}
        style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          background: running ? 'var(--admin-card-hover)' : '#7c3aed',
          color: running ? 'var(--admin-text-muted)' : '#fff',
          border: '1px solid',
          borderColor: running ? 'var(--admin-border)' : '#7c3aed',
          borderRadius: '10px',
          padding: '9px 18px', fontSize: '13px', fontWeight: 600,
          cursor: running ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s',
        }}
      >
        <Cpu size={15} strokeWidth={2} />
        {running ? 'Analisando…' : 'Executar Brain'}
      </button>
    </div>
  )
}
