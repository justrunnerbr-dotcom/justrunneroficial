'use client'
import { useEffect, useRef } from 'react'
import { metaPurchase } from '@/lib/meta'

export function ObrigadoTracker({
  saleId,
  value,
  email,
  phone,
}: {
  saleId: string
  value: string
  email?: string
  phone?: string
}) {
  const fired = useRef(false)

  useEffect(() => {
    if (fired.current) return
    fired.current = true
    const numericValue = parseFloat(value)
    if (!Number.isFinite(numericValue)) return
    metaPurchase({ saleId, value: numericValue, email, phone })
  }, [saleId, value, email, phone])

  return null
}
