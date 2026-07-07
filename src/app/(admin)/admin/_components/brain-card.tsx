'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const SIGNAL_LABEL: Record<string, string> = {
  conversion_drop: 'Conversão',
  revenue_drop:    'Receita',
  traffic_drop:    'Tráfego',
}

const PRIORITY_CONFIG = {
  urgent: { label: 'Urgente',  bg: '#fef2f2', border: '#fca5a5', badge: '#dc2626', text: '#991b1b' },
  high:   { label: 'Alta',     bg: '#fff7ed', border: '#fdba74', badge: '#ea580c', text: '#9a3412' },
  medium: { label: 'Média',    bg: '#fefce8', border: '#fde047', badge: '#ca8a04', text: '#854d0e' },
  low:    { label: 'Baixa',    bg: '#f0fdf4', border: '#86efac', badge: '#16a34a', text: '#14532d' },
} as const

const SEVERITY_DOT: Record<string, string> = {
  critical: '#dc2626',
  high:     '#ea580c',
  medium:   '#ca8a04',
  low:      '#16a34a',
}

interface Signal {
  signal_type:    string
  severity:       string
  metric_name:    string
  current_value:  number
  baseline_value: number
  delta_pct:      number
  detected_at:    string
}

export interface RecommendationCardData {
  id:         string
  title:      string
  hypothesis: string
  action:     string
  priority:   string
  status:     string
  model_used: string
  created_at: string
  signal:     Signal | null
}

function fmtDelta(pct: number): string {
  return `${pct > 0 ? '+' : ''}${pct.toFixed(1)}%`
}

function fmtMetric(name: string, value: number): string {
  if (name === 'conversion_rate') return `${(value * 100).toFixed(2)}%`
  if (name === 'daily_revenue')   return `R$ ${value.toFixed(2)}`
  return value.toFixed(0)
}

export function RecommendationCard({ rec }: { rec: RecommendationCardData }) {
  const [status, setStatus] = useState<'idle' | 'loading'>('idle')
  const [dismissed, setDismissed]   = useState(false)
  const [acknowledged, setAcknowledged] = useState(rec.status === 'acknowledged')
  const router = useRouter()

  const priority = (rec.priority ?? 'medium') as keyof typeof PRIORITY_CONFIG
  const cfg = PRIORITY_CONFIG[priority] ?? PRIORITY_CONFIG.medium

  async function updateStatus(newStatus: string) {
    setStatus('loading')
    try {
      await fetch(`/api/admin/brain/recommendations/${rec.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (newStatus === 'dismissed') setDismissed(true)
      if (newStatus === 'acknowledged') setAcknowledged(true)
      if (newStatus === 'resolved') { setDismissed(true); router.refresh() }
    } finally {
      setStatus('idle')
    }
  }

  if (dismissed) return null

  const sig = rec.signal
  const isAI = rec.model_used && !rec.model_used.startsWith('fallback')

  return (
    <div style={{
      background: cfg.bg,
      border: `1px solid ${cfg.border}`,
      borderRadius: '16px',
      padding: '20px 24px',
      position: 'relative',
    }}>

      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* Priority badge */}
          <span style={{
            fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em',
            background: cfg.badge, color: '#fff',
            padding: '3px 8px', borderRadius: '99px',
          }}>
            {cfg.label.toUpperCase()}
          </span>

          {/* Signal type */}
          {sig && (
            <span style={{ fontSize: '12px', color: cfg.text, fontWeight: 500 }}>
              <span style={{
                display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%',
                background: SEVERITY_DOT[sig.severity] ?? '#64748b', marginRight: '4px',
              }} />
              {SIGNAL_LABEL[sig.signal_type] ?? sig.signal_type}
              {' '}
              <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>
                {fmtDelta(sig.delta_pct)}
              </span>
            </span>
          )}

          {/* AI badge */}
          {isAI && (
            <span style={{
              fontSize: '10px', color: '#7c3aed', background: '#f5f3ff',
              padding: '2px 6px', borderRadius: '99px', fontWeight: 600,
            }}>
              ⚡ Commerce Brain
            </span>
          )}
        </div>

        {/* Dismiss */}
        <button
          onClick={() => updateStatus('dismissed')}
          disabled={status === 'loading'}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--admin-text-muted)', fontSize: '16px', padding: '0', lineHeight: 1,
            flexShrink: 0,
          }}
          title="Dispensar"
        >
          ×
        </button>
      </div>

      {/* Title */}
      <h3 style={{ margin: '0 0 8px', fontSize: '15px', fontWeight: 700, color: cfg.text }}>
        {rec.title}
      </h3>

      {/* Hypothesis */}
      <p style={{ margin: '0 0 10px', fontSize: '13px', color: 'var(--admin-text-sec)', lineHeight: 1.6 }}>
        {rec.hypothesis}
      </p>

      {/* Action */}
      <div style={{
        fontSize: '13px', fontWeight: 600, color: cfg.text,
        background: `${cfg.border}40`, padding: '8px 12px',
        borderRadius: '8px', borderLeft: `3px solid ${cfg.badge}`,
        marginBottom: '14px',
      }}>
        ➜ {rec.action}
      </div>

      {/* Signal data */}
      {sig && (
        <div style={{
          display: 'flex', gap: '16px', fontSize: '12px', color: 'var(--admin-text-muted)',
          marginBottom: '14px', flexWrap: 'wrap',
        }}>
          <span>
            Atual: <strong style={{ color: 'var(--admin-text-main)' }}>{fmtMetric(sig.metric_name, sig.current_value)}</strong>
          </span>
          <span>
            Base: <strong style={{ color: 'var(--admin-text-main)' }}>{fmtMetric(sig.metric_name, sig.baseline_value)}</strong>
          </span>
          <span>
            Detectado: <strong style={{ color: 'var(--admin-text-main)' }}>
              {new Date(sig.detected_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </strong>
          </span>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {!acknowledged && (
          <button
            onClick={() => updateStatus('acknowledged')}
            disabled={status === 'loading'}
            style={{
              background: '#0f172a', color: '#fff', border: 'none',
              borderRadius: '6px', padding: '6px 14px', fontSize: '12px',
              fontWeight: 600, cursor: status === 'loading' ? 'not-allowed' : 'pointer',
              opacity: status === 'loading' ? 0.7 : 1,
            }}
          >
            Vou investigar
          </button>
        )}
        {acknowledged && (
          <span style={{ fontSize: '12px', color: '#16a34a', fontWeight: 600 }}>
            ✓ Em investigação
          </span>
        )}
        <button
          onClick={() => updateStatus('resolved')}
          disabled={status === 'loading'}
          style={{
            background: 'none', color: 'var(--admin-text-muted)', border: '1px solid var(--admin-border)',
            borderRadius: '6px', padding: '6px 14px', fontSize: '12px',
            fontWeight: 500, cursor: status === 'loading' ? 'not-allowed' : 'pointer',
          }}
        >
          Resolvido
        </button>
      </div>
    </div>
  )
}
