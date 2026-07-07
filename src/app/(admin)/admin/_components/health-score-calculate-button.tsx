'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function HealthScoreCalculateButton() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handle() {
    setLoading(true)
    try {
      await fetch('/api/admin/health-score', { method: 'POST' })
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handle}
      disabled={loading}
      style={{
        background: '#0f172a', color: '#fff', border: 'none',
        borderRadius: '8px', padding: '8px 16px', fontSize: '13px',
        fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer',
        opacity: loading ? 0.7 : 1,
      }}
    >
      {loading ? 'Calculando...' : '⚡ Calcular Score'}
    </button>
  )
}
