'use client'

import { Fragment, useEffect, useState } from 'react'
import Link from 'next/link'
import { PROMO_END_MS } from '@/lib/promo'

const LABELS = ['DIAS', 'HORAS', 'MIN', 'SEG'] as const

const pad = (n: number) => String(n).padStart(2, '0')

function split(ms: number): number[] {
  const s = Math.max(0, Math.floor(ms / 1000))
  return [
    Math.floor(s / 86400),
    Math.floor((s % 86400) / 3600),
    Math.floor((s % 3600) / 60),
    s % 60,
  ]
}

/**
 * Barra de contagem regressiva no topo do site. A data de fim é fixa
 * (`PROMO_END_MS`), então a contagem é a mesma para todo visitante.
 *
 * Quem decide se a barra existe é o layout (server), comparando a data — aqui
 * só roda o relógio. Se a promo virar durante a navegação, a barra congela em
 * zero e some no próximo carregamento, evitando pulo de layout no meio da sessão.
 */
export function PromoCountdownBar() {
  // null até montar — o servidor não tem como renderizar o relógio sem divergir
  // do cliente na hidratação. O espaço já está reservado pelo CSS, não pula nada.
  const [remaining, setRemaining] = useState<number | null>(null)

  useEffect(() => {
    const tick = () => setRemaining(PROMO_END_MS - Date.now())
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  const values = split(remaining ?? 0)

  return (
    <Link
      href="/colecao/compre-1-leve-2"
      className="promo-bar"
      aria-label="Compre 1 Leve 2 — promoção por tempo limitado, ver produtos"
    >
      <span className="promo-bar-label">
        <strong>Compre 1 Leve 2</strong>
        <span>Termina em:</span>
      </span>

      <span className="promo-bar-clock">
        {values.map((value, i) => (
          <Fragment key={LABELS[i]}>
            {i > 0 && <span className="promo-bar-colon" aria-hidden="true">:</span>}
            <span className="promo-bar-tile">
              <b>{remaining === null ? '--' : pad(value)}</b>
              <small>{LABELS[i]}</small>
            </span>
          </Fragment>
        ))}
      </span>
    </Link>
  )
}
