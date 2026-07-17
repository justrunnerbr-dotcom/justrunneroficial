'use client'

import dynamic from 'next/dynamic'
import type { LiveMapPoint } from './live-tile-map'

// Leaflet toca `window` na importação — precisa carregar só no cliente,
// nunca durante o SSR do Server Component da página.
const LiveTileMap = dynamic(() => import('./live-tile-map').then((m) => m.LiveTileMap), {
  ssr: false,
  loading: () => (
    <div style={{
      height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: 'var(--admin-text-muted)', fontSize: '13px',
    }}>
      Carregando mapa…
    </div>
  ),
})

export function LiveTileMapLoader({ points }: { points: LiveMapPoint[] }) {
  return <LiveTileMap points={points} />
}
