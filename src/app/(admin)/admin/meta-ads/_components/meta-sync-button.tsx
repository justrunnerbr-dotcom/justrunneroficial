'use client'

import { useState } from 'react'
import { RefreshCw } from 'lucide-react'

interface Props {
  lastSync: string | null
  configured: boolean
}

export function MetaSyncButton({ lastSync, configured }: Props) {
  const [loading, setLoading]   = useState(false)
  const [result, setResult]     = useState<{ ok: boolean; count?: number; error?: string } | null>(null)

  if (!configured) return null

  const handleSync = async () => {
    setLoading(true)
    setResult(null)
    try {
      const res  = await fetch('/api/admin/meta-ads/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
      const data = await res.json()
      setResult(data)
      if (data.ok) setTimeout(() => window.location.reload(), 1500)
    } catch {
      setResult({ ok: false, error: 'Erro de rede' })
    } finally {
      setLoading(false)
    }
  }

  const fmtSync = (iso: string | null) => {
    if (!iso) return 'Nunca sincronizado'
    return new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
      <div style={{ fontSize: '11px', color: 'var(--admin-text-muted)' }}>
        {fmtSync(lastSync)}
      </div>
      <button
        onClick={handleSync}
        disabled={loading}
        style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          padding: '8px 16px', borderRadius: '8px',
          border: '1px solid var(--admin-border)',
          background: loading ? 'var(--admin-bg)' : 'var(--admin-card)',
          color: 'var(--admin-text-main)',
          cursor: loading ? 'not-allowed' : 'pointer',
          fontSize: '13px', fontWeight: 500,
          opacity: loading ? 0.7 : 1,
          transition: 'opacity 0.2s',
        }}
      >
        <RefreshCw size={13} />
        {loading ? 'Sincronizando...' : 'Sincronizar agora'}
      </button>
      {result && (
        <div style={{ fontSize: '11px', color: result.ok ? '#16a34a' : '#ef4444', fontWeight: 500 }}>
          {result.ok
            ? `✓ ${result.count ?? 0} registros sincronizados`
            : `✗ ${result.error ?? 'Falha no sync'}`}
        </div>
      )}
    </div>
  )
}
