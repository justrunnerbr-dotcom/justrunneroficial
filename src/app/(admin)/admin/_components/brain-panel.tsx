'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RecommendationCard, type RecommendationCardData } from './brain-card'

interface Props {
  recommendations: RecommendationCardData[]
}

export function BrainPanel({ recommendations }: Props) {
  const [running, setRunning] = useState(false)
  const [result, setResult]   = useState<string | null>(null)
  const router = useRouter()

  async function runBrain() {
    setRunning(true)
    setResult(null)
    try {
      const res  = await fetch('/api/admin/brain/run', { method: 'POST' })
      const data = await res.json()
      if (data.ok) {
        setResult(
          data.signals === 0
            ? '✓ Nenhuma anomalia detectada. Loja operando normalmente.'
            : `⚡ ${data.recommendations} recomendação(ões) gerada(s).`,
        )
        router.refresh()
      } else {
        setResult('Erro ao executar análise.')
      }
    } catch {
      setResult('Falha na conexão.')
    } finally {
      setRunning(false)
    }
  }

  const hasRecs = recommendations.length > 0

  return (
    <div style={{ marginBottom: '24px' }}>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: hasRecs ? '16px' : '0',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--admin-text-main)' }}>
            Commerce Brain
          </h2>
          {hasRecs && (
            <span style={{
              fontSize: '12px', fontWeight: 700, background: '#dc2626', color: '#fff',
              padding: '2px 8px', borderRadius: '99px',
            }}>
              {recommendations.length}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {result && (
            <span style={{ fontSize: '13px', color: 'var(--admin-text-muted)' }}>{result}</span>
          )}
          <button
            onClick={runBrain}
            disabled={running}
            style={{
              background: running ? '#475569' : '#7c3aed',
              color: '#fff', border: 'none', borderRadius: '8px',
              padding: '8px 16px', fontSize: '13px', fontWeight: 600,
              cursor: running ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: '6px',
            }}
          >
            {running ? '⟳ Analisando...' : '⚡ Executar Brain'}
          </button>
        </div>
      </div>

      {/* No recs */}
      {!hasRecs && (
        <div style={{
          background: 'var(--admin-bg)', border: '1px dashed #cbd5e1',
          borderRadius: '12px', padding: '20px 24px',
          fontSize: '14px', color: 'var(--admin-text-muted)',
        }}>
          Nenhuma anomalia ativa. Clique em &quot;Executar Brain&quot; para analisar os dados da loja.
        </div>
      )}

      {/* Cards */}
      {hasRecs && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {recommendations.map((rec) => (
            <RecommendationCard key={rec.id} rec={rec} />
          ))}
        </div>
      )}
    </div>
  )
}
