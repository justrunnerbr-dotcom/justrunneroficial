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
    // Se o redirect da Yampi estiver com nome de variável errado, ela manda o
    // placeholder cru ("%%sale_id%%") em vez do valor. Antes isso era um `return`
    // silencioso: nada disparava e nada indicava o motivo — a atribuição seguiria
    // vazia sem deixar rastro. Agora o caso inválido é reportado do mesmo jeito,
    // com os parâmetros que realmente chegaram, pra dar pra diagnosticar.
    const paramsOk = Number.isFinite(numericValue) && !!saleId && !saleId.includes('%%')

    // Purchase pro Meta com _fbp/_fbc reais do cookie — mesmo event_id do webhook,
    // que a Meta funde em um evento só (ver comentário em lib/meta.ts:258).
    // Só dispara com dado válido: Purchase com valor NaN sujaria a conta.
    if (paramsOk) {
      metaPurchase({ saleId, value: numericValue, email, phone })
    }

    // Atribuição completa pros nossos próprios dados: é o único ponto pós-compra em
    // que o localStorage com utm_content/utm_term ainda está acessível.
    try {
      const body = JSON.stringify({
        sale_id:     saleId,
        value:       paramsOk ? numericValue : undefined,
        params_ok:   paramsOk,
        raw_params:  paramsOk ? undefined : { sale_id: saleId, value },
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
