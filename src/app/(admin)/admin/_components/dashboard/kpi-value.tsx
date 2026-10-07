'use client'
import { useEffect, useState } from 'react'
import { formatKind, type ValueKind } from './format'

/** Número que conta de 0 até o valor em 0,9 s. Com movimento reduzido ligado
 *  no sistema, mostra o valor final direto. O HTML do servidor já vem com o
 *  valor final — a contagem só acontece depois da hidratação. */
export function KpiValue({ value, kind }: { value: number; kind: ValueKind }) {
  const [shown, setShown] = useState(value)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let raf = 0
    const t0 = performance.now()
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / 900)
      setShown(value * (1 - Math.pow(1 - p, 3)))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value])

  return <>{formatKind(shown, kind)}</>
}
