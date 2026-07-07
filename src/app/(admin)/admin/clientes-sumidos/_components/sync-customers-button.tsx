'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw } from 'lucide-react'

export function SyncCustomersButton({ lastSync }: { lastSync: string | null }) {
  const [loading, setLoading] = useState(false)
  const [result,  setResult]  = useState<string | null>(null)
  const router = useRouter()

  async function handleSync() {
    setLoading(true)
    setResult(null)
    try {
      const res  = await fetch('/api/admin/recovery/sync-customers', { method: 'POST' })
      const data = await res.json() as { ok?: boolean; synced?: number; ordersScanned?: number; error?: string }
      if (!data.ok) { setResult(data.error ?? 'Erro ao sincronizar.'); return }
      setResult(`${data.synced} clientes atualizados (${data.ordersScanned} pedidos analisados)`)
      router.refresh()
    } catch {
      setResult('Erro de conexão.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
      <button
        onClick={handleSync}
        disabled={loading}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          background: 'var(--admin-card)', border: '1px solid var(--admin-border)', borderRadius: '8px',
          padding: '8px 14px', fontSize: '13px', fontWeight: 500,
          color: 'var(--admin-text-sec)', cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.6 : 1,
        }}
      >
        <RefreshCw size={13} style={loading ? { animation: 'spin 1s linear infinite' } : undefined} />
        {loading ? 'Sincronizando (pode levar até 1 min)...' : 'Sincronizar clientes'}
      </button>
      <span style={{ fontSize: '11px', color: 'var(--admin-text-muted)' }}>
        {result ?? (lastSync ? `Última sincronização: ${new Date(lastSync).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' })}` : 'Nunca sincronizado')}
      </span>
      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
