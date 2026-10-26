'use client'

import { useTransition } from 'react'
import { deleteAutomationAction, toggleAutomationAction } from '../actions'

export function ToggleButton({ id, active }: { id: string; active: boolean }) {
  const [pending, startTransition] = useTransition()
  return (
    <button
      disabled={pending}
      onClick={() => startTransition(() => toggleAutomationAction(id, !active))}
      style={{
        fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '20px', border: 'none', cursor: 'pointer',
        color: active ? 'var(--admin-accent)' : 'var(--admin-text-muted)',
        background: active ? 'rgba(16,185,129,0.12)' : 'var(--admin-card-hover)',
      }}
    >
      {active ? 'Ativa' : 'Pausada'}
    </button>
  )
}

export function DeleteButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition()
  return (
    <button
      disabled={pending}
      onClick={() => {
        if (confirm('Apagar esta automação?')) startTransition(() => deleteAutomationAction(id))
      }}
      style={{ fontSize: '13px', color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer' }}
    >
      Apagar
    </button>
  )
}
