import type { PaymentApprovalRate } from '@/lib/admin/sales-breakdown'

const COLORS = {
  textMain:  'var(--admin-text-main)',
  textSec:   'var(--admin-text-sec)',
  textMuted: 'var(--admin-text-muted)',
  border:    'var(--admin-border)',
  green:     'var(--admin-accent)',
  red:       'var(--admin-red)',
  alert:     'var(--admin-alert)',
}

function ringColor(pct: number): string {
  if (pct >= 70) return COLORS.green
  if (pct >= 40) return COLORS.alert
  return COLORS.red
}

function Ring({ pct }: { pct: number }) {
  const radius = 16
  const circumference = 2 * Math.PI * radius
  const dash = (pct / 100) * circumference
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" style={{ transform: 'rotate(-90deg)' }}>
      <circle cx="20" cy="20" r={radius} fill="none" stroke={COLORS.border} strokeWidth="4" />
      <circle
        cx="20" cy="20" r={radius} fill="none"
        stroke={ringColor(pct)} strokeWidth="4" strokeLinecap="round"
        strokeDasharray={`${dash} ${circumference - dash}`}
      />
    </svg>
  )
}

export function ApprovalRateRings({ data }: { data: PaymentApprovalRate[] }) {
  if (data.length === 0) {
    return <p style={{ fontSize: '13px', color: COLORS.textMuted, margin: 0 }}>Sem pedidos no período.</p>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {data.map((row) => (
        <div key={row.method} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <div>
            <div style={{ fontSize: '13px', color: COLORS.textSec }}>{row.label}</div>
            <div style={{ fontSize: '11px', color: COLORS.textMuted }}>{row.approved} de {row.total} pedidos</div>
          </div>
          <div style={{ position: 'relative', width: '40px', height: '40px' }}>
            <Ring pct={row.pct} />
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: '10px', fontWeight: 700, color: COLORS.textMain }}>{Math.round(row.pct)}%</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
