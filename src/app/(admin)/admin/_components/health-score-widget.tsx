'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface PillarData {
  label:  string
  score:  number
  max:    number
  color:  string
}

interface Props {
  score:             number
  revenue_score:     number
  conversion_score:  number
  catalog_score:     number
  acquisition_score: number
  retention_score:   number
  technical_score:   number
  learning_mode:     boolean
  data_days:         number
  insights:          string[]
  calculated_at:     string | null
}

function scoreColor(score: number): string {
  if (score >= 80) return '#16a34a'
  if (score >= 60) return '#ca8a04'
  if (score >= 40) return '#ea580c'
  return '#dc2626'
}

function scoreLabel(score: number): string {
  if (score >= 80) return 'Excelente'
  if (score >= 60) return 'Bom'
  if (score >= 40) return 'Regular'
  return 'Crítico'
}

export function HealthScoreWidget(props: Props) {
  const [recalculating, setRecalculating] = useState(false)
  const router = useRouter()

  const color  = scoreColor(props.score)
  const label  = scoreLabel(props.score)

  const pillars: PillarData[] = [
    { label: 'Receita',      score: props.revenue_score,     max: 30, color: 'var(--admin-accent)' },
    { label: 'Conversão',    score: props.conversion_score,  max: 25, color: '#8b5cf6' },
    { label: 'Catálogo',     score: props.catalog_score,     max: 15, color: '#f59e0b' },
    { label: 'Aquisição',    score: props.acquisition_score, max: 15, color: '#06b6d4' },
    { label: 'Retenção',     score: props.retention_score,   max: 10, color: '#ec4899' },
    { label: 'Técnico',      score: props.technical_score,   max: 5,  color: 'var(--admin-text-muted)' },
  ]

  async function handleRecalc() {
    setRecalculating(true)
    try {
      await fetch('/api/admin/health-score', { method: 'POST' })
      router.refresh()
    } finally {
      setRecalculating(false)
    }
  }

  const calcTime = props.calculated_at
    ? new Date(props.calculated_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <div style={{
      background: 'var(--admin-card)', border: `2px solid ${color}20`,
      borderRadius: '16px', padding: '24px', marginBottom: '24px',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '24px' }}>

        {/* Score ring */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '120px' }}>
          <div style={{
            width: '96px', height: '96px', borderRadius: '50%',
            background: `conic-gradient(${color} ${props.score * 3.6}deg, #f1f5f9 0deg)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            position: 'relative',
          }}>
            <div style={{
              width: '72px', height: '72px', borderRadius: '50%',
              background: 'var(--admin-card)', display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ fontSize: '22px', fontWeight: 800, color, lineHeight: 1 }}>
                {props.score}
              </span>
              <span style={{ fontSize: '10px', color: 'var(--admin-text-muted)', fontWeight: 500 }}>/ 100</span>
            </div>
          </div>
          <div style={{
            marginTop: '8px', fontSize: '13px', fontWeight: 700,
            color, background: `${color}15`, padding: '3px 12px', borderRadius: '99px',
          }}>
            {label}
          </div>
          {props.learning_mode && (
            <div style={{ marginTop: '6px', fontSize: '11px', color: '#ca8a04', textAlign: 'center' }}>
              aprendendo ({props.data_days} dias)
            </div>
          )}
        </div>

        {/* Pillars */}
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--admin-text-main)' }}>
                Store Health Score
              </h2>
              {calcTime && (
                <span style={{ fontSize: '12px', color: 'var(--admin-text-muted)' }}>
                  Calculado às {calcTime}
                </span>
              )}
            </div>
            <button
              onClick={handleRecalc}
              disabled={recalculating}
              style={{
                background: 'none', border: '1px solid var(--admin-border)',
                borderRadius: '6px', padding: '4px 12px', fontSize: '12px',
                color: 'var(--admin-text-muted)', cursor: recalculating ? 'not-allowed' : 'pointer',
                opacity: recalculating ? 0.6 : 1,
              }}
            >
              {recalculating ? 'Calculando...' : '↻ Recalcular'}
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            {pillars.map((p) => {
              const pct = Math.round((p.score / p.max) * 100)
              return (
                <div key={p.label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--admin-text-sec)', fontWeight: 500 }}>{p.label}</span>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: p.color }}>
                      {p.score}<span style={{ fontSize: '10px', color: 'var(--admin-text-muted)' }}>/{p.max}</span>
                    </span>
                  </div>
                  <div style={{ height: '5px', background: 'var(--admin-card-hover)', borderRadius: '99px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', width: `${pct}%`,
                      background: p.color, borderRadius: '99px',
                    }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Insights */}
        {props.insights.length > 0 && (
          <div style={{ minWidth: '240px', maxWidth: '280px' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--admin-text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Diagnóstico
            </div>
            {props.insights.slice(0, 3).map((insight, i) => (
              <div key={i} style={{
                fontSize: '12px', color: 'var(--admin-text-sec)', lineHeight: 1.5,
                padding: '6px 10px', background: '#fef9c3',
                borderLeft: '3px solid #ca8a04', borderRadius: '0 6px 6px 0',
                marginBottom: '6px',
              }}>
                {insight}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
