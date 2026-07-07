'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { track, initSession, captureAttribution } from '@/lib/analytics/client'

export function TrackingProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const initialized = useRef(false)

  // Init session ID once on mount
  useEffect(() => {
    if (initialized.current) return
    initialized.current = true
    try { initSession() } catch { /* ignore storage errors */ }
  }, [])

  // On every route change: capture UTMs from URL (no-op if none), then fire page_view
  useEffect(() => {
    captureAttribution()
    track({ event_type: 'page_view', page: pathname })
  }, [pathname]) // eslint-disable-line react-hooks/exhaustive-deps

  return <>{children}</>
}
