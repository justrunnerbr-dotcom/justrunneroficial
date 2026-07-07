'use client'

export type LiveGeoPoint = {
  city?:      string
  state?:     string
  country?:   string
  latitude?:  number
  longitude?: number
  type:       'visitor' | 'order'
  count?:     number
}

interface LiveMapProps {
  points?:       LiveGeoPoint[]
  visitorCount?: number
  orderCount?:   number
}

// Convert lat/lon → SVG coords when geo is available (Phase 2)
// viewBox 0 0 500 320, South America roughly centered
function geoToSvg(lat: number, lon: number): { x: number; y: number } {
  // lon -82 to -34 → x 0..500 ; lat 13 to -55 → y 0..320
  return {
    x: (lon + 82) / 48 * 500,
    y: (13 - lat)  / 68 * 320,
  }
}

export function LiveMap({ points = [], visitorCount = 0, orderCount = 0 }: LiveMapProps) {
  const hasGeo   = points.length > 0
  const CX = 250, CY = 155        // visual center

  return (
    <div style={{
      position:     'relative',
      width:        '100%',
      height:       '100%',
      minHeight:    '400px',
      background:   '#0E1612',
      borderRadius: '0 0 14px 14px',
      overflow:     'hidden',
    }}>
      {/* ── Background SVG (texture only, no geographic polygon) ── */}
      <svg
        viewBox="0 0 500 320"
        preserveAspectRatio="xMidYMid slice"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }}
        aria-hidden="true"
      >
        <defs>
          {/* Dot grid */}
          <pattern id="lm_dots" width="22" height="22" patternUnits="userSpaceOnUse">
            <circle cx="1.4" cy="1.4" r="0.75" fill="rgba(255,255,255,0.032)" />
          </pattern>

          {/* Vignette — dark edges, slightly lighter center */}
          <radialGradient id="lm_vignette" cx="50%" cy="48%" r="60%">
            <stop offset="0%"   stopColor="#1A2820" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#060C09" stopOpacity="0.0"  />
          </radialGradient>

          {/* Soft green glow behind pulse center */}
          <radialGradient id="lm_pulse_glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="#16F08B" stopOpacity="0.10" />
            <stop offset="100%" stopColor="#16F08B" stopOpacity="0"    />
          </radialGradient>

          {/* Pin glow filter (Phase 2) */}
          <filter id="lm_pin_glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Base */}
        <rect width="500" height="320" fill="#0E1612" />

        {/* Dot texture */}
        <rect width="500" height="320" fill="url(#lm_dots)" />

        {/* Topographic contour rings — subtle concentric circles */}
        {[220, 175, 132, 96, 64, 38, 17].map((r) => (
          <circle
            key={r}
            cx={CX} cy={CY} r={r}
            fill="none"
            stroke="rgba(255,255,255,0.030)"
            strokeWidth="0.7"
          />
        ))}

        {/* Center vignette glow */}
        <circle cx={CX} cy={CY} r="180" fill="url(#lm_pulse_glow)" />

        {hasGeo ? (
          /* ── Phase 2: real geo pins ── */
          points.map((pt, i) => {
            if (pt.latitude == null || pt.longitude == null) return null
            const { x, y } = geoToSvg(pt.latitude, pt.longitude)
            if (x < 0 || x > 500 || y < 0 || y > 320) return null
            const col = pt.type === 'visitor' ? '#16F08B' : '#8B5CF6'
            const r   = 4 + Math.min((pt.count ?? 1) - 1, 5)
            return (
              <g key={i} filter="url(#lm_pin_glow)">
                <circle cx={x} cy={y} r={r + 8} fill={col} opacity="0.10" />
                <circle cx={x} cy={y} r={r}     fill={col} opacity="0.88">
                  <animate attributeName="opacity" values="0.88;0.55;0.88" dur="2.5s" repeatCount="indefinite" />
                </circle>
                <circle cx={x} cy={y} r="2.2" fill="#fff" opacity="0.85" />
              </g>
            )
          })
        ) : (
          /* ── Phase 1: no geo — slow, gentle pulse ── */
          <>
            {/* Two slow expanding rings (not aggressive) */}
            <circle cx={CX} cy={CY} r="10" fill="none" stroke="rgba(22,240,139,0.35)" strokeWidth="0.8" opacity="0">
              <animate attributeName="r"       from="10" to="110" dur="5s"       repeatCount="indefinite" />
              <animate attributeName="opacity" from="0.35" to="0" dur="5s"       repeatCount="indefinite" />
            </circle>
            <circle cx={CX} cy={CY} r="10" fill="none" stroke="rgba(22,240,139,0.35)" strokeWidth="0.8" opacity="0">
              <animate attributeName="r"       from="10" to="110" dur="5s" begin="2.5s" repeatCount="indefinite" />
              <animate attributeName="opacity" from="0.35" to="0" dur="5s" begin="2.5s" repeatCount="indefinite" />
            </circle>

            {/* Static outer ring */}
            <circle cx={CX} cy={CY} r="22" fill="none" stroke="rgba(22,240,139,0.10)" strokeWidth="0.8" />

            {/* Center dot */}
            <circle cx={CX} cy={CY} r="5" fill="#16F08B" opacity="0.55">
              <animate attributeName="opacity" values="0.55;0.30;0.55" dur="3s" repeatCount="indefinite" />
            </circle>
            <circle cx={CX} cy={CY} r="2.2" fill="#fff" opacity="0.75" />
          </>
        )}
      </svg>

      {/* ── Center empty-state overlay ── */}
      {!hasGeo && (
        <div style={{
          position:       'absolute',
          inset:          0,
          display:        'flex',
          flexDirection:  'column',
          alignItems:     'center',
          justifyContent: 'center',
          gap:            '8px',
          textAlign:      'center',
          padding:        '24px',
          pointerEvents:  'none',
        }}>
          {/* Location pin icon */}
          <div style={{ marginBottom: '6px', opacity: 0.45 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z"
                fill="#16F08B"
              />
            </svg>
          </div>
          <div style={{ fontSize: '13px', fontWeight: 500, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.1px' }}>
            Dados de geolocalização ainda não disponíveis
          </div>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.22)', maxWidth: '260px', lineHeight: 1.65 }}>
            Os pins aparecerão quando a captura de IP/Geo estiver ativa.
          </div>
        </div>
      )}

      {/* ── Floating stats (bottom-left) ── */}
      <div style={{
        position: 'absolute',
        bottom:   '16px',
        left:     '16px',
        display:  'flex',
        gap:      '10px',
      }}>
        {/* Visitantes */}
        <div style={{
          background:     'rgba(14,22,18,0.85)',
          border:         '1px solid rgba(22,240,139,0.20)',
          borderRadius:   '10px',
          padding:        '10px 16px',
          backdropFilter: 'blur(10px)',
          minWidth:       '94px',
        }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(22,240,139,0.60)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '5px' }}>
            Visitantes agora
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, lineHeight: 1, color: visitorCount > 0 ? '#16F08B' : 'rgba(255,255,255,0.30)' }}>
            {visitorCount}
          </div>
        </div>

        {/* Pedidos — só aparece se > 0 */}
        {orderCount > 0 && (
          <div style={{
            background:     'rgba(14,22,18,0.85)',
            border:         '1px solid rgba(139,92,246,0.25)',
            borderRadius:   '10px',
            padding:        '10px 16px',
            backdropFilter: 'blur(10px)',
            minWidth:       '80px',
          }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(139,92,246,0.70)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '5px' }}>
              Pedidos hoje
            </div>
            <div style={{ fontSize: '24px', fontWeight: 800, lineHeight: 1, color: '#8B5CF6' }}>
              {orderCount}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
