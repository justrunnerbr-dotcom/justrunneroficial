'use client'

import { useState } from 'react'
import { BRAZIL_STATE_PATHS, BRAZIL_MAP_VIEWBOX } from './brazil-state-paths'
import { BRAZIL_STATE_NAMES } from './brazil-state-names'

export interface BrazilMapDatum {
  state:      string
  value:      number
  primary:    string
  secondary?: string
}

interface BrazilMapProps {
  data:        BrazilMapDatum[]
  emptyLabel?: string
}

// Intensidade relativa ao MAIOR valor (não ao total) — se usasse % do total,
// um estado dominante (ex: SP com 55%) esmagava a escala e todo o resto
// (mesmo tendo dados reais) ficava visualmente idêntico a "sem dado".
// Com piso de 0.32 pra quem tem QUALQUER valor, dá pra distinguir "pouco"
// de "nada" olhando o mapa.
function intensityColor(relativeValue: number): string {
  if (relativeValue <= 0) return 'var(--admin-border)'
  const alpha = Math.min(0.32 + relativeValue * 0.68, 1)
  return `rgba(var(--admin-accent-rgb), ${alpha.toFixed(2)})`
}

export function BrazilMap({ data, emptyLabel = 'sem dados no período' }: BrazilMapProps) {
  const [hover, setHover] = useState<{ uf: string; x: number; y: number; boxWidth: number } | null>(null)

  const byUf = new Map(data.map(d => [d.state, d]))
  const maxValue = Math.max(...data.map(d => d.value), 1)
  const hoveredDatum = hover ? byUf.get(hover.uf) : null

  function handlePointerMove(uf: string, e: React.MouseEvent<SVGPathElement>) {
    const rect = e.currentTarget.ownerSVGElement!.getBoundingClientRect()
    setHover({ uf, x: e.clientX - rect.left, y: e.clientY - rect.top, boxWidth: rect.width })
  }

  return (
    <div style={{ position: 'relative' }}>
      <svg
        viewBox={BRAZIL_MAP_VIEWBOX}
        width="100%"
        style={{ maxWidth: '420px', display: 'block' }}
        onMouseLeave={() => setHover(null)}
      >
        {Object.entries(BRAZIL_STATE_PATHS).map(([uf, d]) => {
          const datum = byUf.get(uf)
          const relativeValue = (datum?.value ?? 0) / maxValue
          return (
            <path
              key={uf}
              d={d}
              fill={intensityColor(relativeValue)}
              stroke="var(--admin-card)"
              strokeWidth="1.2"
              strokeLinejoin="round"
              style={{ cursor: 'pointer', transition: 'fill 0.15s' }}
              onMouseEnter={(e) => handlePointerMove(uf, e)}
              onMouseMove={(e) => handlePointerMove(uf, e)}
            />
          )
        })}
      </svg>

      {hover && (
        <div style={{
          position:      'absolute',
          left:          Math.min(hover.x + 14, Math.max(hover.boxWidth - 150, 0)),
          top:           Math.max(hover.y - 12, 0),
          pointerEvents: 'none',
          background:    'var(--admin-bg)',
          border:        '1px solid var(--admin-border)',
          borderRadius:  '8px',
          padding:       '8px 12px',
          boxShadow:     '0 8px 20px rgba(0,0,0,0.35)',
          whiteSpace:    'nowrap',
          zIndex:        50,
        }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--admin-text-main)' }}>
            {BRAZIL_STATE_NAMES[hover.uf] ?? hover.uf}
          </div>
          {hoveredDatum ? (
            <>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--admin-accent)', fontFamily: 'monospace' }}>
                {hoveredDatum.primary}
              </div>
              {hoveredDatum.secondary && (
                <div style={{ fontSize: '11px', color: 'var(--admin-text-muted)' }}>{hoveredDatum.secondary}</div>
              )}
            </>
          ) : (
            <div style={{ fontSize: '11px', color: 'var(--admin-text-muted)' }}>{emptyLabel}</div>
          )}
        </div>
      )}
    </div>
  )
}
