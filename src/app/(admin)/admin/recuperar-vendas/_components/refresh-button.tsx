'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw } from 'lucide-react'

export function RefreshButton() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  function handleRefresh() {
    setLoading(true)
    router.refresh()
    setTimeout(() => setLoading(false), 600)
  }

  return (
    <button
      onClick={handleRefresh}
      disabled={loading}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '6px',
        background: 'var(--admin-card)', border: '1px solid var(--admin-border)', borderRadius: '8px',
        padding: '8px 14px', fontSize: '13px', fontWeight: 500,
        color: 'var(--admin-text-sec)', cursor: loading ? 'not-allowed' : 'pointer',
        opacity: loading ? 0.6 : 1,
      }}
    >
      <RefreshCw size={13} style={loading ? { animation: 'spin 0.6s linear infinite' } : undefined} />
      {loading ? 'Atualizando...' : 'Atualizar'}
      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </button>
  )
}
