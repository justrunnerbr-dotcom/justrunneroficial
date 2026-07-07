'use client'

import { useState, useEffect, useRef } from 'react'
import { Settings, Plus, X, GripVertical } from 'lucide-react'

// ── Metric registry ───────────────────────────────────────────────────────────

type MetricFmt = 'brl' | 'int' | 'pct' | 'dec' | 'brl2'

export interface MetricValues {
  spend:            number
  impressions:      number
  reach:            number
  frequency:        number
  clicks:           number
  inlineLinkClicks: number
  uniqueClicks:     number
  ctr:              number
  uniqueCtr:        number
  cpm:              number
  cpc:              number
  uniqueCpc:        number
  results:          number
  costPerResult:    number
  videoPlays:       number
  videoThruPlays:   number
  costPerThruPlay:  number
  engagements:      number
  dailyAvg:         number
  activeCampaigns:  number
}

interface MetricDef {
  key:   keyof MetricValues
  label: string
  fmt:   MetricFmt
  group: string
}

const ALL_METRICS: MetricDef[] = [
  // Gasto
  { key: 'spend',            label: 'Gasto total',       fmt: 'brl',  group: 'Gasto' },
  { key: 'dailyAvg',         label: 'Média por dia',     fmt: 'brl',  group: 'Gasto' },
  // Alcance
  { key: 'impressions',      label: 'Impressões',        fmt: 'int',  group: 'Alcance' },
  { key: 'reach',            label: 'Alcance único',     fmt: 'int',  group: 'Alcance' },
  { key: 'frequency',        label: 'Frequência',        fmt: 'dec',  group: 'Alcance' },
  // Cliques
  { key: 'clicks',           label: 'Cliques totais',    fmt: 'int',  group: 'Cliques' },
  { key: 'inlineLinkClicks', label: 'Link Clicks',       fmt: 'int',  group: 'Cliques' },
  { key: 'uniqueClicks',     label: 'Cliques únicos',    fmt: 'int',  group: 'Cliques' },
  { key: 'ctr',              label: 'CTR total',         fmt: 'pct',  group: 'Cliques' },
  { key: 'uniqueCtr',        label: 'CTR único',         fmt: 'pct',  group: 'Cliques' },
  // Custo
  { key: 'cpm',              label: 'CPM',               fmt: 'brl',  group: 'Custo' },
  { key: 'cpc',              label: 'CPC total',         fmt: 'brl',  group: 'Custo' },
  { key: 'uniqueCpc',        label: 'CPC único',         fmt: 'brl',  group: 'Custo' },
  // Conversões
  { key: 'results',          label: 'Conversões (pixel)',fmt: 'int',  group: 'Conversões' },
  { key: 'costPerResult',    label: 'Custo/Conversão',  fmt: 'brl',  group: 'Conversões' },
  // Vídeo
  { key: 'videoPlays',       label: 'Video Plays',       fmt: 'int',  group: 'Vídeo' },
  { key: 'videoThruPlays',   label: 'ThruPlays',         fmt: 'int',  group: 'Vídeo' },
  { key: 'costPerThruPlay',  label: 'Custo/ThruPlay',    fmt: 'brl',  group: 'Vídeo' },
  // Engajamento
  { key: 'engagements',      label: 'Engajamentos',      fmt: 'int',  group: 'Engajamento' },
  // Campanhas
  { key: 'activeCampaigns',  label: 'Campanhas ativas',  fmt: 'int',  group: 'Campanhas' },
]

const DEFAULT_KEYS: (keyof MetricValues)[] = [
  'spend', 'impressions', 'reach', 'clicks', 'inlineLinkClicks', 'ctr', 'cpm', 'cpc', 'results', 'costPerResult',
]

const LS_KEY = 'jhf_meta_account_metrics'

// ── Formatters ────────────────────────────────────────────────────────────────

const fmtBrl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtInt = (n: number) => n.toLocaleString('pt-BR')
const fmtPct = (n: number) => n > 0 ? `${n.toFixed(2)}%` : '—'
const fmtDec = (n: number) => n > 0 ? n.toFixed(2) : '—'

function formatValue(v: number, fmt: MetricFmt): string {
  if (v === 0) return '—'
  switch (fmt) {
    case 'brl':  return fmtBrl.format(v)
    case 'brl2': return fmtBrl.format(v)
    case 'int':  return fmtInt(v)
    case 'pct':  return fmtPct(v)
    case 'dec':  return fmtDec(v)
  }
}

function cpmColor(key: keyof MetricValues, v: number): string | undefined {
  if (key === 'cpm' && v > 0) return v < 15 ? '#16a34a' : v < 25 ? '#f59e0b' : '#ef4444'
  if (key === 'frequency') return v >= 3.5 ? '#ef4444' : v >= 2.5 ? '#f59e0b' : undefined
  return undefined
}

// ── Main component ────────────────────────────────────────────────────────────

