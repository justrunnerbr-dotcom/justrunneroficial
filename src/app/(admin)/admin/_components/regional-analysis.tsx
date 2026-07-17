'use client'

import { useState } from 'react'
import { Download, Map, MapPin } from 'lucide-react'
import type { StateSales } from '@/lib/admin/sales-breakdown'
import { BrazilMap } from './brazil-map'

const COLORS = {
  card:      'var(--admin-card)',
  bg:        'var(--admin-bg)',
  border:    'var(--admin-border)',
  textMain:  'var(--admin-text-main)',
  textSec:   'var(--admin-text-sec)',
  textMuted: 'var(--admin-text-muted)',
  accent:    'var(--admin-accent)',
}

function fmtBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

function downloadCsv(data: StateSales[]) {
  const header = 'Estado,Vendas,Receita\n'
  const rows = data.map(s => `${s.state},${s.count},${s.revenue.toFixed(2)}`).join('\n')
  const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `vendas-por-estado-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export function RegionalAnalysis({ data }: { data: StateSales[] }) {
  const [showMap, setShowMap] = useState(true)

  const totalRevenue = data.reduce((s, r) => s + r.revenue, 0)
  const totalOrders  = data.reduce((s, r) => s + r.count, 0)
  const stateCount   = data.length

  return (
    <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: '16px', padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
        <h2 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: COLORS.textMain, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Análise Regional</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            onClick={() => downloadCsv(data)}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600,
              color: COLORS.textSec, background: COLORS.bg, border: `1px solid ${COLORS.border}`,
              borderRadius: '8px', padding: '6px 12px', cursor: 'pointer',
            }}
          >
            <Download size={13} /> Exportar CSV
          </button>
          <button
            type="button"
            onClick={() => setShowMap(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600,
              color: showMap ? '#fff' : COLORS.textSec, background: showMap ? COLORS.accent : COLORS.bg,
              border: `1px solid ${COLORS.border}`, borderRadius: '8px', padding: '6px 12px', cursor: 'pointer',
            }}
          >
            <Map size={13} /> {showMap ? 'Ocultar mapa' : 'Mostrar mapa'}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 140px', background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: '10px', padding: '10px 14px' }}>
          <div style={{ fontSize: '10px', fontWeight: 600, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.4px' }}>Vendas</div>
          <div style={{ fontSize: '16px', fontWeight: 700, color: COLORS.textMain, fontFamily: 'monospace' }}>{fmtBRL(totalRevenue)}</div>
        </div>
        <div style={{ flex: '1 1 100px', background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: '10px', padding: '10px 14px' }}>
          <div style={{ fontSize: '10px', fontWeight: 600, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.4px' }}>Pedidos</div>
          <div style={{ fontSize: '16px', fontWeight: 700, color: COLORS.textMain, fontFamily: 'monospace' }}>{totalOrders}</div>
        </div>
        <div style={{ flex: '1 1 100px', background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: '10px', padding: '10px 14px' }}>
          <div style={{ fontSize: '10px', fontWeight: 600, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.4px' }}>Estados</div>
          <div style={{ fontSize: '16px', fontWeight: 700, color: COLORS.textMain, fontFamily: 'monospace' }}>{stateCount}</div>
        </div>
      </div>

      {data.length === 0 ? (
        <p style={{ fontSize: '13px', color: COLORS.textMuted, margin: 0 }}>Sem vendas aprovadas no período.</p>
      ) : (
        <div style={{ display: 'flex', gap: '28px', flexWrap: 'wrap' }}>
          {showMap && (
            <div style={{ flex: '0 1 340px', minWidth: '260px' }}>
              <BrazilMap
                data={data.map(s => ({
                  state:     s.state,
                  value:     s.revenue,
                  primary:   fmtBRL(s.revenue),
                  secondary: `${s.count} ${s.count === 1 ? 'venda' : 'vendas'}`,
                }))}
                emptyLabel="sem vendas no período"
              />
            </div>
          )}

          <div style={{ flex: '1 1 320px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '2px' }}>Top Estados</div>
            {data.slice(0, 8).map((s, i) => (
              <div key={s.state}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '12px', color: COLORS.textMuted, width: '18px' }}>{i + 1}º</span>
                  <MapPin size={12} color={COLORS.accent} />
                  <span style={{ fontSize: '13px', fontWeight: 700, color: COLORS.textMain }}>{s.state}</span>
                  <span style={{ fontSize: '11px', color: COLORS.textMuted }}>{s.count} {s.count === 1 ? 'venda' : 'vendas'}</span>
                  <span style={{ marginLeft: 'auto', fontSize: '13px', fontWeight: 700, color: COLORS.textMain, fontFamily: 'monospace' }}>{fmtBRL(s.revenue)}</span>
                </div>
                <div style={{ height: '5px', background: COLORS.border, borderRadius: '99px', overflow: 'hidden', marginLeft: '30px' }}>
                  <div style={{ height: '100%', width: `${(s.revenue / data[0].revenue) * 100}%`, background: COLORS.accent, borderRadius: '99px' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
