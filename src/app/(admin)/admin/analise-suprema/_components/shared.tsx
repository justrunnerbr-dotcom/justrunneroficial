'use client'

import { Fragment } from 'react'
import type { TrendingUp } from 'lucide-react'

/*
 * Primitivas visuais da Análise Suprema.
 *
 * Toda tela da aba consome estes componentes, então é aqui que a linguagem
 * visual vive — mudar um valor daqui muda o painel inteiro, e é por isso que
 * nenhuma tela deve redefinir card, badge ou tabela por conta própria.
 *
 * Todas as medidas saem das escalas de `admin.css` (--sp-*, --fs-*, --r-*).
 * Não existe mais 11.5px nem raio de 18px: os degraus intermediários eram
 * exatamente o que fazia a interface parecer desalinhada sem motivo visível.
 *
 * Direção: acompanha o tema do admin. Densidade legível, borda discreta em vez de
 * sombra pesada, um único acento de cor, número sempre com mais peso que o
 * rótulo que o descreve.
 */

export const fmtBrl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export function Card({ title, desc, children, action, span }: {
  title: string
  desc?: string
  children: React.ReactNode
  action?: React.ReactNode
  span?: boolean
}) {
  return (
    <section className={span ? "as-card-span" : undefined} style={{
      minWidth: 0,
      background: 'var(--admin-card)',
      border: '1px solid var(--admin-border)',
      borderRadius: 'var(--r-lg)',
      padding: 'var(--sp-4)',
      boxShadow: 'var(--sh-sm)',
      ...(span ? { gridColumn: 'span 2' } : {}),
    }}>
      <header className="as-card-head" style={{
        display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
        gap: 'var(--sp-3)', marginBottom: desc ? 'var(--sp-1)' : 'var(--sp-4)',
      }}>
        <h3 style={{
          fontSize: 'var(--fs-md)', fontWeight: 600, letterSpacing: '-0.01em',
          color: 'var(--admin-text-main)', margin: 0, lineHeight: 'var(--lh-tight)',
        }}>{title}</h3>
        {action && <div className="as-card-action">{action}</div>}
      </header>
      {desc && (
        <p style={{
          fontSize: 'var(--fs-sm)', color: 'var(--admin-text-sec)',
          lineHeight: 'var(--lh-normal)', margin: '0 0 var(--sp-4)', maxWidth: '68ch',
        }}>{desc}</p>
      )}
      {children}
    </section>
  )
}

export function DeltaBadge({ status, pct }: { status: 'acima' | 'media' | 'abaixo'; pct: number }) {
  const cfg = {
    acima:  { bg: 'var(--admin-green-soft)', fg: 'var(--admin-green)',      arrow: '↑' },
    media:  { bg: 'var(--admin-card-hover)', fg: 'var(--admin-text-muted)', arrow: '→' },
    abaixo: { bg: 'var(--admin-red-soft)',   fg: 'var(--admin-red)',        arrow: '↓' },
  }[status]
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 'var(--sp-1)',
      fontSize: 'var(--fs-xs)', fontWeight: 600, fontVariantNumeric: 'tabular-nums',
      color: cfg.fg, background: cfg.bg, borderRadius: '999px',
      padding: '3px var(--sp-2)', whiteSpace: 'nowrap',
    }}>
      {cfg.arrow} {pct === 0 ? '—' : `${Math.abs(pct)}%`}
    </span>
  )
}

/** Aviso de bloco — o tom carrega o significado, sem depender de ler o texto. */
export function Callout({ tone = 'info', children }: {
  tone?: 'info' | 'ok' | 'warn' | 'danger'
  children: React.ReactNode
}) {
  const cfg = {
    info:   { bg: 'var(--admin-info-soft)',   fg: 'var(--admin-info)' },
    ok:     { bg: 'var(--admin-green-soft)',  fg: 'var(--admin-green)' },
    warn:   { bg: 'var(--admin-alert-soft)',  fg: 'var(--admin-alert)' },
    danger: { bg: 'var(--admin-red-soft)',    fg: 'var(--admin-red)' },
  }[tone]
  return (
    <div style={{
      background: cfg.bg,
      borderRadius: 'var(--r-md)',
      borderLeft: `3px solid ${cfg.fg}`,
      padding: 'var(--sp-3) var(--sp-4)',
      fontSize: 'var(--fs-sm)',
      color: 'var(--admin-text-sec)',
      lineHeight: 'var(--lh-normal)',
    }}>
      {children}
    </div>
  )
}

export function NotConfiguredBanner() {
  return (
    <div style={{ marginBottom: 'var(--sp-5)' }}>
      <Callout tone="warn">
        <strong style={{ color: 'var(--admin-alert)' }}>Meta Ads indisponível neste ambiente.</strong>{' '}
        As métricas de campanha aparecem quando a conexão estiver disponível. O calendário mantém a referência histórica.
      </Callout>
    </div>
  )
}

export function MiniStat({ label, value, sub, color, emphasis }: {
  label: string; value: string; sub: string; color: string; emphasis?: boolean
}) {
  return (
    <div style={{
      minWidth: 0,
      background: 'var(--admin-card)',
      border: '1px solid var(--admin-border)',
      borderRadius: 'var(--r-lg)',
      padding: 'var(--sp-4)',
      boxShadow: 'var(--sh-sm)',
      // Destaque é uma faixa de acento, não um card inteiro colorido: mantém a
      // grade de cartões legível quando vários aparecem lado a lado.
      ...(emphasis ? { borderTop: `2px solid ${color}` } : {}),
    }}>
      <div style={{
        fontSize: 'var(--fs-xs)', fontWeight: 600, color: 'var(--admin-text-muted)',
        textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 'var(--sp-2)',
      }}>{label}</div>
      <div style={{
        fontSize: emphasis ? 'var(--fs-xl)' : 'var(--fs-lg)', fontWeight: 650,
        color, lineHeight: 'var(--lh-tight)', letterSpacing: '-0.02em',
        fontVariantNumeric: 'tabular-nums', overflowWrap: 'anywhere',
      }}>{value}</div>
      <div style={{
        fontSize: 'var(--fs-xs)', color: 'var(--admin-text-muted)',
        marginTop: 'var(--sp-1)', lineHeight: 'var(--lh-normal)',
      }}>{sub}</div>
    </div>
  )
}

