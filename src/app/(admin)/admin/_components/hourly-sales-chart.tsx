import type { HourlySalesPoint } from '@/lib/admin/sales-breakdown'

const COLORS = {
  border:  'var(--admin-border)',
  textSec: 'var(--admin-text-sec)',
  textMuted: 'var(--admin-text-muted)',
  accent:  'var(--admin-accent)',
}

export function HourlySalesChart({ data }: { data: HourlySalesPoint[] }) {
  const maxPct = Math.max(...data.map(d => d.pct), 1)
  const hasData = data.some(d => d.count > 0)

  if (!hasData) {
    return <p style={{ fontSize: '13px', color: COLORS.textMuted, margin: 0 }}>Sem vendas aprovadas no período pra montar o gráfico.</p>
  }

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '160px', overflowX: 'auto' }}>
      {data.map(({ hour, count, pct }) => (
        <div key={hour} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: '1 0 0', minWidth: '20px' }}>
          <span style={{ fontSize: '9px', color: COLORS.textMuted, marginBottom: '4px', whiteSpace: 'nowrap' }}>
            {count > 0 ? `${pct.toFixed(1)}%` : ''}
          </span>
          <div
            title={`${hour}h — ${count} venda(s) (${pct.toFixed(1)}%)`}
            style={{
              width: '100%',
              maxWidth: '18px',
              height: `${Math.max((pct / maxPct) * 110, count > 0 ? 3 : 1)}px`,
              background: count > 0 ? COLORS.accent : COLORS.border,
              borderRadius: '3px 3px 0 0',
            }}
          />
          <span style={{ fontSize: '9px', color: COLORS.textMuted, marginTop: '6px' }}>{String(hour).padStart(2, '0')}h</span>
        </div>
      ))}
    </div>
  )
}
