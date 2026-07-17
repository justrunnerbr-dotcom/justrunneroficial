import type { ComponentType } from 'react'

const COLORS = {
  textMain:  'var(--admin-text-main)',
  textSec:   'var(--admin-text-sec)',
  textMuted: 'var(--admin-text-muted)',
  border:    'var(--admin-border)',
  red:       'var(--admin-red)',
}

export interface FunnelStep {
  label: string
  value: number
  icon:  ComponentType<{ size?: number; color?: string }>
}

const STAGE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#f97316', '#14b8a6', '#a855f7']

// Funil em formato de "fita" suave (curvas bezier, não polígono reto) — cada
// estágio tem sua própria cor, um ponto marcador alinhado numa linha reta, e
// uma guia tracejada descendo até o card de percentual embaixo. Curvas
// suaves absorvem bem estágios não-monotônicos (ex: um valor do meio menor
// que os vizinhos) sem quebrar visualmente como um polígono reto quebraria.
export function ConversionFunnelVisual({ steps }: { steps: FunnelStep[] }) {
  const n = steps.length
  const firstValue = steps[0]?.value || 1
  const maxOverallValue = Math.max(...steps.map(s => s.value), 1)

  const W = 900
  const svgH = 200
  const centerY = svgH / 2
  const maxHalfHeight = 70
  const minHalfHeight = 6
  const colW = W / n
  const leadIn = colW / 2

  function halfHeightFor(value: number): number {
    if (value <= 0) return minHalfHeight
    return Math.max((value / maxOverallValue) * maxHalfHeight, minHalfHeight)
  }

  const anchors = steps.map((_, i) => colW * i + colW / 2)
  const halfHeights = steps.map(s => halfHeightFor(s.value))

  // Constrói o contorno superior (esquerda→direita) e depois o inferior
  // (direita→esquerda) com curvas em S (tangentes horizontais) entre cada
  // par de âncoras, fechando a fita num único path preenchível.
  function buildRibbonPath(): string {
    const firstX = anchors[0] - leadIn
    const lastX  = anchors[n - 1] + leadIn

    const topPts = [
      `M ${firstX},${centerY - halfHeights[0]}`,
      `L ${anchors[0]},${centerY - halfHeights[0]}`,
      ...Array.from({ length: n - 1 }, (_, i) => {
        const x0 = anchors[i]
        const x1 = anchors[i + 1]
        const midX = (x0 + x1) / 2
        const yTop0 = centerY - halfHeights[i]
        const yTop1 = centerY - halfHeights[i + 1]
        return `C ${midX},${yTop0} ${midX},${yTop1} ${x1},${yTop1}`
      }),
      `L ${lastX},${centerY - halfHeights[n - 1]}`,
    ]

    const bottomPts = [
      `L ${lastX},${centerY + halfHeights[n - 1]}`,
      ...Array.from({ length: n - 1 }, (_, k) => {
        const i = n - 2 - k
        const x0 = anchors[i]
        const x1 = anchors[i + 1]
        const midX = (x0 + x1) / 2
        const yBot0 = centerY + halfHeights[i]
        const yBot1 = centerY + halfHeights[i + 1]
        return `C ${midX},${yBot1} ${midX},${yBot0} ${x0},${yBot0}`
      }),
      `L ${firstX},${centerY + halfHeights[0]}`,
      'Z',
    ]

    return [...topPts, ...bottomPts].join(' ')
  }

  const ribbonPath = buildRibbonPath()

  return (
    <div>
      {/* Cabeçalho: ícone + label + valor + legenda, uma coluna por estágio */}
      <div style={{ display: 'flex' }}>
        {steps.map((step, i) => {
          const Icon = step.icon
          const color = STAGE_COLORS[i % STAGE_COLORS.length]
          const pct = firstValue > 0 ? ((step.value / firstValue) * 100) : 0
          const prevValue = i > 0 ? steps[i - 1].value : null
          const stepConv = prevValue !== null && prevValue > 0 ? (step.value / prevValue) * 100 : null
          return (
            <div key={step.label} style={{ flex: 1, minWidth: 0, paddingRight: '8px' }}>
              <div style={{
                width: '30px', height: '30px', borderRadius: '50%', background: `${color}22`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px',
              }}>
                <Icon size={15} color={color} />
              </div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.4px' }}>{step.label}</div>
              <div style={{ fontSize: '20px', fontWeight: 700, color, fontFamily: 'monospace', margin: '2px 0' }}>
                {step.value.toLocaleString('pt-BR')}
              </div>
              <div style={{ fontSize: '11px', color: COLORS.textMuted }}>
                {i === 0 ? `${pct.toFixed(0)}% do total` : stepConv !== null ? `${stepConv.toFixed(1)}% do anterior` : '— do anterior'}
              </div>
            </div>
          )
        })}
      </div>

      {/* Fita do funil */}
      <div style={{ position: 'relative', marginTop: '12px' }}>
        <svg viewBox={`0 0 ${W} ${svgH}`} width="100%" height={svgH} preserveAspectRatio="none">
          <defs>
            {/* Fita numa cor só (accent do admin), mais forte na entrada e
                suavizando na saída — as cores por estágio ficam só nos pontos
                e ícones, pra não deixar a fita "arco-íris" */}
            <linearGradient id="funnelRibbonGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%"   stopColor="var(--admin-accent)" stopOpacity="0.9" />
              <stop offset="100%" stopColor="var(--admin-accent)" stopOpacity="0.45" />
            </linearGradient>
          </defs>
          <path d={ribbonPath} fill="url(#funnelRibbonGradient)" />
          {anchors.map((ax, i) => (
            <g key={i}>
              <line x1={ax} y1={0} x2={ax} y2={svgH} stroke={COLORS.border} strokeWidth="1" strokeDasharray="3 4" />
              <circle cx={ax} cy={centerY} r="5" fill={STAGE_COLORS[i % STAGE_COLORS.length]} stroke="var(--admin-card)" strokeWidth="2" />
            </g>
          ))}
        </svg>
      </div>

      {/* Cards de percentual, embaixo, uma coluna por estágio */}
      <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
        {steps.map((step, i) => {
          const color = STAGE_COLORS[i % STAGE_COLORS.length]
          const pct = firstValue > 0 ? ((step.value / firstValue) * 100) : 0
          const prevValue = i > 0 ? steps[i - 1].value : null
          const delta = prevValue !== null ? step.value - prevValue : null
          return (
            <div key={step.label} style={{
              flex: 1, minWidth: 0, background: 'var(--admin-bg)', border: `1px solid ${COLORS.border}`,
              borderRadius: '10px', padding: '10px 12px',
            }}>
              <div style={{ fontSize: '16px', fontWeight: 700, color, fontFamily: 'monospace' }}>{pct.toFixed(1)}%</div>
              <div style={{ fontSize: '10px', color: COLORS.textMuted, marginTop: '2px' }}>
                {i === 0 ? 'ponto de entrada' : 'continuação'}
              </div>
              {delta !== null && (
                <div style={{ fontSize: '10px', color: delta < 0 ? COLORS.red : COLORS.textSec, marginTop: '2px' }}>
                  {delta < 0 ? '↓' : '↑'} {Math.abs(delta).toLocaleString('pt-BR')}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
