'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export function LiveRefresh({ intervalMs = 15000 }: { intervalMs?: number }) {
  const router        = useRouter()
  const [secs, setSecs] = useState(intervalMs / 1000)

  useEffect(() => {
    setSecs(intervalMs / 1000)
    const tick = setInterval(() => {
      setSecs(s => {
        if (s <= 1) {
          router.refresh()
          return intervalMs / 1000
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(tick)
  }, [router, intervalMs])

  return (
    <div style={{
      position: 'fixed', top: '14px', right: '24px', zIndex: 200,
      display: 'flex', alignItems: 'center', gap: '7px',
      background: 'var(--admin-card)',
      border: '1px solid var(--admin-border)',
      borderRadius: '20px', padding: '5px 12px',
      fontSize: '12px', color: 'var(--admin-text-muted)',
      boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
    }}>
      <div style={{
        width: '7px', height: '7px', borderRadius: '50%',
        background: '#10B981',
        boxShadow: '0 0 6px rgba(16,185,129,0.6)',
      }} />
      Atualiza em {secs}s
    </div>
  )
}
