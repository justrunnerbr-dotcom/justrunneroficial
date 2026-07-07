'use client'

import { useState } from 'react'
import { Zap, Loader2, ChevronDown, ChevronUp } from 'lucide-react'

interface MetricsInput {
  spend:         number
  impressions:   number
  clicks:        number
  reach:         number
  ctr:           number
  cpm:           number
  cpc:           number
  frequency:     number
  results:       number
  costPerResult: number
}

interface Props {
  level:       'account' | 'campaign' | 'adset' | 'ad'
  entityName:  string
  metrics:     MetricsInput
  since:       string
  until:       string
  accountId?:  string
}

function renderAnalysis(text: string) {
  return text.split('\n').map((line, i) => {
    const bold = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    if (line.startsWith('##') || line.startsWith('**1.') || line.startsWith('**2.') || line.startsWith('**3.') || line.startsWith('**4.') || line.startsWith('**5.')) {
      return <div key={i} style={{ fontWeight: 700, fontSize: '13px', color: 'var(--admin-text-main)', marginTop: '16px', marginBottom: '4px' }} dangerouslySetInnerHTML={{ __html: bold }} />
    }
    if (line.startsWith('-') || line.startsWith('•')) {
      return <div key={i} style={{ paddingLeft: '16px', fontSize: '13px', color: 'var(--admin-text-sec)', lineHeight: 1.6, marginBottom: '2px' }} dangerouslySetInnerHTML={{ __html: bold }} />
    }
    if (!line.trim()) return <div key={i} style={{ height: '6px' }} />
    return <div key={i} style={{ fontSize: '13px', color: 'var(--admin-text-sec)', lineHeight: 1.6 }} dangerouslySetInnerHTML={{ __html: bold }} />
  })
}

export function AiAnalysisPanel({ level, entityName, metrics, since, until, accountId }: Props) {
  const [loading,     setLoading]     = useState(false)
  const [analysis,    setAnalysis]    = useState<string | null>(null)
  const [error,       setError]       = useState<string | null>(null)
  const [generatedAt, setGeneratedAt] = useState<string | null>(null)
  const [collapsed,   setCollapsed]   = useState(false)

  const levelLabels: Record<string, string> = {
    account: 'Conta', campaign: 'Campanha', adset: 'Conjunto', ad: 'Criativo',
  }

  async function run() {
    setLoading(true)
    setError(null)
    setAnalysis(null)
    setCollapsed(false)
    try {
      const res = await fetch('/api/admin/meta-analysis', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ level, entityName, metrics, since, until, accountId }),
      })
      const data = await res.json() as { analysis?: string; error?: string; generatedAt?: string }
      if (data.error) { setError(data.error); return }
      setAnalysis(data.analysis ?? null)
      setGeneratedAt(data.generatedAt ?? null)
    } catch {
      setError('Erro de conexão. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ background: 'var(--admin-card)', border: '1px solid var(--admin-border)', borderRadius: '16px', overflow: 'hidden', marginTop: '24px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: analysis ? '1px solid var(--admin-border)' : 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Zap size={16} color="var(--admin-accent)" />
          <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--admin-text-main)' }}>Análise IA</span>
          <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--admin-text-muted)', background: 'var(--admin-bg)', padding: '2px 8px', borderRadius: '20px', border: '1px solid var(--admin-border)' }}>
            Claude Haiku · {levelLabels[level]}
          </span>
          {generatedAt && (
            <span style={{ fontSize: '10px', color: 'var(--admin-text-muted)' }}>
              gerado às {new Date(generatedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {analysis && (
            <button
              onClick={() => setCollapsed(c => !c)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--admin-text-muted)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}
            >
              {collapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
              {collapsed ? 'expandir' : 'recolher'}
            </button>
          )}
          <button
            onClick={run}
            disabled={loading}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              background: loading ? 'var(--admin-bg)' : 'var(--admin-accent)',
              color: loading ? 'var(--admin-text-muted)' : '#fff',
              border: 'none', borderRadius: '8px', padding: '7px 14px',
              fontSize: '13px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'opacity 0.15s',
            }}
          >
            {loading
              ? <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Analisando...</>
              : <><Zap size={13} /> {analysis ? 'Reanalisar' : 'Analisar com IA'}</>
            }
          </button>
        </div>
      </div>

      {/* Content */}
      {!analysis && !loading && !error && (
        <div style={{ padding: '24px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: '13px', color: 'var(--admin-text-muted)', lineHeight: 1.6 }}>
            Clique em <strong style={{ color: 'var(--admin-text-sec)' }}>Analisar com IA</strong> para receber diagnóstico, problemas críticos,
            otimizações para hoje e oportunidades de escala com base nas métricas e no funil de vendas real.
          </div>
        </div>
      )}

      {loading && (
        <div style={{ padding: '32px 20px', textAlign: 'center' }}>
          <Loader2 size={24} color="var(--admin-accent)" style={{ animation: 'spin 1s linear infinite', margin: '0 auto 12px', display: 'block' }} />
          <div style={{ fontSize: '13px', color: 'var(--admin-text-muted)' }}>
            Consultando métricas Meta + funil de vendas real...
          </div>
        </div>
      )}

      {error && (
        <div style={{ padding: '20px', background: 'rgba(239,68,68,0.06)', margin: '16px 20px', borderRadius: '10px', border: '1px solid rgba(239,68,68,0.2)' }}>
          <div style={{ fontSize: '13px', color: '#ef4444', fontWeight: 600 }}>Erro ao gerar análise</div>
          <div style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px', opacity: 0.8 }}>{error}</div>
        </div>
      )}

      {analysis && !collapsed && (
        <div style={{ padding: '20px', maxHeight: '600px', overflowY: 'auto' }}>
          <div style={{ background: 'var(--admin-bg)', borderRadius: '12px', padding: '20px', lineHeight: 1.7 }}>
            {renderAnalysis(analysis)}
          </div>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
