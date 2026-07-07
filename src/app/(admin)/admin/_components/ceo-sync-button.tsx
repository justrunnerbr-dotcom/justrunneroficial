'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  label?: string
}

export function CeoSyncButton({ label }: Props) {
  const [state, setState] = useState<'idle' | 'syncing' | 'done' | 'error'>('idle')
  const [msg, setMsg] = useState('')
  const router = useRouter()

  async function handleSync() {
    setState('syncing')
    try {
      const res = await fetch('/api/admin/sync/yampi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pages: 10 }),
      })
      const data = await res.json()
      if (data.ok) {
        setMsg(`${data.synced} pedido(s) importados`)
        setState('done')
        setTimeout(() => { router.refresh() }, 500)
      } else {
        setMsg(data.error ?? 'Erro desconhecido')
        setState('error')
      }
    } catch {
      setMsg('Falha na conexão')
      setState('error')
    }
  }

  const btnLabel =
    state === 'syncing' ? '⟳ Sincronizando...' :
    state === 'done'    ? `✓ ${msg}` :
    state === 'error'   ? `✗ ${msg}` :
    (label ?? '↓ Sincronizar Yampi')

  const bgColor =
    state === 'done'  ? '#16a34a' :
    state === 'error' ? '#dc2626' :
    '#0f172a'

  return (
    <button
      onClick={handleSync}
      disabled={state === 'syncing'}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '6px',
        background: bgColor, color: '#fff',
        border: 'none', borderRadius: '8px',
        padding: '8px 16px', fontSize: '13px', fontWeight: 500,
        cursor: state === 'syncing' ? 'not-allowed' : 'pointer',
        opacity: state === 'syncing' ? 0.7 : 1,
      }}
    >
      {btnLabel}
    </button>
  )
}