export function StatRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', gap: 'var(--sp-3)',
      fontSize: 'var(--fs-sm)', padding: 'var(--sp-1) 0',
    }}>
      <span style={{ color: 'var(--admin-text-sec)' }}>{label}</span>
      <strong style={{
        color: color ?? 'var(--admin-text-main)', fontWeight: 600,
        fontVariantNumeric: 'tabular-nums', overflowWrap: 'anywhere',
      }}>{value}</strong>
    </div>
  )
}

export function AlertCard({ type, icon: Icon, title, desc, action }: {
  type: 'scale' | 'watch' | 'kill'
  icon: typeof TrendingUp
  title: string
  desc: string
  action?: React.ReactNode
}) {
  const color = type === 'scale' ? 'var(--admin-green)' : type === 'kill' ? 'var(--admin-red)' : 'var(--admin-alert)'
  const soft  = type === 'scale' ? 'var(--admin-green-soft)' : type === 'kill' ? 'var(--admin-red-soft)' : 'var(--admin-alert-soft)'
  return (
    <div style={{
      display: 'flex', gap: 'var(--sp-3)', alignItems: 'flex-start',
      minWidth: 0,
      background: 'var(--admin-card)', border: '1px solid var(--admin-border)',
      borderRadius: 'var(--r-md)', padding: 'var(--sp-4)',
    }}>
      <div style={{
        width: '32px', height: '32px', borderRadius: 'var(--r-sm)', background: soft,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <Icon size={16} color={color} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 'var(--fs-sm)', fontWeight: 600, color: 'var(--admin-text-main)',
          marginBottom: 'var(--sp-1)',
        }}>{title}</div>
        <div style={{
          fontSize: 'var(--fs-sm)', color: 'var(--admin-text-sec)', lineHeight: 'var(--lh-normal)',
        }}>{desc}</div>
      </div>
      {action}
    </div>
  )
}

// ───────────────────────── ResponsiveTable ─────────────────────────
// Tabela real acima de 768px; abaixo disso vira um card empilhado por linha.
// Nunca aplica min-width — scroll horizontal é proibido pela regra mobile-first.
// As classes `as-table` / `as-cards` são alternadas pela media query em page.tsx.

export type Column<T> = {
  key: string
  header: string
  render: (row: T) => React.ReactNode
  align?: 'left' | 'right'
  primary?: boolean
}

export function ResponsiveTable<T>({ columns, rows, rowKey, emptyLabel }: {
  columns: Column<T>[]
  rows: T[]
  rowKey: (row: T) => string
  emptyLabel?: string
}) {
  if (rows.length === 0) {
    return (
      <div style={{
        fontSize: 'var(--fs-sm)', color: 'var(--admin-text-muted)',
        textAlign: 'center', padding: 'var(--sp-4)',
      }}>
        {emptyLabel ?? 'Sem dados no período.'}
      </div>
    )
  }

  const primary = columns.find(c => c.primary) ?? columns[0]
  const rest = columns.filter(c => c !== primary)

  return (
    <>
      <table className="as-table" style={{
        width: '100%', borderCollapse: 'collapse', fontSize: 'var(--fs-sm)',
        fontVariantNumeric: 'tabular-nums',
      }}>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} style={{
                padding: '0 var(--sp-2) var(--sp-2)', textAlign: c.align ?? 'left',
                fontSize: 'var(--fs-xs)', fontWeight: 600, color: 'var(--admin-text-muted)',
                textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap',
                borderBottom: '1px solid var(--admin-border-strong)',
              }}>{c.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)} style={{ borderBottom: '1px solid var(--admin-border)' }}>
              {columns.map((c) => (
                <td key={c.key} style={{
                  padding: 'var(--sp-3) var(--sp-2)', textAlign: c.align ?? 'left',
                  color: 'var(--admin-text-sec)',
                }}>
                  {c.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="as-cards" style={{ display: 'none', flexDirection: 'column', gap: 'var(--sp-3)' }}>
        {rows.map((row) => (
          <div key={rowKey(row)} style={{
            border: '1px solid var(--admin-border)', borderRadius: 'var(--r-md)',
            padding: 'var(--sp-4)', background: 'var(--admin-card)',
          }}>
            <div style={{
              fontWeight: 600, fontSize: 'var(--fs-md)', marginBottom: 'var(--sp-3)',
              color: 'var(--admin-text-main)',
            }}>
              {primary.render(row)}
            </div>
            <div style={{
              display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
              gap: 'var(--sp-2) var(--sp-3)', alignItems: 'center',
              fontVariantNumeric: 'tabular-nums',
            }}>
              {rest.map((c) => (
                <Fragment key={c.key}>
                  <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--admin-text-muted)' }}>{c.header}</span>
                  <span style={{ fontSize: 'var(--fs-sm)', textAlign: 'right', overflowWrap: 'anywhere', minWidth: 0, color: 'var(--admin-text-main)' }}>{c.render(row)}</span>
                </Fragment>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
