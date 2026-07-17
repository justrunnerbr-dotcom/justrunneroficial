import type { PaymentMethodSlice } from '@/lib/admin/sales-breakdown'

const SLICE_COLORS: Record<string, string> = {
  Pix:     '#22c55e',
  Cartão:  'var(--admin-accent)',
  Boleto:  '#f59e0b',
  Outros:  'var(--admin-text-muted)',
}

const COLORS = {
  textMain:  'var(--admin-text-main)',
  textSec:   'var(--admin-text-sec)',
  textMuted: 'var(--admin-text-muted)',
  border:    'var(--admin-border)',
}

export function PaymentMethodDonut({ data }: { data: PaymentMethodSlice[] }) {
  const total = data.reduce((s, d) => s + d.count, 0)

  if (total === 0) {
    return <p style={{ fontSize: '13px', color: COLORS.textMuted, margin: 0 }}>Sem vendas aprovadas no período.</p>
  }

  const radius = 52
  const circumference = 2 * Math.PI * radius

  const slicesWithOffset = data.map((slice, i) => ({
    ...slice,
    offsetPct: data.slice(0, i).reduce((sum, s) => sum + s.pct, 0),
  }))

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
      <div style={{ position: 'relative', width: '140px', height: '140px', flexShrink: 0 }}>
        <svg width="140" height="140" viewBox="0 0 140 140" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="70" cy="70" r={radius} fill="none" stroke={COLORS.border} strokeWidth="18" />
          {slicesWithOffset.map((slice) => {
            const dash = (slice.pct / 100) * circumference
            const dashArray = `${dash} ${circumference - dash}`
            const dashOffset = -((slice.offsetPct / 100) * circumference)
            return (
              <circle
                key={slice.method}
                cx="70" cy="70" r={radius} fill="none"
                stroke={SLICE_COLORS[slice.method] ?? COLORS.textMuted}
                strokeWidth="18"
                strokeDasharray={dashArray}
                strokeDashoffset={dashOffset}
              />
            )
          })}
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: '11px', color: COLORS.textMuted }}>Total</span>
          <span style={{ fontSize: '22px', fontWeight: 700, color: COLORS.textMain, fontFamily: 'monospace' }}>{total}</span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {data.map((slice) => (
          <div key={slice.method} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: SLICE_COLORS[slice.method] ?? COLORS.textMuted, flexShrink: 0 }} />
            <span style={{ fontSize: '13px', color: COLORS.textSec, minWidth: '60px' }}>{slice.label}</span>
            <span style={{ fontSize: '13px', fontWeight: 600, color: COLORS.textMain, fontFamily: 'monospace' }}>{slice.pct.toFixed(1)}%</span>
            <span style={{ fontSize: '11px', color: COLORS.textMuted }}>({slice.count})</span>
          </div>
        ))}
      </div>
    </div>
  )
}
