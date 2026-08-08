'use client'

import { Fragment, useEffect, useState } from 'react'
import Link from 'next/link'
import { msUntilReset } from '@/lib/promo'

const LABELS = ['HORAS', 'MIN', 'SEG'] as const

const pad = (n: number) => String(n).padStart(2, '0')

function split(ms: number): number[] {
  const s = Math.max(0, Math.floor(ms / 1000))
  return [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60]
}

/**
 * Barra de contagem regressiva no topo do site. O alvo é sempre a próxima
 * meia-noite de Brasília (`msUntilReset`), então a contagem é a mesma para todo
 * visitante e reinicia sozinha na virada do dia — ninguém precisa prorrogar
 * data nenhuma no código.
 *
 * Quem decide se a barra existe é o layout (server), lendo `PROMO_ATIVA`; aqui
 * só roda o relógio. Como o tempo restante é recalculado do relógio a cada
 * segundo (em vez de decrementado), a virada das 00:00 volta para 23:59:59
 * sem precisar de tratamento especial e sem depender da aba ficar aberta.
 */
export function PromoCountdownBar() {
  // null até montar — o servidor não tem como renderizar o relógio sem divergir
  // do cliente na hidratação. O espaço já está reservado pelo CSS, não pula nada.
  const [remaining, setRemaining] = useState<number | null>(null)

  useEffect(() => {
    const tick = () => setRemaining(msUntilReset())
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
