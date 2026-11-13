'use client'

import { useState, useTransition } from 'react'
import { confirmarDescadastroAction } from './actions'

export function BotaoDescadastro({ email }: { email: string }) {
  const [feito, setFeito] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [pendente, startTransition] = useTransition()

  if (feito) {
    return <p style={{ fontSize: '15px', lineHeight: 1.6 }}>Pronto. Você não vai mais receber e-mails de ofertas da Just Runner.</p>
  }

  return (
    <>
      <button
        type="button"
        disabled={pendente}
        onClick={() => startTransition(async () => {
          const r = await confirmarDescadastroAction(email)
          if (r.ok) setFeito(true)
          else setErro(r.erro ?? 'Erro')
        })}
        style={{ borderRadius: '10px', background: '#0a0b0d', color: '#fff', fontWeight: 700, padding: '13px 28px', border: 'none', cursor: 'pointer', fontSize: '14px' }}
      >
        {pendente ? 'Processando…' : 'Confirmar descadastro'}
      </button>
      {erro && <p role="alert" style={{ marginTop: '14px', color: '#dc2626', fontSize: '14px' }}>{erro}</p>}
    </>
  )
}
