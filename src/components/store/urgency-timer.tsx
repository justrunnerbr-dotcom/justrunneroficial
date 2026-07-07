'use client'

import { useEffect, useState } from 'react'

const TIMER_KEY = 'jhf_offer_timer_start'
const DURATION_MS = 20 * 60 * 1000

function getOrSetStart(): number {
  try {
    const existing = sessionStorage.getItem(TIMER_KEY)
    if (existing) return parseInt(existing, 10)
    const now = Date.now()
    sessionStorage.setItem(TIMER_KEY, String(now))
    return now
  } catch {
    return Date.now()
  }
}

function formatTime(ms: number): string {
  if (ms <= 0) return '00:00'
  const totalSec = Math.floor(ms / 1000)
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

interface Props {
  variant: 'pdp' | 'cart'
}

export function UrgencyTimer({ variant }: Props) {
  const [mounted, setMounted] = useState(false)
  const [remaining, setRemaining] = useState(DURATION_MS)
  const [expired, setExpired] = useState(false)

  useEffect(() => {
    setMounted(true)
    const start = getOrSetStart()

    const tick = () => {
      const left = DURATION_MS - (Date.now() - start)
      if (left <= 0) {
        setExpired(true)
        setRemaining(0)
      } else {
        setRemaining(left)
      }
    }

    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  if (!mounted) return null

  if (variant === 'pdp') {
    return (
      <div style={{
        background: '#fafafa',
        border: '1px solid #e4e4e7',
        borderRadius: '6px',
        padding: '10px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '12px',
        color: '#52525b',
      }}>
        <span>🔥</span>
        <span>
          <strong style={{ color: '#18181b' }}>Compre 1 Leve 2 ativo</strong>
          {' '}— Estoque promocional limitado
        </span>
      </div>
    )
  }

  // cart variant
  if (expired) {
    return (
      <p style={{
        fontSize: '11px',
        color: '#71717a',
        textAlign: 'center',
        margin: '0 0 10px',
      }}>
        Oferta ainda disponível — finalize antes que o estoque acabe
      </p>
    )
  }

  return (
    <div style={{
      background: '#f4f4f5',
      borderRadius: '6px',
      padding: '8px 12px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '6px',
      marginBottom: '12px',
      fontSize: '12px',
      color: '#18181b',
      lineHeight: 1.3,
    }}>
      <span style={{ flexShrink: 0 }}>⏳</span>
      <span>
        Desconto reservado por{' '}
        <strong style={{ fontFamily: 'var(--font-poppins), sans-serif' }}>{formatTime(remaining)}</strong>
        {' '}— Finalize para manter o Compre 1 Leve 2
      </span>
    </div>
  )
}
