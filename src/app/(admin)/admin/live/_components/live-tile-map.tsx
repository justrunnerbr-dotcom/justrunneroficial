'use client'

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

export interface LiveMapPoint {
  lat:   number
  lon:   number
  city:  string | null
  state: string | null
  count: number
}

function pointIcon(count: number) {
  const size = count > 1 ? 30 : 22
  return L.divIcon({
    className: 'live-map-pin',
    html: `<div style="
      width: ${size}px; height: ${size}px;
      border-radius: 50%;
      background: rgba(139,92,246,0.9);
      border: 2px solid #fff;
      box-shadow: 0 0 0 4px rgba(139,92,246,0.25);
      display: flex; align-items: center; justify-content: center;
      color: #fff; font-size: 12px; font-weight: 700; font-family: sans-serif;
    ">${count}</div>`,
    iconSize:   [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

export function LiveTileMap({ points }: { points: LiveMapPoint[] }) {
  return (
    <MapContainer
      center={[-14.235, -51.9253]}
      zoom={4}
      style={{ height: '100%', width: '100%' }}
      scrollWheelZoom
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        subdomains={['a', 'b', 'c', 'd']}
        maxZoom={19}
      />
      {points.map((p, i) => (
        <Marker key={`${p.lat}-${p.lon}-${i}`} position={[p.lat, p.lon]} icon={pointIcon(p.count)}>
          <Popup>
            <strong>{p.city ?? 'Cidade desconhecida'}</strong>{p.state ? `, ${p.state}` : ''}
            <br />
            {p.count} {p.count === 1 ? 'visitante' : 'visitantes'}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}
