'use client'
import { useEffect, useId, useRef, useState } from 'react'
import type { MetricDef } from '@/lib/admin/metric-contract'

/** "?" de ajuda: abre por clique, toque ou teclado (Enter/Espaço) e fecha com
 *  Esc ou clique fora — não depende de hover. */
export function HelpTip({ def }: { def: MetricDef }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)
  const id = useId()

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <span className="dsh-help" ref={ref}>
      <button
        type="button"
        aria-label={`O que é ${def.label}`}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen(o => !o)}
      >?</button>
      {open && (
        <span className="dsh-help-pop" id={id} role="dialog" aria-label={def.label}>
          <h4>{def.label}</h4>
          {def.what}
          <dl>
            <div><dt>Como é calculado</dt><dd>{def.formula}</dd></div>
            <div><dt>Fonte</dt><dd>{def.sources}</dd></div>
            <div><dt>Data usada</dt><dd>{def.dateField}</dd></div>
            {def.notes && <div><dt>Atenção</dt><dd>{def.notes}</dd></div>}
          </dl>
        </span>
      )}
    </span>
  )
}
