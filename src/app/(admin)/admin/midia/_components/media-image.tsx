'use client'
import { useState } from 'react'

interface Props {
  src: string
  alt: string
}

export function MediaImage({ src, alt }: Props) {
  const [failed, setFailed] = useState(false)

  if (failed) {
    return (
      <div style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '10px',
        color: 'var(--admin-text-muted)',
        textAlign: 'center',
        padding: '8px',
        boxSizing: 'border-box',
      }}>
        Imagem indisponível
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'contain',
        display: 'block',
        padding: '8px',
        boxSizing: 'border-box',
      }}
    />
  )
}
