'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function CeoRefreshButton() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleRefresh() {
    setLoading(true)
    try {
      await fetch('/api/admin/analytics/refresh', { method: 'POST' })
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleRefresh}
      disabled={loading}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '6px',
        background: 'var(--admin-card)', border: '1px solid var(--admin-border)', borderRadius: '8px',
        padding: '8px 16px', fontSize: '13px', fontWeight: 500,
        color: 'var(--admin-text-sec)', cursor: loading ? 'not-allowed' : 'pointer',
        opacity: loading ? 0.6 : 1,
      }}
    >
      {loading ? '⟳ Atualizando...' : '⟳ Atualizar Dados'}
    </button>
  )
}