export function MetricsCustomizer({ values }: { values: MetricValues }) {
  const [selectedKeys, setSelectedKeys] = useState<(keyof MetricValues)[]>(() => {
    if (typeof window === 'undefined') return DEFAULT_KEYS
    try {
      const saved = localStorage.getItem(LS_KEY)
      if (saved) {
        const parsed = JSON.parse(saved) as (keyof MetricValues)[]
        if (Array.isArray(parsed) && parsed.length > 0) return parsed
      }
    } catch { /* ignore */ }
    return DEFAULT_KEYS
  })
  const [open, setOpen]                 = useState(false)
  const panelRef                        = useRef<HTMLDivElement>(null)

  // Close panel on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  function save(keys: (keyof MetricValues)[]) {
    setSelectedKeys(keys)
    try { localStorage.setItem(LS_KEY, JSON.stringify(keys)) } catch { /* ignore */ }
  }

  function toggleMetric(key: keyof MetricValues) {
    const next = selectedKeys.includes(key)
      ? selectedKeys.filter(k => k !== key)
      : [...selectedKeys, key]
    save(next)
  }

  function remove(key: keyof MetricValues) {
    save(selectedKeys.filter(k => k !== key))
  }

  const selected = selectedKeys
    .map(k => ALL_METRICS.find(m => m.key === k))
    .filter(Boolean) as MetricDef[]

  const groups = [...new Set(ALL_METRICS.map(m => m.group))]

  return (
    <div style={{ marginBottom: '20px' }}>
      {/* Metric cards */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'stretch' }}>
        {selected.map(metric => {
          const v     = values[metric.key] ?? 0
          const color = cpmColor(metric.key, v)
          return (
            <div
              key={metric.key}
              style={{ background: 'var(--admin-card)', border: '1px solid var(--admin-border)', borderRadius: '10px', padding: '12px 14px', minWidth: '120px', flex: '1 1 120px', maxWidth: '180px', position: 'relative' }}
            >
              <button
                onClick={() => remove(metric.key)}
                aria-label={`Remover ${metric.label}`}
                style={{ position: 'absolute', top: '4px', right: '4px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--admin-text-muted)', opacity: 0, transition: 'opacity 0.15s', padding: '2px' }}
                className="metric-remove-btn"
              >
                <X size={11} />
              </button>
              <div style={{ fontSize: '9px', fontWeight: 700, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '5px' }}>{metric.label}</div>
              <div style={{ fontSize: '17px', fontWeight: 700, color: color ?? 'var(--admin-text-main)', fontFamily: 'monospace', lineHeight: 1 }}>{formatValue(v, metric.fmt)}</div>
            </div>
          )
        })}

        {/* Add button */}
        <div style={{ position: 'relative' }} ref={panelRef}>
          <button
            onClick={() => setOpen(o => !o)}
            style={{ background: 'var(--admin-bg)', border: '1px dashed var(--admin-border)', borderRadius: '10px', padding: '12px 16px', minWidth: '80px', height: '100%', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', color: 'var(--admin-text-muted)', transition: 'border-color 0.15s, color 0.15s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--admin-accent)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--admin-accent)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--admin-border)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--admin-text-muted)' }}
          >
            <Plus size={16} />
            <span style={{ fontSize: '10px', fontWeight: 600 }}>Adicionar</span>
          </button>

          {/* Metrics panel */}
          {open && (
            <div style={{ position: 'absolute', top: 'calc(100% + 8px)', left: 0, zIndex: 50, background: 'var(--admin-card)', border: '1px solid var(--admin-border)', borderRadius: '14px', padding: '16px', width: '320px', boxShadow: '0 12px 40px rgba(0,0,0,0.35)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Settings size={13} color="var(--admin-accent)" />
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--admin-text-main)' }}>Métricas personalizadas</span>
                </div>
                <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--admin-text-muted)' }}>
                  <X size={14} />
                </button>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--admin-text-muted)', marginBottom: '14px' }}>
                Selecione as métricas que quer ver. Salvo automaticamente.
              </div>

              {groups.map(group => {
                const groupMetrics = ALL_METRICS.filter(m => m.group === group)
                return (
                  <div key={group} style={{ marginBottom: '14px' }}>
                    <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>{group}</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {groupMetrics.map(m => {
                        const active = selectedKeys.includes(m.key)
                        const v      = values[m.key] ?? 0
                        return (
                          <button
                            key={m.key}
                            onClick={() => toggleMetric(m.key)}
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '8px 10px', border: `1px solid ${active ? 'var(--admin-accent)' : 'var(--admin-border)'}`, borderRadius: '8px', background: active ? 'rgba(var(--admin-accent-rgb),0.08)' : 'var(--admin-bg)', cursor: 'pointer', transition: 'all 0.12s' }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{ width: '12px', height: '12px', borderRadius: '3px', border: `2px solid ${active ? 'var(--admin-accent)' : 'var(--admin-border)'}`, background: active ? 'var(--admin-accent)' : 'transparent', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {active && <div style={{ width: '6px', height: '6px', background: '#fff', borderRadius: '1px' }} />}
                              </div>
                              <span style={{ fontSize: '12px', fontWeight: active ? 600 : 400, color: active ? 'var(--admin-text-main)' : 'var(--admin-text-sec)' }}>{m.label}</span>
                            </div>
                            <span style={{ fontSize: '12px', fontFamily: 'monospace', color: 'var(--admin-text-muted)' }}>{formatValue(v, m.fmt)}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}

              <div style={{ display: 'flex', gap: '8px', marginTop: '8px', paddingTop: '12px', borderTop: '1px solid var(--admin-border)' }}>
                <button onClick={() => save(DEFAULT_KEYS)} style={{ flex: 1, padding: '7px', border: '1px solid var(--admin-border)', borderRadius: '7px', background: 'var(--admin-bg)', cursor: 'pointer', fontSize: '11px', color: 'var(--admin-text-muted)' }}>
                  Restaurar padrão
                </button>
                <button onClick={() => save(ALL_METRICS.map(m => m.key))} style={{ flex: 1, padding: '7px', border: '1px solid var(--admin-border)', borderRadius: '7px', background: 'var(--admin-bg)', cursor: 'pointer', fontSize: '11px', color: 'var(--admin-text-muted)' }}>
                  Mostrar todas
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .metric-remove-btn { display: none !important; }
        div[style*="position: relative"]:hover .metric-remove-btn { display: flex !important; opacity: 1 !important; }
      `}</style>
    </div>
  )
}
