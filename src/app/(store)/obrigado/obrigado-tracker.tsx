'use client'
import { useEffect, useRef } from 'react'
import { metaPurchase } from '@/lib/meta'
import { getAttribution, initSession, getVisitorId } from '@/lib/analytics/client'

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

    // Purchase pro Meta com _fbp/_fbc reais do cookie — mesmo event_id do webhook,
    // que a Meta funde em um evento só (ver comentário em lib/meta.ts:258).
    metaPurchase({ saleId, value: numericValue, email, phone })

    // Atribuição completa pros nossos próprios dados: é o único ponto pós-compra em
    // que o localStorage com utm_content/utm_term ainda está acessível.
    try {
      const body = JSON.stringify({
        sale_id:     saleId,
        value:       numericValue,
        session_id:  initSession(),
        visitor_id:  getVisitorId(),
        attribution: getAttribution() ?? {},
      })
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/attribution/order', new Blob([body], { type: 'application/json' }))
      } else {
        void fetch('/api/attribution/order', {
          method: 'POST', body, keepalive: true,
          headers: { 'Content-Type': 'application/json' },
        })
      }
    } catch { /* best-effort: nunca quebra a página de confirmação */ }
  }, [saleId, value, email, phone])

  return null
}
